import { describe, expect, it } from "vitest";
import {
  combineImportanceWithRollup,
  frequencyAcrossRoles,
  requirementImportanceWeight,
  skillFrequencyForRole,
} from "../src/index.ts";

describe("requirementImportanceWeight", () => {
  it("maps required/preferred/absent to 1.0/0.5/0", () => {
    expect(requirementImportanceWeight("required")).toBe(1.0);
    expect(requirementImportanceWeight("preferred")).toBe(0.5);
    expect(requirementImportanceWeight("absent")).toBe(0);
  });
});

describe("combineImportanceWithRollup", () => {
  it("adds children's rolled-up contribution to the skill's own importance", () => {
    // AWS itself absent from the ad, but IAM (required) and VPC (preferred) are mentioned
    const combined = combineImportanceWithRollup(0, [1.0, 0.5], 0.5);
    expect(combined).toBeCloseTo(0.75, 5);
  });
});

describe("skillFrequencyForRole", () => {
  const config = { windowDays: 180, minSample: 10 };

  it("averages importance across the target role's corpus", () => {
    const result = skillFrequencyForRole([1, 1, 0.5, 0], config);
    expect(result.frequency).toBeCloseTo(0.625, 5);
    expect(result.sampleSize).toBe(4);
  });

  it("flags insufficient data below the minimum sample", () => {
    const result = skillFrequencyForRole([1, 1], config);
    expect(result.sufficientData).toBe(false);
  });

  it("is 0 for an empty corpus", () => {
    expect(skillFrequencyForRole([], config).frequency).toBe(0);
  });
});

describe("frequencyAcrossRoles", () => {
  it("weights each target role's frequency by the role's weight", () => {
    const F = frequencyAcrossRoles([
      { weight: 1.0, frequency: 0.8 },
      { weight: 0.5, frequency: 0.2 },
    ]);
    // (1.0×0.8 + 0.5×0.2) / 1.5 = 0.6
    expect(F).toBeCloseTo(0.6, 5);
  });

  it("is 0 with no target roles", () => {
    expect(frequencyAcrossRoles([])).toBe(0);
  });
});
