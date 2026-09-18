import type { MarketConfig } from "./types.ts";

export interface ReadinessSkillInput {
  /** `f(k, T)` for this skill within the target role. */
  frequency: number;
  effectiveLevel: number;
  /** `R*(k, T)`. */
  targetLevel: number;
}

export interface ReadinessResult {
  score: number;
  sampleSize: number;
  sufficientData: boolean;
}

/**
 * `readiness(T) = 100 × Σ f(k,T) × min(E_k/R*(k,T), 1) / Σ f(k,T)`
 * (docs/SCORING.md §8) — the job-match formula applied to the role's
 * aggregated demand profile instead of a single ad.
 */
export function readiness(
  skills: ReadinessSkillInput[],
  sampleSize: number,
  config: MarketConfig,
): ReadinessResult {
  const weightSum = skills.reduce((sum, s) => sum + s.frequency, 0);
  const score =
    weightSum > 0
      ? 100 *
        (skills.reduce((sum, s) => {
          const coverage = s.targetLevel > 0 ? Math.min(s.effectiveLevel / s.targetLevel, 1) : 1;
          return sum + s.frequency * coverage;
        }, 0) /
          weightSum)
      : 0;

  return { score, sampleSize, sufficientData: sampleSize >= config.minSample };
}
