import type { MarketConfig, RequirementImportance } from "./types.ts";

/** `importance(job, k)` weight (docs/SCORING.md §6): required 1.0, preferred 0.5, absent 0. */
export function requirementImportanceWeight(importance: RequirementImportance | "absent"): number {
  if (importance === "required") return 1.0;
  if (importance === "preferred") return 0.5;
  return 0;
}

/**
 * A child skill's requirement also counts toward its parent, at
 * `rollup_factor` (docs/SCORING.md §6) — e.g. "IAM" and "VPC" ads raise the
 * frequency of "AWS". Combine a skill's own per-job importance with its
 * children's rolled-up contribution before calling {@link skillFrequencyForRole}.
 */
export function combineImportanceWithRollup(
  direct: number,
  childImportances: number[],
  rollupFactor: number,
): number {
  return (
    direct +
    childImportances.reduce((sum, childImportance) => sum + childImportance * rollupFactor, 0)
  );
}

export interface MarketFrequencyResult {
  /** `f(k, T)`. */
  frequency: number;
  sampleSize: number;
  /** `false` below `market.minSample` — still shown, flagged provisional. */
  sufficientData: boolean;
}

/**
 * `f(k, T) = Σ importance(job, k) / |J_T|` over the target role's corpus
 * (docs/SCORING.md §6). `jobImportances` must have one entry per job in
 * `J_T` (0 for jobs that don't mention the skill).
 */
export function skillFrequencyForRole(
  jobImportances: number[],
  config: MarketConfig,
): MarketFrequencyResult {
  const sampleSize = jobImportances.length;
  const frequency = sampleSize > 0 ? jobImportances.reduce((sum, v) => sum + v, 0) / sampleSize : 0;
  return { frequency, sampleSize, sufficientData: sampleSize >= config.minSample };
}

export interface WeightedRoleFrequency {
  /** `target_roles.weight`. */
  weight: number;
  frequency: number;
}

/** `F(k) = Σ_T weight_T × f(k, T) / Σ_T weight_T` across target roles (docs/SCORING.md §6). */
export function frequencyAcrossRoles(perRole: WeightedRoleFrequency[]): number {
  const weightSum = perRole.reduce((sum, r) => sum + r.weight, 0);
  if (weightSum === 0) {
    return 0;
  }
  return perRole.reduce((sum, r) => sum + r.weight * r.frequency, 0) / weightSum;
}
