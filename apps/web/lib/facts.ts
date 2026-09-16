import { joinSentences, type SourceFact } from "@careerops/documents";

import { createClient } from "@/lib/supabase/server.ts";

/**
 * Loads career facts in the shape the document package expects.
 *
 * Effective visibility is recomputed here from the same inputs the database
 * uses, rather than trusted from a column, because the assembler and validator
 * must agree with the triggers. If they ever disagree the database wins: a
 * document source that slips past this filter is still rejected by the I4
 * trigger on insert.
 */
export async function loadFacts(): Promise<SourceFact[]> {
  const supabase = await createClient();

  const [{ data: employments }, { data: highlights }, { data: projects }] = await Promise.all([
    supabase
      .from("employments")
      .select("id, organization, title, summary, visibility, disclosure_status"),
    supabase
      .from("employment_highlights")
      .select("id, employment_id, text, visibility, verified_at"),
    supabase
      .from("projects")
      .select("id, name, problem, solution, result, visibility, disclosure_status"),
  ]);

  const employmentById = new Map((employments ?? []).map((row) => [row.id, row]));
  const facts: SourceFact[] = [];

  for (const employment of employments ?? []) {
    facts.push({
      id: employment.id,
      kind: "employment",
      text: joinSentences(employment.title, employment.organization, employment.summary),
      visibility: employment.visibility,
      disclosureStatus: employment.disclosure_status,
      // An employment row is a record of fact, not a claim awaiting review.
      verified: true,
    });
  }

  for (const highlight of highlights ?? []) {
    const parent = employmentById.get(highlight.employment_id);

    facts.push({
      id: highlight.id,
      kind: "employment_highlight",
      text: highlight.text,
      visibility: highlight.visibility,
      disclosureStatus: "not_required",
      verified: highlight.verified_at !== null,
      ...(parent === undefined
        ? {}
        : {
            parentVisibility: parent.visibility,
            parentDisclosureStatus: parent.disclosure_status,
          }),
    });
  }

  for (const project of projects ?? []) {
    facts.push({
      id: project.id,
      kind: "project",
      text: joinSentences(project.name, project.problem, project.solution, project.result),
      visibility: project.visibility,
      disclosureStatus: project.disclosure_status,
      verified: true,
    });
  }

  return facts;
}
