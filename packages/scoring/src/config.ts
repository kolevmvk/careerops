import type { ScoringConfig } from "./types.ts";

/** `scoring_configs.weights` defaults for `SCORING_VERSION` (docs/SCORING.md §10). */
export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  evidenceTypeWeight: {
    production_deployment: 1.0,
    release: 0.9,
    work_experience: 0.9,
    incident_record: 0.85,
    repository: 0.75,
    pull_request: 0.75,
    design_document: 0.7,
    lab: 0.5,
    demo_url: 0.5,
    documentation: 0.5,
    certification: 0.4,
    article: 0.4,
    course_completion: 0.15,
  },
  strength: { 1: 0.4, 2: 0.7, 3: 1.0 },
  recency: { graceMonths: 24, halfLifeMonths: 60, floor: 0.35 },
  supportThreshold: 0.5,
  unsupportedFactor: 0.5,
  hierarchy: { parentCredit: 0.5, childCredit: 0.75, rollupFactor: 0.5 },
  match: { defaultRequiredLevel: 3, weightRequired: 1.0, weightPreferred: 0.4 },
  classification: { confidenceStrong: 0.6, partialRatio: 0.6 },
  market: { windowDays: 180, minSample: 10 },
  gap: {
    wFrequency: 0.45,
    wGap: 0.3,
    wEvidence: 0.15,
    wFeasibility: 0.1,
    feasibility: { low: 0.2, medium: 0.6, high: 1.0 },
    hardConstraintBonus: 15,
  },
};
