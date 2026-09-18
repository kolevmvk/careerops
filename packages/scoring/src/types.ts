/**
 * Domain types for the scoring package (docs/SCORING.md). These mirror
 * `careerops` schema enums and columns but are intentionally narrower —
 * callers (Edge Functions) map database rows onto these shapes.
 */

export type EvidenceType =
  | "production_deployment"
  | "release"
  | "work_experience"
  | "incident_record"
  | "repository"
  | "pull_request"
  | "design_document"
  | "lab"
  | "demo_url"
  | "documentation"
  | "certification"
  | "article"
  | "course_completion";

export type EvidenceStrength = 1 | 2 | 3;

export type Feasibility = "low" | "medium" | "high";

export type RequirementImportance = "required" | "preferred";

export type RequirementMappingStatus = "auto" | "confirmed" | "unmapped" | "ignored";

export type RequirementClassification = "strong" | "unproven" | "partial" | "missing";

export type GapType = "learn" | "prove" | "none";

export type ConstraintResult = "pass" | "warn" | "fail" | "unknown";

export type HardConstraintKind =
  | "language"
  | "location"
  | "work_authorization"
  | "certification"
  | "experience_years"
  | "clearance"
  | "education";

export type LanguageProficiency = "a1" | "a2" | "b1" | "b2" | "c1" | "c2" | "native";

export type CredentialStatus = "planned" | "in_progress" | "earned" | "expired";

export type GapLabel = "high_value" | "low_value";

export interface RecencyConfig {
  graceMonths: number;
  halfLifeMonths: number;
  floor: number;
}

export interface HierarchyConfig {
  parentCredit: number;
  childCredit: number;
  rollupFactor: number;
}

export interface MatchConfig {
  defaultRequiredLevel: number;
  weightRequired: number;
  weightPreferred: number;
}

export interface ClassificationConfig {
  confidenceStrong: number;
  partialRatio: number;
}

export interface MarketConfig {
  windowDays: number;
  minSample: number;
}

export interface FeasibilityWeights {
  low: number;
  medium: number;
  high: number;
}

export interface GapConfig {
  wFrequency: number;
  wGap: number;
  wEvidence: number;
  wFeasibility: number;
  feasibility: FeasibilityWeights;
  hardConstraintBonus: number;
}

/** Mirrors `scoring_configs.weights` (docs/SCORING.md §10), decoded to numbers. */
export interface ScoringConfig {
  evidenceTypeWeight: Record<EvidenceType, number>;
  strength: Record<EvidenceStrength, number>;
  recency: RecencyConfig;
  supportThreshold: number;
  unsupportedFactor: number;
  hierarchy: HierarchyConfig;
  match: MatchConfig;
  classification: ClassificationConfig;
  market: MarketConfig;
  gap: GapConfig;
}

/** One eligible `evidence` × `evidence_skills` link (already filtered for I5: verified + confirmed). */
export interface EvidenceLink {
  evidenceType: EvidenceType;
  strength: EvidenceStrength;
  demonstratedLevel: number;
  /** Months since `evidence.occurred_to`, or 0 if `occurred_to` is null (ongoing). */
  ageMonths: number;
}

export interface EvidenceLinkContribution {
  link: EvidenceLink;
  /** `c_i = w_type × s × r` (docs/SCORING.md §3). */
  contribution: number;
}

export interface EvidenceConfidenceResult {
  confidence: number;
  contributions: EvidenceLinkContribution[];
}

export interface WeightedValue {
  value: number;
  weight: number;
}
