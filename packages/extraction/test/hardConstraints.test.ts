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
