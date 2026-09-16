import { describe, expect, it } from "vitest";

import type { SourceFact } from "../src/types.ts";
import { isPublishable, validateSections } from "../src/validator.ts";

function fact(overrides: Partial<SourceFact> & Pick<SourceFact, "id" | "text">): SourceFact {
  return {
    kind: "employment_highlight",
    visibility: "cv_safe",
    disclosureStatus: "not_required",
    verified: true,
    ...overrides,
  };
}

const shipped = fact({
  id: "f1",
  text:
    "Shipped two production applications to the Android and iOS app stores " +
    "between 2024 and 2026, and owned the release process end to end.",
});

const offline = fact({
  id: "f2",
  text:
    "Designed an offline capture queue with idempotent replay so events survive " +
    "process death and reconnect exactly once.",
});

describe("claims that the sources support", () => {
  it("accepts prose that stays inside its sources", () => {
    const violations = validateSections({
      kind: "cv",
      facts: [shipped, offline],
      sections: [
        {
          section: "experience",
          text: "Shipped two production applications to Android and iOS.",
          sourceIds: ["f1"],
        },
      ],
    });

    expect(violations).toEqual([]);
  });

  it("treats a number word and its digits as the same claim", () => {
    const digits = validateSections({
      kind: "cv",
      facts: [shipped],
      sections: [
        { section: "experience", text: "Shipped 2 production applications.", sourceIds: ["f1"] },
      ],
    });

    expect(digits).toEqual([]);
  });

  it("accepts a year the source states", () => {
    const violations = validateSections({
      kind: "cv",
      facts: [shipped],
      sections: [{ section: "experience", text: "Released in 2024.", sourceIds: ["f1"] }],
    });

    expect(violations).toEqual([]);
  });

  it("reads claims across every source a section cites", () => {
    const violations = validateSections({
      kind: "cv",
      facts: [shipped, offline],
      sections: [
        {
          section: "experience",
          text: "Shipped two applications for Android, with idempotent replay.",
          sourceIds: ["f1", "f2"],
        },
      ],
    });

    expect(violations).toEqual([]);
  });
});

describe("claims the sources do not support", () => {
  it("rejects a number nobody asserted", () => {
    const violations = validateSections({
      kind: "cv",
      facts: [shipped],
      sections: [
        {
          section: "experience",
          text: "Shipped two applications used by 40000 people.",
          sourceIds: ["f1"],
        },
      ],
    });

    expect(violations).toHaveLength(1);
    expect(violations[0]?.kind).toBe("unsupported_number");
    expect(violations[0]?.token).toBe("40000");
  });

  it("rejects an inflated count even when the shape is right", () => {
    const violations = validateSections({
      kind: "cv",
      facts: [shipped],
      sections: [
        { section: "experience", text: "Shipped five production applications.", sourceIds: ["f1"] },
      ],
    });

    expect(violations.map((v) => v.token)).toContain("five");
  });

  it("rejects a company name that appears nowhere", () => {
    const violations = validateSections({
      kind: "cv",
      facts: [shipped],
      sections: [
        {
          section: "experience",
          text: "Shipped two applications at Globex.",
          sourceIds: ["f1"],
        },
      ],
    });

    expect(violations).toHaveLength(1);
    expect(violations[0]?.kind).toBe("unsupported_name");
    expect(violations[0]?.token).toBe("globex");
  });

  it("rejects an unsourced technology acronym", () => {
    const violations = validateSections({
      kind: "cv",
      facts: [offline],
      sections: [
        {
          section: "experience",
          text: "Built the queue on top of SIP signalling.",
          sourceIds: ["f2"],
        },
      ],
    });

    expect(violations.map((v) => v.token)).toContain("sip");
  });

  it("rejects a date the source never mentions", () => {
    const violations = validateSections({
      kind: "cv",
      facts: [offline],
      sections: [{ section: "experience", text: "Delivered in 2019.", sourceIds: ["f2"] }],
    });

    expect(violations).toHaveLength(1);
    expect(violations[0]?.kind).toBe("unsupported_date");
  });

  it("catches a proper noun borrowed from an uncited source", () => {
    const violations = validateSections({
      kind: "cv",
      facts: [shipped, offline],
      sections: [
        {
          section: "experience",
          text: "Designed the queue for Android and iOS.",
          sourceIds: ["f2"],
        },
      ],
    });

    expect(violations.map((v) => v.token)).toEqual(expect.arrayContaining(["android", "ios"]));
  });
});

describe("mixed-case product names", () => {
  // Regression: an earlier version only looked at the first letter, so names
  // that start lowercase slipped through entirely.
  it.each(["iOS", "iPhone", "eBay", "jQuery", "PostgreSQL"])(
    "flags %s when no source mentions it",
    (name) => {
      const violations = validateSections({
        kind: "cv",
        facts: [offline],
        sections: [{ section: "experience", text: `Built it on ${name}.`, sourceIds: ["f2"] }],
      });

      expect(violations.map((v) => v.token)).toContain(name.toLowerCase());
    },
  );

  it("accepts a mixed-case name the source states", () => {
    const ios = fact({ id: "f5", text: "Shipped the iOS client to the App Store." });

    const violations = validateSections({
      kind: "cv",
      facts: [ios],
      sections: [{ section: "experience", text: "Shipped the iOS client.", sourceIds: ["f5"] }],
    });

    expect(violations).toEqual([]);
  });
});

describe("documented limits", () => {
  // SPECIFICATION §8 promises numbers, dates and proper names. A fabricated
  // claim made entirely of lowercase words is outside that promise. This test
  // pins the gap so that closing it later is a deliberate change rather than
  // an accident, and so nobody mistakes the validator for a fact checker.
  it("does not catch a fabricated lowercase claim", () => {
    const violations = validateSections({
      kind: "cv",
      facts: [shipped, offline],
      sections: [
        {
          section: "experience",
          text: "Designed an idempotent replay queue.",
          sourceIds: ["f1"],
        },
      ],
    });

    expect(violations).toEqual([]);
  });

  // An all-lowercase product name has nothing to distinguish it from ordinary
  // prose, so it falls in the same gap. Writing it as "npm" would be caught.
  it("does not catch an all-lowercase product name", () => {
    const violations = validateSections({
      kind: "cv",
      facts: [offline],
      sections: [{ section: "experience", text: "Published it on npmjs.", sourceIds: ["f2"] }],
    });

    expect(violations).toEqual([]);
  });
});

describe("grammar is not a claim", () => {
  it("ignores capitalization at the start of a sentence", () => {
    const violations = validateSections({
      kind: "cv",
      facts: [offline],
      sections: [
        {
          section: "experience",
          text: "Events survive process death. Replay stays idempotent.",
          sourceIds: ["f2"],
        },
      ],
    });

    expect(violations).toEqual([]);
  });

  it("ignores capitalization after a bullet marker", () => {
    const violations = validateSections({
      kind: "cv",
      facts: [offline],
      sections: [
        {
          section: "experience",
          text: "- Events survive process death\n- Replay stays idempotent",
          sourceIds: ["f2"],
        },
      ],
    });

    expect(violations).toEqual([]);
  });
});

describe("source eligibility", () => {
  it("rejects a section with no sources at all", () => {
    const violations = validateSections({
      kind: "cv",
      facts: [shipped],
      sections: [{ section: "summary", text: "A reliable engineer.", sourceIds: [] }],
    });

    expect(violations).toHaveLength(1);
    expect(violations[0]?.kind).toBe("unsourced_section");
  });

  it("rejects a source that does not exist", () => {
    const violations = validateSections({
      kind: "cv",
      facts: [shipped],
      sections: [{ section: "experience", text: "Shipped things.", sourceIds: ["ghost"] }],
    });

    expect(violations[0]?.kind).toBe("unknown_source");
  });

  it("rejects an unverified source (DOMAIN I5)", () => {
    const unverified = fact({ id: "f3", text: "Led a team of four.", verified: false });

    const violations = validateSections({
      kind: "cv",
      facts: [unverified],
      sections: [{ section: "experience", text: "Led a team.", sourceIds: ["f3"] }],
    });

    expect(violations[0]?.kind).toBe("unverified_source");
  });

  it("keeps a cv_safe fact out of a case study (DOMAIN I4)", () => {
    const violations = validateSections({
      kind: "case_study",
      facts: [shipped],
      sections: [{ section: "context", text: "Shipped two applications.", sourceIds: ["f1"] }],
    });

    expect(violations[0]?.kind).toBe("ineligible_source");
  });

  it("keeps employer-owned work out of a document until it is approved", () => {
    const employerOwned = fact({
      id: "f4",
      text: "Built the shared terminal client.",
      visibility: "portfolio_public",
      disclosureStatus: "approval_required",
    });

    const violations = validateSections({
      kind: "case_study",
      facts: [employerOwned],
      sections: [{ section: "context", text: "Built the terminal client.", sourceIds: ["f4"] }],
    });

    expect(violations[0]?.kind).toBe("ineligible_source");
  });
});

describe("isPublishable", () => {
  it("is true only when nothing is flagged", () => {
    const good = {
      kind: "cv" as const,
      facts: [shipped],
      sections: [{ section: "experience", text: "Shipped two applications.", sourceIds: ["f1"] }],
    };

    expect(isPublishable(good)).toBe(true);

    expect(
      isPublishable({
        ...good,
        sections: [
          { section: "experience", text: "Shipped nine applications.", sourceIds: ["f1"] },
        ],
      }),
    ).toBe(false);
  });
});
