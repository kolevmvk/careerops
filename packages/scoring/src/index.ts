/**
 * Version of the scoring formulas documented in docs/SCORING.md.
 *
 * Bump the minor or major version when a formula changes. Weight-only changes
 * create a new scoring_configs row instead. Every stored snapshot records this value.
 */
export const SCORING_VERSION = "1.0.0";

export * from "./types.ts";
export * from "./config.ts";
export * from "./confidence.ts";
export * from "./effectiveLevel.ts";
export * from "./jobMatch.ts";
export * from "./marketFrequency.ts";
export * from "./gapPriority.ts";
export * from "./readiness.ts";
export * from "./opportunitySignals.ts";
