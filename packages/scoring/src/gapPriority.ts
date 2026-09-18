import type { Feasibility, GapConfig, GapLabel, GapType, WeightedValue } from "./types.ts";

/**
 * Weighted median (docs/SCORING.md §7.1's "weighted median of required_level").
 * Weight by requirement importance (see `match.weightRequired`/`weightPreferred`)
 * so a `required` ad counts more than a `preferred` one.
 */
export function weightedMedian(values: WeightedValue[]): number {
  if (values.length === 0) {
    throw new Error("weightedMedian requires at least one value");
  }
  const sorted = [...values].sort((a, b) => a.value - b.value);
  const totalWeight = sorted.reduce((sum, v) => sum + v.weight, 0);
  const half = totalWeight / 2;

  let cumulative = 0;
  let median = sorted[0]?.value ?? 0;
  for (const v of sorted) {
    cumulative += v.weight;
    median = v.value;
    if (cumulative >= half) {
      break;
    }
  }
  return median;
}

export interface TargetLevelInput {
  /** `user_skills.target_level`, if the user set one explicitly. */
  explicitTargetLevel: number | null;
  /** `required_level` of this skill across `J_T`, weighted by importance. */
  corpusRequiredLevels: WeightedValue[];
  /** Default when unspecified and the corpus is empty (docs/SCORING.md §7.1: `3`). */
  defaultLevel: number;
}

/** `R*(k, T)` (docs/SCORING.md §7.1). */
export function targetLevel(input: TargetLevelInput): number {
  if (input.explicitTargetLevel !== null) {
    return input.explicitTargetLevel;
  }
  if (input.corpusRequiredLevels.length === 0) {
    return input.defaultLevel;
  }
  return weightedMedian(input.corpusRequiredLevels);
}

/** `learn` / `prove` / `none` (docs/SCORING.md §7.2). */
export function gapType(
  effectiveLevel: number,
  targetLevelValue: number,
  evidenceConfidence: number,
  confidenceStrong: number,
): GapType {
  if (effectiveLevel < targetLevelValue) {
    return "learn";
  }
  if (evidenceConfidence < confidenceStrong) {
    return "prove";
  }
  return "none";
}

export interface GapPriorityInput {
  targetLevel: number;
  effectiveLevel: number;
  evidenceConfidence: number;
  /** `F(k)`, market frequency across target roles. */
  marketFrequency: number;
  feasibility: Feasibility;
  gapType: GapType;
  /** Whether this skill is a hard constraint that fails on a benchmark job (`relevance = 2`). */
  failsHardConstraintOnBenchmarkJob: boolean;
}

/** Additive priority score, capped at 100 (docs/SCORING.md §7.3). `0` when `gapType = 'none'`. */
export function gapPriority(input: GapPriorityInput, config: GapConfig): number {
  if (input.gapType === "none") {
    return 0;
  }
  const gapNorm = Math.max(0, input.targetLevel - input.effectiveLevel) / 5;
  const evidenceDeficit = 1 - input.evidenceConfidence;
  const feasibilityValue = config.feasibility[input.feasibility];

  const base =
    100 *
    (config.wFrequency * input.marketFrequency +
      config.wGap * gapNorm +
      config.wEvidence * evidenceDeficit +
      config.wFeasibility * feasibilityValue);
  const bonus = input.failsHardConstraintOnBenchmarkJob ? config.hardConstraintBonus : 0;

  return Math.min(100, base + bonus);
}

// Fixed thresholds from docs/SCORING.md §7.3's label table — not part of
// scoring_configs, since they describe a UI label rather than a formula input.
const HIGH_VALUE_FREQUENCY_THRESHOLD = 0.4;
const LOW_VALUE_FREQUENCY_THRESHOLD = 0.15;

/** `high_value` / `low_value` / `null` label (docs/SCORING.md §7.3). */
export function gapLabel(
  marketFrequency: number,
  gapTypeValue: GapType,
  involvesHardConstraint: boolean,
): GapLabel | null {
  if (marketFrequency >= HIGH_VALUE_FREQUENCY_THRESHOLD && gapTypeValue !== "none") {
    return "high_value";
  }
  if (marketFrequency < LOW_VALUE_FREQUENCY_THRESHOLD && !involvesHardConstraint) {
    return "low_value";
  }
  return null;
}
