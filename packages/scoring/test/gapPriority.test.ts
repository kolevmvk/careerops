import { describe, expect, it } from "vitest";
import {
  DEFAULT_SCORING_CONFIG,
  gapLabel,
  gapPriority,
  gapType,
  targetLevel,
  weightedMedian,
} from "../src/index.ts";

describe("weightedMedian", () => {
  it("picks the value where cumulative weight crosses half the total", () => {
    expect(weightedMedian([{ value: 2, weight: 1 }])).toBe(2);
    expect(
      weightedMedian([
        { value: 2, weight: 1 },
        { value: 3, weight: 1 },
        { value: 4, weight: 1 },
      ]),
    ).toBe(3);
  });

  it("throws on an empty list", () => {
    expect(() => weightedMedian([])).toThrow();
  });
});

describe("targetLevel", () => {
  it("uses the explicit target level when set", () => {
    expect(targetLevel({ explicitTargetLevel: 4, corpusRequiredLevels: [], defaultLevel: 3 })).toBe(
      4,
    );
  });

  it("falls back to the corpus's weighted median", () => {
    expect(
      targetLevel({
        explicitTargetLevel: null,
        corpusRequiredLevels: [
          { value: 2, weight: 1 },
          { value: 4, weight: 1 },
        ],
        defaultLevel: 3,
      }),
    ).toBe(2);
  });

  it("falls back to the default when the corpus is empty", () => {
    expect(
      targetLevel({ explicitTargetLevel: null, corpusRequiredLevels: [], defaultLevel: 3 }),
    ).toBe(3);
  });
});

describe("gapType", () => {
  it("is learn when effective level is below target", () => {
    expect(gapType(2, 3, 0.9, 0.6)).toBe("learn");
  });

  it("is prove when target is met but confidence is low", () => {
    expect(gapType(3, 3, 0.4, 0.6)).toBe("prove");
  });

  it("is none when target is met with confidence", () => {
    expect(gapType(3, 3, 0.9, 0.6)).toBe("none");
  });
});

describe("gapPriority", () => {
  it("is 0 when there is no gap", () => {
    expect(
      gapPriority(
        {
          targetLevel: 3,
          effectiveLevel: 3,
          evidenceConfidence: 0.9,
          marketFrequency: 0.9,
          feasibility: "high",
          gapType: "none",
          failsHardConstraintOnBenchmarkJob: false,
        },
        DEFAULT_SCORING_CONFIG.gap,
      ),
    ).toBe(0);
  });

  it("adds the hard-constraint bonus, capped at 100", () => {
    const priority = gapPriority(
      {
        targetLevel: 5,
        effectiveLevel: 0,
        evidenceConfidence: 0,
        marketFrequency: 1,
        feasibility: "high",
        gapType: "learn",
        failsHardConstraintOnBenchmarkJob: true,
      },
      DEFAULT_SCORING_CONFIG.gap,
    );
    expect(priority).toBe(100);
  });
});

describe("gapLabel", () => {
  it("is high_value at or above the frequency threshold with a real gap", () => {
    expect(gapLabel(0.4, "learn", false)).toBe("high_value");
  });

  it("is low_value below the frequency threshold with no hard constraint involved", () => {
    expect(gapLabel(0.1, "none", false)).toBe("low_value");
  });

  it("is neither in between, or when a hard constraint is involved", () => {
    expect(gapLabel(0.2, "learn", false)).toBeNull();
    expect(gapLabel(0.1, "learn", true)).toBeNull();
  });
});
