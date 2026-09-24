// supabase/functions/import-job/index.ts
//
// On-demand job import (paste or URL) — the I/O layer ADR-0016 assigned to
// Edge Functions: for url_fetch, a single server-side fetch + readability
// extraction (packages/extraction), asking for a paste instead on failure
// per docs/SPECIFICATION.md §7; either path then dedupes by content hash,
// runs packages/extraction against the caller's alias dictionary, persists
// job_requirements, then runs packages/scoring's job match for every
// requirement it could map to a skill. Business logic stays in the two
// pure packages; this file is only the glue (auth, fetch, DB reads/writes).
//
// Runs with the caller's own JWT (the incoming Authorization header is
// forwarded to the Supabase client below), never service_role — RLS is the
// only access control, per #32's acceptance criteria.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  buildAliasIndex,
  contentHash,
  extractReadableText,
  extractRequirements,
  type AliasEntry,
} from "../../../packages/extraction/src/index.ts";
import {
  DEFAULT_SCORING_CONFIG,
  effectiveLevel,
  evidenceConfidence,
  jobMatch,
  supportedLevel,
  type EvidenceLink,
  type SkillRequirementInput,
} from "../../../packages/scoring/src/index.ts";

interface ImportJobRequest {
  company: string;
  title: string;
  location?: string;
  remotePolicy?: "remote" | "hybrid" | "onsite" | "unknown";
  sourceKind: "paste" | "url_fetch";
  sourceUrl?: string;
  /** Required for `sourceKind: "paste"`; ignored for `"url_fetch"` (fetched server-side instead). */
  rawText?: string;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const FETCH_TIMEOUT_MS = 15000;
const USER_AGENT = "CareerOps/1.0 (+https://github.com/kolevmvk/careerops; private job-ad import)";
const PRIVATE_HOSTNAME_PATTERNS = [
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^169\.254\./, // includes cloud metadata endpoints (169.254.169.254)
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^0\.0\.0\.0$/,
  /^::1$/,
];

/**
 * Rejects obviously-internal targets before this server-side fetch touches
 * them (classic SSRF vector: an authenticated user supplies an arbitrary
 * URL). Hostname-string based, not DNS-rebinding-proof — proportionate for
 * a personal single-user tool, not a defense against a determined attacker
 * with their own DNS.
 */
function isFetchableUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
  const hostname = parsed.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".localhost")) return false;
  return !PRIVATE_HOSTNAME_PATTERNS.some((pattern) => pattern.test(hostname));
}

/**
 * Single server-side fetch + readability extraction (docs/SPECIFICATION.md
 * §7). No crawling, no retries against a block or non-200 response -- a
 * dynamic page, a login wall and a block all fail the same way here, and
 * the caller asks the user to paste instead rather than guessing.
 */
async function fetchReadableJobAd(url: string): Promise<string | null> {
  if (!isFetchableUrl(url)) return null;
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch {
    return null;
  }
  if (!response.ok) return null;
  const html = await response.text();
  return extractReadableText(html)?.text ?? null;
}

/** One active `scoring_configs` row per user (docs/SCORING.md §1). Bootstraps the package defaults if none exists yet. */
async function getActiveScoringConfigId(supabase: SupabaseClient): Promise<string> {
  const { data: existing, error: fetchError } = await supabase
    .from("scoring_configs")
    .select("id")
    .eq("is_active", true)
    .maybeSingle();
  if (fetchError) throw fetchError;
  if (existing) return existing.id as string;

  const { data: created, error: insertError } = await supabase
    .from("scoring_configs")
    .insert({
      version: "1.0.0",
      weights: DEFAULT_SCORING_CONFIG,
      thresholds: {},
      is_active: true,
    })
    .select("id")
    .single();
  if (insertError) throw insertError;
  return created.id as string;
}

async function loadAliasDictionary(supabase: SupabaseClient) {
  const { data, error } = await supabase.from("skill_aliases").select("skill_id, normalized");
  if (error) throw error;
  const entries: AliasEntry[] = (data ?? []).map(
    (row: { skill_id: string; normalized: string }) => ({
      skillId: row.skill_id,
      normalized: row.normalized,
    }),
  );
  return buildAliasIndex(entries);
}

/** Months since an ISO date, or 0 for ongoing (`occurred_to IS NULL`) per docs/SCORING.md §2.3. */
function monthsSince(dateString: string | null): number {
  if (dateString === null) return 0;
  const then = new Date(dateString).getTime();
  const elapsedMs = Math.max(0, Date.now() - then);
  return elapsedMs / (1000 * 60 * 60 * 24 * 30.44);
}

interface EvidenceSkillRow {
  strength: 1 | 2 | 3;
  demonstrated_level: number | null;
  confirmed_at: string | null;
  evidence: {
    type: EvidenceLink["evidenceType"];
    occurred_to: string | null;
    verified_at: string | null;
  } | null;
}

/**
 * Effective level + evidence confidence for one mapped skill requirement
 * (docs/SCORING.md §3–4). Eligibility (I5) is enforced in the query itself:
 * `confirmed_at`/`verified_at` both required.
 */
async function scoreSkillRequirement(
  supabase: SupabaseClient,
  skillId: string,
): Promise<{ effectiveLevel: number; confidence: number }> {
  const { data: userSkill } = await supabase
    .from("user_skills")
    .select("id")
    .eq("skill_id", skillId)
    .maybeSingle();

  if (!userSkill) {
    return { effectiveLevel: 0, confidence: 0 };
  }

  const { data: evidenceRows } = await supabase
    .from("evidence_skills")
    .select(
      "strength, demonstrated_level, confirmed_at, evidence:evidence_id(type, occurred_to, verified_at)",
    )
    .eq("skill_id", skillId)
    .not("confirmed_at", "is", null)
    .returns<EvidenceSkillRow[]>();

  const links: EvidenceLink[] = [];
  for (const row of evidenceRows ?? []) {
    const evidence = row.evidence;
    if (!evidence || evidence.verified_at == null) continue;
    links.push({
      evidenceType: evidence.type,
      strength: row.strength,
      demonstratedLevel: row.demonstrated_level ?? 0,
      ageMonths: monthsSince(evidence.occurred_to),
    });
  }

  const { confidence, contributions } = evidenceConfidence(links, DEFAULT_SCORING_CONFIG);
  const supported = supportedLevel(
    contributions.map((c) => ({
      demonstratedLevel: c.link.demonstratedLevel,
      confidence: c.contribution,
    })),
    DEFAULT_SCORING_CONFIG.supportThreshold,
  );

  const { data: latestAssessment } = await supabase
    .from("skill_assessments")
    .select("assessed_level")
    .eq("user_skill_id", userSkill.id)
    .order("assessed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const level = effectiveLevel({
    assessedLevel: latestAssessment?.assessed_level ?? null,
    supportedLevel: supported,
    unsupportedFactor: DEFAULT_SCORING_CONFIG.unsupportedFactor,
  });

  return { effectiveLevel: level, confidence };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "POST only" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) {
    return jsonResponse(
      { error: "Server misconfigured: missing SUPABASE_URL/SUPABASE_ANON_KEY" },
      500,
    );
  }
  const authHeader = req.headers.get("Authorization") ?? "";
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  let body: ImportJobRequest;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  if (!body.company || !body.title) {
    return jsonResponse({ error: "company and title are required" }, 400);
  }

  let rawText: string;
  if (body.sourceKind === "url_fetch") {
    if (!body.sourceUrl) {
      return jsonResponse({ error: "sourceUrl is required for sourceKind: 'url_fetch'" }, 400);
    }
    const fetched = await fetchReadableJobAd(body.sourceUrl);
    if (!fetched) {
      // docs/SPECIFICATION.md §7: on failure, ask for a paste -- don't
      // guess with a near-empty or missing extraction.
      return jsonResponse(
        {
          error:
            "Could not extract a readable job ad from that page. Paste the ad text instead (sourceKind: 'paste').",
          needsPaste: true,
        },
        422,
      );
    }
    rawText = fetched;
  } else if (body.sourceKind === "paste") {
    if (!body.rawText) {
      return jsonResponse({ error: "rawText is required for sourceKind: 'paste'" }, 400);
    }
    rawText = body.rawText;
  } else {
    return jsonResponse({ error: "sourceKind must be 'paste' or 'url_fetch'" }, 400);
  }

  const hash = await contentHash(rawText);

  const { data: existingJob } = await supabase
    .from("jobs")
    .select("id")
    .eq("content_hash", hash)
    .maybeSingle();

  let jobId: string;
  if (existingJob) {
    jobId = existingJob.id as string;
  } else {
    const { data: insertedJob, error: insertJobError } = await supabase
      .from("jobs")
      .insert({
        company: body.company,
        title: body.title,
        location: body.location ?? null,
        remote_policy: body.remotePolicy ?? "unknown",
        source_kind: body.sourceKind,
        source_url: body.sourceUrl ?? null,
        raw_text: rawText,
        content_hash: hash,
        status: "new",
      })
      .select("id")
      .single();
    if (insertJobError) throw insertJobError;
    jobId = insertedJob.id as string;
  }

  const { count: existingRequirementCount } = await supabase
    .from("job_requirements")
    .select("id", { count: "exact", head: true })
    .eq("job_id", jobId);

  if (existingRequirementCount && existingRequirementCount > 0) {
    return jsonResponse({ jobId, status: "already_extracted" });
  }

  const dictionary = await loadAliasDictionary(supabase);
  const extraction = extractRequirements(rawText, dictionary);

  const requirementRows = [
    ...extraction.skillRequirements.map((r) => ({
      job_id: jobId,
      kind: "skill" as const,
      skill_id: r.skillId,
      raw_text: r.rawText,
      importance: r.importance,
      required_level: r.requiredLevel,
      years: null,
      is_hard_constraint: false,
      mapping_status: r.mappingStatus,
      extracted_by: "dictionary" as const,
    })),
    ...extraction.unmappedCandidates.map((c) => ({
      job_id: jobId,
      kind: "skill" as const,
      skill_id: null,
      raw_text: c.rawText,
      importance: c.importance,
      required_level: null,
      years: null,
      is_hard_constraint: false,
      mapping_status: "unmapped" as const,
      extracted_by: "dictionary" as const,
    })),
    ...extraction.hardConstraints.map((c) => ({
      job_id: jobId,
      kind: c.kind,
      skill_id: null,
      raw_text: c.rawText,
      importance: "required" as const,
      required_level: null,
      years: c.years ?? null,
      is_hard_constraint: true,
      mapping_status: c.mappingStatus,
      extracted_by: "dictionary" as const,
    })),
  ];

  const { data: insertedRequirements, error: insertReqError } = await supabase
    .from("job_requirements")
    .insert(requirementRows)
    .select("id, skill_id, mapping_status, importance, required_level");
  if (insertReqError) throw insertReqError;

  // Job match: only requirements the dictionary actually mapped to a skill
  // (docs/SCORING.md §5.1 — unmapped requirements are "unscored", not zero).
  const scorable = (insertedRequirements ?? []).filter(
    (r) => r.skill_id !== null && (r.mapping_status === "auto" || r.mapping_status === "confirmed"),
  );

  const matchInputs: SkillRequirementInput[] = [];
  for (const requirement of scorable) {
    const { effectiveLevel: level, confidence } = await scoreSkillRequirement(
      supabase,
      requirement.skill_id as string,
    );
    matchInputs.push({
      requirementId: requirement.id,
      mappingStatus: requirement.mapping_status,
      requiredLevel: requirement.required_level,
      importance: requirement.importance,
      effectiveLevel: level,
      evidenceConfidence: confidence,
    });
  }

  const matchResult = jobMatch(matchInputs, DEFAULT_SCORING_CONFIG);
  const scoringConfigId = await getActiveScoringConfigId(supabase);

  const { data: jobMatchRow, error: insertMatchError } = await supabase
    .from("job_matches")
    .insert({
      job_id: jobId,
      scoring_version: "1.0.0",
      scoring_config_id: scoringConfigId,
      breakdown: matchResult,
      score: matchResult.score,
      // Hard-constraint evaluation against the profile (languages,
      // work_authorization, credentials — docs/SCORING.md §5.3) is a
      // follow-up, not this issue's scope; 'unknown' is the honest default.
      constraint_gate: "unknown",
    })
    .select("id, score, constraint_gate")
    .single();
  if (insertMatchError) throw insertMatchError;

  return jsonResponse({
    jobId,
    requirementsExtracted: requirementRows.length,
    extractionCoverage: matchResult.extractionCoverage,
    jobMatch: jobMatchRow,
  });
});
