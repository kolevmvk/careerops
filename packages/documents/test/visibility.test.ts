import { describe, expect, it } from "vitest";

import type { SourceFact } from "../src/types.ts";
import {
  atLeast,
  disclosureCeiling,
  documentKindVisibilityMinimum,
  effectiveVisibility,
  eligibleFacts,
  lowestVisibility,
} from "../src/visibility.ts";

function fact(overrides: Partial<SourceFact> & Pick<SourceFact, "id">): SourceFact {
  return {
    kind: "employment_highlight",
    text: "A fact.",
    visibility: "cv_safe",
    disclosureStatus: "not_required",
    verified: true,
    ...overrides,
  };
}

describe("ordering", () => {
  it("treats a higher level as implying the lower ones", () => {
    expect(atLeast("portfolio_public", "cv_safe")).toBe(true);
    expect(atLeast("cv_safe", "cv_safe")).toBe(true);
    expect(atLeast("private", "cv_safe")).toBe(false);
  });

  it("picks the most restrictive of several levels", () => {
    expect(lowestVisibility("portfolio_public", "cv_safe")).toBe("cv_safe");
    expect(lowestVisibility("portfolio_public", "private", "cv_safe")).toBe("private");
    expect(lowestVisibility("portfolio_public")).toBe("portfolio_public");
  });
});

describe("disclosure ceiling", () => {
  it("matches the Postgres function it mirrors", () => {
    expect(disclosureCeiling("not_required")).toBe("portfolio_public");
    expect(disclosureCeiling("approved")).toBe("portfolio_public");
    expect(disclosureCeiling("approval_required")).toBe("cv_safe");
    expect(disclosureCeiling("restricted")).toBe("cv_safe");
  });
});

describe("effective visibility", () => {
  it("caps a fact at its own ceiling", () => {
    expect(
      effectiveVisibility(
        fact({ id: "a", visibility: "portfolio_public", disclosureStatus: "approval_required" }),
      ),
    ).toBe("cv_safe");
  });

  it("caps a fact at its parent", () => {
    expect(
      effectiveVisibility(fact({ id: "b", visibility: "cv_safe", parentVisibility: "private" })),
    ).toBe("private");
  });

  it("caps a fact at the parent's ceiling", () => {
    expect(
      effectiveVisibility(
        fact({
          id: "c",
          visibility: "portfolio_public",
          disclosureStatus: "approved",
          parentVisibility: "portfolio_public",
          parentDisclosureStatus: "restricted",
        }),
      ),
    ).toBe("cv_safe");
  });

  it("leaves an unconstrained fact alone", () => {
    expect(
      effectiveVisibility(
        fact({ id: "d", visibility: "portfolio_public", disclosureStatus: "not_required" }),
      ),
    ).toBe("portfolio_public");
  });
});

describe("document kind minimums", () => {
  it("puts LinkedIn at cv_safe, not portfolio_public", () => {
    expect(documentKindVisibilityMinimum("linkedin_profile")).toBe("cv_safe");
  });

  it("requires portfolio_public for published narrative", () => {
    expect(documentKindVisibilityMinimum("case_study")).toBe("portfolio_public");
    expect(documentKindVisibilityMinimum("article")).toBe("portfolio_public");
  });
});

describe("eligibleFacts", () => {
  const facts = [
    fact({ id: "cv", visibility: "cv_safe" }),
    fact({ id: "public", visibility: "portfolio_public" }),
    fact({ id: "private", visibility: "private" }),
    fact({ id: "unverified", visibility: "portfolio_public", verified: false }),
    fact({ id: "employer", visibility: "portfolio_public", disclosureStatus: "approval_required" }),
  ];

  it("gives a CV everything cleared to cv_safe and verified", () => {
    expect(eligibleFacts(facts, "cv").map((f) => f.id)).toEqual(["cv", "public", "employer"]);
  });

  it("gives a case study only what is cleared to publish", () => {
    expect(eligibleFacts(facts, "case_study").map((f) => f.id)).toEqual(["public"]);
  });

  it("never returns an unverified fact", () => {
    expect(eligibleFacts(facts, "cv").some((f) => f.id === "unverified")).toBe(false);
  });
});
