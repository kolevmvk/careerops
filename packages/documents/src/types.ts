/** Ordered visibility. A higher level implies the lower ones (DOMAIN §5.1). */
export type Visibility = "private" | "cv_safe" | "portfolio_public";

/** A third party's position on a fact, which caps how far it may travel (DOMAIN §5.2). */
export type DisclosureStatus = "not_required" | "approval_required" | "approved" | "restricted";

export type DocumentKind =
  | "cv"
  | "cover_letter"
  | "linkedin_profile"
  | "case_study"
  | "pitch"
  | "one_pager"
  | "integration_brief"
  | "article";

export type FactKind = "employment" | "employment_highlight" | "project";

/**
 * A verified fact, with everything it asserts flattened into `text`.
 *
 * `text` is what the validator checks generated claims against, so it must
 * carry every name, number and date the fact actually supports. A fact that
 * omits its own detail will cause correct sentences to be rejected.
 */
export interface SourceFact {
  id: string;
  kind: FactKind;
  text: string;
  visibility: Visibility;
  disclosureStatus: DisclosureStatus;
  /** Highlights carry this; an unverified one is not a fact yet (DOMAIN I5). */
  verified: boolean;
  /** Effective visibility of the parent, when the fact has one. */
  parentVisibility?: Visibility;
  parentDisclosureStatus?: DisclosureStatus;
}

/** One block of generated prose and the facts it claims to rest on. */
export interface GeneratedSection {
  section: string;
  text: string;
  sourceIds: string[];
}

export type ViolationKind =
  | "unsourced_section"
  | "unknown_source"
  | "ineligible_source"
  | "unverified_source"
  | "unsupported_number"
  | "unsupported_date"
  | "unsupported_name";

export interface Violation {
  section: string;
  kind: ViolationKind;
  /** The offending token, or the source id for source-level problems. */
  token: string;
  message: string;
}
