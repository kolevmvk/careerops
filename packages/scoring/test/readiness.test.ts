import { describe, expect, it } from "vitest";
import { readiness, type ReadinessSkillInput } from "../src/index.ts";

const config = { windowDays: 180, minSample: 10 };

describe("readiness", () => {
  it("weights per-skill coverage by market frequency", () => {
    const skills: ReadinessSkillInput[] = [
      { frequency: 0.8, effectiveLevel: 4, targetLevel: 4 }, // fully covered, high demand
      { frequency: 0.2, effectiveLevel: 0, targetLevel: 4 }, // uncovered, low demand
    ];
    const result = readiness(skills, 12, config);
    // (0.8×1 + 0.2×0) / 1.0 × 100 = 80
    expect(result.score).toBeCloseTo(80, 5);
    expect(result.sufficientData).toBe(true);
  });

  it("is 0 with no demand at all", () => {
    expect(readiness([], 0, config).score).toBe(0);
  });

  it("flags insufficient data below the minimum sample", () => {
    expect(
      readiness([{ frequency: 1, effectiveLevel: 3, targetLevel: 3 }], 3, config).sufficientData,
    ).toBe(false);
  });

  it("never lowers the score when effective level rises (property, §12)", () => {
    const before = readiness(
      [{ frequency: 1, effectiveLevel: 1, targetLevel: 4 }],
      12,
      config,
    ).score;
    const after = readiness(
      [{ frequency: 1, effectiveLevel: 3, targetLevel: 4 }],
      12,
      config,
    ).score;
    expect(after).toBeGreaterThan(before);
  });
});
