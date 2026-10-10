/**
 * Domain types for the extraction package (docs/SPECIFICATION.md §4.1, §7;
 * docs/DOMAIN.md D6). These mirror `careerops` schema enums and columns —
 * callers (Edge Functions) map these onto `job_requirements` rows.
 */

export type RequirementImportance = "required" | "preferred";

/** `job_requirements.mapping_status`, restricted to what this package can produce. */
export type ExtractionMappingStatus = "auto" | "confirmed" | "unmapped";

export type HardConstraintKind =
  | "language"
  | "location"
  | "work_authorization"
  | "certification"
  | "experience_years"
  | "clearance"
  | "education";

export type LanguageProficiency = "a1" | "a2" | "b1" | "b2" | "c1" | "c2" | "native";

export type SkillKind = "technology" | "platform" | "language" | "practice" | "domain";

/** One `skill_aliases` row, keyed by its already-normalized form. */
export interface AliasEntry {
  skillId: string;
  /** `skill_aliases.normalized`: lowercase, punctuation stripped (mostly), whitespace collapsed. */
  normalized: string;
}

/**
 * One `careerops.skills` row. Its `name` and `slug` are the catalog's own
 * wording, which an ad is at least as likely to use as a hand-written alias,
 * so both are indexed alongside the aliases (see {@link buildSkillDictionary}).
 * Neither column is normalized in the database, unlike `skill_aliases.normalized`.
 */
export interface SkillEntry {
  skillId: string;
  /** `skills.name`, e.g. "CI/CD", "Identity & Access Management". */
  name: string;
  /** `skills.slug`, e.g. "ci-cd", "identity-access-management". */
  slug: string;
}

/** Lookup index built by {@link buildSkillDictionary}: normalized phrase → skill id. */
export type AliasDictionary = ReadonlyMap<string, string>;

export interface ExtractedSkillRequirement {
  rawText: string;
  importance: RequirementImportance;
  skillId: string;
  requiredLevel: number | null;
  mappingStatus: ExtractionMappingStatus;
}

export interface UnmappedRequirementCandidate {
  rawText: string;
  importance: RequirementImportance;
}

export interface HardConstraintRequirement {
  kind: HardConstraintKind;
  rawText: string;
  isHardConstraint: true;
  mappingStatus: ExtractionMappingStatus;
  /** Set only for `kind = 'language'`. */
  requiredLanguageLevel?: LanguageProficiency;
  /** Set only for `kind = 'experience_years'`. */
  years?: number;
}

export interface RequirementExtractionResult {
  skillRequirements: ExtractedSkillRequirement[];
  unmappedCandidates: UnmappedRequirementCandidate[];
  hardConstraints: HardConstraintRequirement[];
}
