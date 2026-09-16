import { describe, expect, it } from "vitest";

import { assemble, renderMarkdown } from "../src/assemble.ts";
import type { SourceFact } from "../src/types.ts";
import { validateSections } from "../src/validator.ts";

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
  text: "Shipped two production applications to the Android and iOS app stores in 2024.",
});

const offline = fact({
  id: "f2",
  text: "Designed an offline capture queue with idempotent replay.",
});

describe("assembly", () => {
  it("groups facts into sections and cites each one", () => {
    const { sections } = assemble({ kind: "cv", facts: [shipped, offline] });

    expect(sections).toHaveLength(1);
    expect(sections[0]?.section).toBe("experience");
    expect(sections[0]?.sourceIds).toEqual(["f1", "f2"]);
  });

  it("separates projects from experience", () => {
    const project = fact({ id: "p1", kind: "project", text: "Built a shared terminal client." });
    const { sections } = assemble({ kind: "cv", facts: [shipped, project] });

    expect(sections.map((s) => s.section)).toEqual(["experience", "projects"]);
  });

  it("reports what it excluded and why, rather than dropping it silently", () => {
    const unverified = fact({ id: "u1", text: "Led a team of four.", verified: false });
    const tooPrivate = fact({ id: "p2", text: "Internal note.", visibility: "private" });

    const { excluded } = assemble({ kind: "cv", facts: [shipped, unverified, tooPrivate] });

    expect(excluded).toEqual([
      { id: "u1", reason: "unverified" },
      { id: "p2", reason: "visibility" },
    ]);
  });

  it("gives a case study only facts cleared to publish", () => {
    const publishable = fact({
      id: "pub",
      text: "Wrote up the sync design.",
      visibility: "portfolio_public",
    });

    const { sections, excluded } = assemble({
      kind: "case_study",
      facts: [shipped, publishable],
    });

    expect(sections[0]?.sourceIds).toEqual(["pub"]);
    expect(excluded).toEqual([{ id: "f1", reason: "visibility" }]);
  });

  it("produces no sections when nothing is eligible", () => {
    const { sections } = assemble({
      kind: "cv",
      facts: [fact({ id: "x", text: "Private.", visibility: "private" })],
    });

    expect(sections).toEqual([]);
  });
});

describe("assembly and the validator agree", () => {
  // The property that matters: the assembler cannot produce a document its own
  // validator rejects. If it could, the guardrail would be catching the
  // generator rather than the writer.
  it("output always passes validation", () => {
    const facts = [
      shipped,
      offline,
      fact({ id: "p1", kind: "project", text: "Built a shared terminal client for kiosks." }),
      fact({ id: "u1", text: "Unverified claim about SAP.", verified: false }),
      fact({ id: "p2", text: "Private note about Globex.", visibility: "private" }),
    ];

    const { sections } = assemble({ kind: "cv", facts });

    expect(validateSections({ sections, facts, kind: "cv" })).toEqual([]);
  });

  it("excluded facts never leak into the text", () => {
    const facts = [
      shipped,
      fact({ id: "secret", text: "Confidential revenue was 4200000 EUR.", visibility: "private" }),
    ];

    const { sections } = assemble({ kind: "cv", facts });
    const text = sections.map((s) => s.text).join(" ");

    expect(text).not.toContain("4200000");
    expect(text).not.toContain("Confidential");
  });
});

describe("renderMarkdown", () => {
  it("renders a heading per section and a bullet per fact", () => {
    const document = assemble({ kind: "cv", facts: [shipped, offline] });
    const markdown = renderMarkdown(document, "CV — Mobile roles");

    expect(markdown).toContain("# CV — Mobile roles");
    expect(markdown).toContain("## Experience");
    expect(markdown).toContain("- Shipped two production applications");
    expect(
      markdown
        .trimEnd()
        .split("\n")
        .filter((l) => l.startsWith("- ")),
    ).toHaveLength(2);
  });

  it("renders an empty document without crashing", () => {
    const markdown = renderMarkdown({ sections: [], excluded: [] }, "Empty");
    expect(markdown.trim()).toBe("# Empty");
  });
});
