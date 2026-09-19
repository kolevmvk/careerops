import { guessRequiredLevel } from "./levelHints.ts";
import { normalizePhrase } from "./normalize.ts";
import type {
  ExtractedSkillRequirement,
  SkillKind,
  UnmappedRequirementCandidate,
} from "./types.ts";

export interface NewSkillPlan {
  name: string;
  kind: SkillKind;
  categoryId: string;
}

/** Resolving an unmapped phrase to an existing skill vs. a brand-new catalog entry. */
export type ReviewQueueTarget = { existingSkillId: string } | { newSkill: NewSkillPlan };

export interface AliasToCreate {
  /** `skill_aliases.alias`: the phrase as the reviewer saw it. */
  alias: string;
  /** `skill_aliases.normalized`. */
  normalized: string;
}

export interface ReviewQueueResolutionPlan {
  /** What to insert into `skills` first, or `null` if resolving to an existing skill. */
  skillToCreate: NewSkillPlan | null;
  /** What to insert into `skill_aliases` once the target skill id is known. */
  aliasToCreate: AliasToCreate;
}

/**
 * Resolving one review-queue item (docs/SPECIFICATION.md §4.1's "review
 * queue for unmapped phrases") always creates an alias, so the same phrase
 * auto-maps on the next ad. The caller performs the actual inserts (a skill
 * row if `skillToCreate` is set, then the alias row) and passes the
 * resulting skill id to {@link resolveRequirement}.
 */
export function planReviewQueueResolution(
  candidate: UnmappedRequirementCandidate,
  target: ReviewQueueTarget,
): ReviewQueueResolutionPlan {
  const aliasToCreate: AliasToCreate = {
    alias: candidate.rawText,
    normalized: normalizePhrase(candidate.rawText),
  };
  return {
    skillToCreate: "newSkill" in target ? target.newSkill : null,
    aliasToCreate,
  };
}

/**
 * The `job_requirements` row a resolved review-queue item becomes.
 * `mappingStatus` is `confirmed`, not `auto` — a human just confirmed the
 * mapping, which is exactly what that status means.
 */
export function resolveRequirement(
  candidate: UnmappedRequirementCandidate,
  skillId: string,
): ExtractedSkillRequirement {
  return {
    rawText: candidate.rawText,
    importance: candidate.importance,
    skillId,
    requiredLevel: guessRequiredLevel(candidate.rawText),
    mappingStatus: "confirmed",
  };
}
