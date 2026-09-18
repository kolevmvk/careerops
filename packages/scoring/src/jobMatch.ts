import type {
  ClassificationConfig,
  ConstraintResult,
  CredentialStatus,
  LanguageProficiency,
  RequirementClassification,
  RequirementImportance,
  RequirementMappingStatus,
  ScoringConfig,
} from "./types.ts";

/** `strong` / `unproven` / `partial` / `missing` (docs/SCORING.md §5.2). */
export function classifyRequirement(
  effectiveLevel: number,
  requiredLevel: number,
  evidenceConfidence: number,
  config: ClassificationConfig,
): RequirementClassification {
  if (effectiveLevel >= requiredLevel) {
    return evidenceConfidence >= config.confidenceStrong ? "strong" : "unproven";
  }
  // requiredLevel > effectiveLevel >= 0 here, so requiredLevel > 0: safe to divide.
  const ratio = effectiveLevel / requiredLevel;
  return ratio >= config.partialRatio ? "partial" : "missing";
}

export interface SkillRequirementInput {
  requirementId: string;
  mappingStatus: RequirementMappingStatus;
  /** `job_requirements.required_level`, or `null` if unspecified. */
  requiredLevel: number | null;
  importance: RequirementImportance;
  /** `E_j`: the candidate's effective level for the mapped skill. */
  effectiveLevel: number;
  /** The mapped skill's evidence confidence, for classification. */
  evidenceConfidence: number;
}

export interface RequirementScore {
  requirementId: string;
  weight: number;
  /** `cov_j = min(E_j / R_j, 1)`. */
  coverage: number;
  weightedCoverage: number;
  classification: RequirementClassification;
}

export interface JobMatchResult {
  /** 0–100, over scored (`auto`/`confirmed`) requirements only. */
  score: number;
  /** Share of non-ignored requirements that were actually scored. */
  extractionCoverage: number;
  requirementScores: RequirementScore[];
  unscoredRequirementIds: string[];
}

/**
 * Job match over `kind = 'skill'` requirements (docs/SCORING.md §5.1–5.2).
 * Hard constraints are evaluated separately by {@link constraintGate} — they
 * never enter this percentage.
 */
export function jobMatch(
  requirements: SkillRequirementInput[],
  config: ScoringConfig,
): JobMatchResult {
  const scorable = requirements.filter((r) => r.mappingStatus !== "ignored");
  const eligible = scorable.filter(
    (r) => r.mappingStatus === "auto" || r.mappingStatus === "confirmed",
  );

  const requirementScores: RequirementScore[] = eligible.map((r) => {
    const requiredLevel = r.requiredLevel ?? config.match.defaultRequiredLevel;
    const weight =
      r.importance === "required" ? config.match.weightRequired : config.match.weightPreferred;
    const coverage = Math.min(r.effectiveLevel / requiredLevel, 1);
    return {
      requirementId: r.requirementId,
      weight,
      coverage,
      weightedCoverage: weight * coverage,
      classification: classifyRequirement(
        r.effectiveLevel,
        requiredLevel,
        r.evidenceConfidence,
        config.classification,
      ),
    };
  });

  const weightSum = requirementScores.reduce((sum, r) => sum + r.weight, 0);
  const weightedSum = requirementScores.reduce((sum, r) => sum + r.weightedCoverage, 0);

  return {
    score: weightSum > 0 ? 100 * (weightedSum / weightSum) : 0,
    extractionCoverage: scorable.length > 0 ? eligible.length / scorable.length : 1,
    requirementScores,
    unscoredRequirementIds: requirements
      .filter((r) => r.mappingStatus === "unmapped")
      .map((r) => r.requirementId),
  };
}

const CEFR_ORDER: Record<LanguageProficiency, number> = {
  a1: 1,
  a2: 2,
  b1: 3,
  b2: 4,
  c1: 5,
  c2: 6,
  native: 7,
};

/** `language` hard constraint against `languages.proficiency` (docs/SCORING.md §5.3). */
export function evaluateLanguageConstraint(
  requiredLevel: LanguageProficiency,
  actualLevel: LanguageProficiency | null,
): ConstraintResult {
  if (actualLevel === null) {
    return "unknown";
  }
  return CEFR_ORDER[actualLevel] >= CEFR_ORDER[requiredLevel] ? "pass" : "fail";
}

/** `certification` hard constraint against `credentials.status = earned` (docs/SCORING.md §5.3). */
export function evaluateCertificationConstraint(status: CredentialStatus | null): ConstraintResult {
  if (status === null) {
    return "unknown";
  }
  if (status === "earned") {
    return "pass";
  }
  if (status === "expired") {
    return "fail";
  }
  return "warn"; // planned | in_progress: on track, not yet met
}

/**
 * Worst-of aggregation across every hard constraint on a job (docs/SCORING.md
 * §5.3): any `fail` gives `fail`. `location`, `work_authorization`,
 * `experience_years`, `clearance` and `education` are manual confirmation in
 * v0.1 — the caller supplies their `ConstraintResult` directly.
 */
export function constraintGate(results: ConstraintResult[]): ConstraintResult {
  const rank: Record<ConstraintResult, number> = { fail: 3, warn: 2, unknown: 1, pass: 0 };
  return results.reduce<ConstraintResult>(
    (worst, result) => (rank[result] > rank[worst] ? result : worst),
    "pass",
  );
}
