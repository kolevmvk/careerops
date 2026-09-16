import type { DisclosureStatus, DocumentKind, SourceFact, Visibility } from "./types.ts";

/**
 * Mirrors the Postgres enum declaration order, which is what makes `<` and
 * `least()` meaningful in the migrations. The database is the authority; this
 * exists so the app can filter before writing rather than catching a trigger.
 */
const ORDER: Record<Visibility, number> = {
  private: 0,
  cv_safe: 1,
  portfolio_public: 2,
};

export function compareVisibility(a: Visibility, b: Visibility): number {
  return ORDER[a] - ORDER[b];
}

export function atLeast(actual: Visibility, minimum: Visibility): boolean {
  return ORDER[actual] >= ORDER[minimum];
}

export function lowestVisibility(...levels: Visibility[]): Visibility {
  return levels.reduce((lowest, level) => (ORDER[level] < ORDER[lowest] ? level : lowest));
}

/** DOMAIN §5.2. The maximum visibility a disclosure status permits. */
export function disclosureCeiling(status: DisclosureStatus): Visibility {
  switch (status) {
    case "not_required":
    case "approved":
      return "portfolio_public";
    case "approval_required":
    case "restricted":
      return "cv_safe";
  }
}

/**
 * DOMAIN §5.2. A fact travels no further than its own ceiling, and no further
 * than its parent.
 */
export function effectiveVisibility(fact: SourceFact): Visibility {
  const own = lowestVisibility(fact.visibility, disclosureCeiling(fact.disclosureStatus));

  if (fact.parentVisibility === undefined) {
    return own;
  }

  const parentCeiling =
    fact.parentDisclosureStatus === undefined
      ? fact.parentVisibility
      : lowestVisibility(fact.parentVisibility, disclosureCeiling(fact.parentDisclosureStatus));

  return lowestVisibility(own, parentCeiling);
}

/**
 * DOMAIN I4. LinkedIn sits at cv_safe deliberately: it is professional
 * disclosure at CV abstraction level, not a place for case-study depth.
 */
export function documentKindVisibilityMinimum(kind: DocumentKind): Visibility {
  switch (kind) {
    case "case_study":
    case "article":
      return "portfolio_public";
    default:
      return "cv_safe";
  }
}

/** The facts a document of this kind is allowed to draw on. */
export function eligibleFacts(facts: SourceFact[], kind: DocumentKind): SourceFact[] {
  const minimum = documentKindVisibilityMinimum(kind);
  return facts.filter((fact) => fact.verified && atLeast(effectiveVisibility(fact), minimum));
}
