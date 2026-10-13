import { describe, expect, it } from "vitest";
import {
  extractExperienceYearsConstraints,
  extractHardConstraints,
  extractKeywordConstraints,
  extractLanguageConstraints,
} from "../src/index.ts";

describe("extractLanguageConstraints", () => {
  it("pairs a language name with a nearby CEFR level", () => {
    const results = extractLanguageConstraints("Must speak German at a B2 level or above.");
    expect(results).toEqual([
      expect.objectContaining({
        kind: "language",
        requiredLanguageLevel: "b2",
        mappingStatus: "auto",
      }),
    ]);
  });

  it("treats 'fluent' as a C1 floor and 'native' as native", () => {
    expect(extractLanguageConstraints("Fluent English required.")[0]?.requiredLanguageLevel).toBe(
      "c1",
    );
    expect(extractLanguageConstraints("Native French speaker.")[0]?.requiredLanguageLevel).toBe(
      "native",
    );
  });

  it("finds nothing when no language is mentioned", () => {
    expect(extractLanguageConstraints("Strong communication skills.")).toEqual([]);
  });

  it("quotes the enclosing bullet, not a character window across neighbours", () => {
    // Regression: a fixed ±40-char slice around "English" in this ad produced
    // "ng\n- Scripting in Python or Go\n- Fluent English, both written and
    // spoken\n- EU work auth" — starting and ending mid-word, spanning three
    // unrelated bullets. A human reads this field in the review queue.
    const ad = [
      "Requirements",
      "- Solid Linux administration and networking fundamentals",
      "- Scripting in Python or Go",
      "- Fluent English, both written and spoken",
      "- EU work authorization required",
    ].join("\n");

    expect(extractLanguageConstraints(ad)).toEqual([
      expect.objectContaining({
        kind: "language",
        rawText: "Fluent English, both written and spoken",
        requiredLanguageLevel: "c1",
      }),
    ]);
  });

  it("keeps whole words when the enclosing line is a long paragraph", () => {
    const prefix = "We are a distributed platform team spread across several time zones, ";
    const paragraph = `${prefix}and we expect fluent English from everyone, plus a willingness to document decisions carefully for the colleagues who are asleep.`;
    const rawText = extractLanguageConstraints(paragraph)[0]?.rawText ?? "";

    expect(rawText).toContain("English");
    expect(rawText.length).toBeLessThan(paragraph.length);
    // No partial word at either edge.
    expect(paragraph).toContain(rawText);
    expect(rawText).toMatch(/^\S/);
    expect(rawText).toMatch(/\S$/);
    const firstWord = rawText.split(/\s/)[0] ?? "";
    const lastWord = rawText.split(/\s/).at(-1) ?? "";
    expect(paragraph).toMatch(new RegExp(`\\b${firstWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    expect(paragraph).toMatch(new RegExp(`${lastWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`));
  });
});

describe("extractExperienceYearsConstraints", () => {
  it("extracts a numeric years-of-experience requirement", () => {
    const results = extractExperienceYearsConstraints(
      "5+ years of experience in backend development.",
    );
    expect(results).toEqual([
      expect.objectContaining({ kind: "experience_years", years: 5, mappingStatus: "auto" }),
    ]);
  });

  it("extracts every years-of-experience mention", () => {
    const results = extractExperienceYearsConstraints(
      "3+ years of experience with Docker and 5+ years of experience with Linux.",
    );
    expect(results.map((r) => r.years)).toEqual([3, 5]);
  });

  it("allows up to two words between the unit and 'experience'", () => {
    // Regression: requiring adjacency silently dropped the most common
    // phrasings, so an ad opening with "5+ years of professional experience"
    // produced no experience_years constraint at all.
    const cases: Array<[string, number]> = [
      ["5+ years of professional experience in a DevOps role", 5],
      ["3 years of hands-on production experience", 3],
      ["at least 7 years' experience", 7],
      ["minimum 4 yrs experience", 4],
      ["10 years of experience", 10],
    ];
    for (const [text, years] of cases) {
      expect(
        extractExperienceYearsConstraints(text).map((r) => r.years),
        text,
      ).toEqual([years]);
    }
  });

  it("does not drift across a sentence into an unrelated 'experience'", () => {
    expect(
      extractExperienceYearsConstraints(
        "Founded 5 years ago, we have since built up considerable operational experience.",
      ),
    ).toEqual([]);
  });
});

describe("extractKeywordConstraints", () => {
  it("flags work authorization, clearance and education mentions", () => {
    const results = extractKeywordConstraints(
      "Must have EU work authorization. Security clearance required. Bachelor's degree preferred.",
    );
    expect(results.map((r) => r.kind)).toEqual(["work_authorization", "clearance", "education"]);
    expect(results.every((r) => r.mappingStatus === "unmapped")).toBe(true);
  });
});

describe("extractHardConstraints", () => {
  it("combines language, years and keyword constraints", () => {
    const text = "5+ years of experience. Fluent English required. EU work authorization needed.";
    const results = extractHardConstraints(text);
    expect(results.map((r) => r.kind).sort()).toEqual([
      "experience_years",
      "language",
      "work_authorization",
    ]);
  });
});
