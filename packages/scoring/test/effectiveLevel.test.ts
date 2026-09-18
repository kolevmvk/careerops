import { describe, expect, it } from "vitest";
import { effectiveLevel, hierarchyEffectiveLevel, supportedLevel } from "../src/index.ts";

describe("supportedLevel", () => {
  it("is the highest demonstrated level among links meeting the support threshold", () => {
    const level = supportedLevel(
      [
        { demonstratedLevel: 2, confidence: 0.6 },
        { demonstratedLevel: 4, confidence: 0.3 }, // below threshold, excluded
        { demonstratedLevel: 3, confidence: 0.5 },
      ],
      0.5,
    );
    expect(level).toBe(3);
  });

  it("is 0 when no link meets the threshold", () => {
    expect(supportedLevel([{ demonstratedLevel: 5, confidence: 0.1 }], 0.5)).toBe(0);
  });
});

describe("effectiveLevel", () => {
  it("equals the assessed level when it does not exceed the supported level", () => {
    expect(effectiveLevel({ assessedLevel: 2, supportedLevel: 3, unsupportedFactor: 0.5 })).toBe(2);
  });

  it("half-credits the unsupported part of an assessment above the supported level", () => {
    expect(effectiveLevel({ assessedLevel: 3, supportedLevel: 2, unsupportedFactor: 0.5 })).toBe(
      2.5,
    );
  });

  it("falls back to the supported level when there is no assessment", () => {
    expect(effectiveLevel({ assessedLevel: null, supportedLevel: 2, unsupportedFactor: 0.5 })).toBe(
      2,
    );
  });
});

describe("hierarchyEffectiveLevel", () => {
  const config = { parentCredit: 0.5, childCredit: 0.75, rollupFactor: 0.5 };

  it("credits from a tracked parent", () => {
    expect(
      hierarchyEffectiveLevel({ kind: "tracked_parent", parentEffectiveLevel: 4 }, config),
    ).toBe(2);
  });

  it("credits from tracked children", () => {
    expect(
      hierarchyEffectiveLevel({ kind: "tracked_children", maxChildEffectiveLevel: 4 }, config),
    ).toBe(3);
  });

  it("is 0 when neither parent nor children are tracked", () => {
    expect(hierarchyEffectiveLevel({ kind: "none" }, config)).toBe(0);
  });
});
