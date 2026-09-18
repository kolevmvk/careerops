import type { HierarchyConfig } from "./types.ts";

export interface SupportedLevelLink {
  demonstratedLevel: number;
  /** `c_i` for this link, from {@link evidenceConfidence}'s per-link contributions. */
  confidence: number;
}

/**
 * `S`: the highest `demonstrated_level` among eligible links with
 * `c_i ≥ support_threshold` (docs/SCORING.md §4). `0` if none qualify.
 */
export function supportedLevel(links: SupportedLevelLink[], supportThreshold: number): number {
  const supporting = links.filter((link) => link.confidence >= supportThreshold);
  return supporting.reduce((max, link) => Math.max(max, link.demonstratedLevel), 0);
}

export interface EffectiveLevelInput {
  /** `skill_assessments.assessed_level` (latest row), or `null` if there is none. */
  assessedLevel: number | null;
  supportedLevel: number;
  unsupportedFactor: number;
}

/**
 * `E` (docs/SCORING.md §4). The unsupported part of a claim counts at
 * `unsupportedFactor` — asserting more than evidence backs is half-credited,
 * not fully credited or discarded.
 */
export function effectiveLevel(input: EffectiveLevelInput): number {
  const assessed = input.assessedLevel ?? input.supportedLevel;
  const supported = input.supportedLevel;
  if (assessed <= supported) {
    return assessed;
  }
  return supported + (assessed - supported) * input.unsupportedFactor;
}

export type HierarchyRelation =
  | { kind: "tracked_parent"; parentEffectiveLevel: number }
  | { kind: "tracked_children"; maxChildEffectiveLevel: number }
  | { kind: "none" };

/**
 * Effective level for a skill the user has no `user_skills` row for, rolled
 * up from a tracked parent or tracked children (docs/SCORING.md §4.1).
 */
export function hierarchyEffectiveLevel(
  relation: HierarchyRelation,
  config: HierarchyConfig,
): number {
  switch (relation.kind) {
    case "tracked_parent":
      return relation.parentEffectiveLevel * config.parentCredit;
    case "tracked_children":
      return relation.maxChildEffectiveLevel * config.childCredit;
    case "none":
      return 0;
  }
}
