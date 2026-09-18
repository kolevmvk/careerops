import { describe, expect, it } from "vitest";
import {
  DEFAULT_SCORING_CONFIG,
  classifyRequirement,
  constraintGate,
  evaluateCertificationConstraint,
  evaluateLanguageConstraint,
  jobMatch,
  type SkillRequirementInput,
} from "../src/index.ts";

describe("classifyRequirement", () => {
  const config = DEFAULT_SCORING_CONFIG.classification;

  it("is strong when met with high confidence", () => {
    expect(classifyRequirement(4, 3, 0.8, config)).toBe("strong");
  });

  it("is unproven when met with low confidence", () => {
    expect(classifyRequirement(4, 3, 0.4, config)).toBe("unproven");
  });

  it("is partial between the partial ratio and the requirement", () => {
    expect(classifyRequirement(2, 3, 0.9, config)).toBe("partial");
  });

  it("is missing below the partial ratio", () => {
    expect(classifyRequirement(1, 3, 0.9, config)).toBe("missing");
  });
});

describe("jobMatch", () => {
  it("weights required requirements above preferred ones", () => {
    const requirements: SkillRequirementInput[] = [
      {
        requirementId: "req-1",
        mappingStatus: "confirmed",
        requiredLevel: 3,
        importance: "required",
        effectiveLevel: 3,
        evidenceConfidence: 0.9,
      },
      {
        requirementId: "req-2",
        mappingStatus: "auto",
        requiredLevel: 3,
        importance: "preferred",
        effectiveLevel: 0,
        evidenceConfidence: 0,
      },
    ];
    const result = jobMatch(requirements, DEFAULT_SCORING_CONFIG);
    // (1.0 × 1 + 0.4 × 0) / (1.0 + 0.4) = 0.714...
    expect(result.score).toBeCloseTo(71.43, 1);
  });

  it("excludes unmapped requirements from the score but flags coverage", () => {
    const requirements: SkillRequirementInput[] = [
      {
        requirementId: "req-1",
        mappingStatus: "confirmed",
        requiredLevel: 3,
        importance: "required",
        effectiveLevel: 3,
        evidenceConfidence: 0.9,
      },
      {
        requirementId: "req-2",
        mappingStatus: "unmapped",
        requiredLevel: null,
        importance: "required",
        effectiveLevel: 0,
        evidenceConfidence: 0,
      },
    ];
    const result = jobMatch(requirements, DEFAULT_SCORING_CONFIG);
    expect(result.score).toBe(100); // a 100% match on half the ad...
    expect(result.extractionCoverage).toBe(0.5); // ...is flagged as covering only half of it
    expect(result.unscoredRequirementIds).toEqual(["req-2"]);
  });

  it("ignores requirements with mapping_status = ignored entirely", () => {
    const requirements: SkillRequirementInput[] = [
      {
        requirementId: "req-1",
        mappingStatus: "confirmed",
        requiredLevel: 3,
        importance: "required",
        effectiveLevel: 3,
        evidenceConfidence: 0.9,
      },
      {
        requirementId: "req-2",
        mappingStatus: "ignored",
        requiredLevel: null,
        importance: "required",
        effectiveLevel: 0,
        evidenceConfidence: 0,
      },
    ];
    const result = jobMatch(requirements, DEFAULT_SCORING_CONFIG);
    expect(result.extractionCoverage).toBe(1);
  });

  it("never lowers the score when a fully-covered required skill is added (property, §12)", () => {
    const base: SkillRequirementInput[] = [
      {
        requirementId: "req-1",
        mappingStatus: "confirmed",
        requiredLevel: 4,
        importance: "required",
        effectiveLevel: 1,
        evidenceConfidence: 0.5,
      },
    ];
    const before = jobMatch(base, DEFAULT_SCORING_CONFIG).score;
    const after = jobMatch(
      [
        ...base,
        {
          requirementId: "req-2",
          mappingStatus: "confirmed",
          requiredLevel: 3,
          importance: "required",
          effectiveLevel: 5, // fully covers this requirement
          evidenceConfidence: 0.9,
        },
      ],
      DEFAULT_SCORING_CONFIG,
    ).score;
    expect(after).toBeGreaterThanOrEqual(before);
  });

  it("never lowers the score when effective level rises (property, §12)", () => {
    const requirement = (effectiveLevel: number): SkillRequirementInput[] => [
      {
        requirementId: "req-1",
        mappingStatus: "confirmed",
        requiredLevel: 4,
        importance: "required",
        effectiveLevel,
        evidenceConfidence: 0.9,
      },
    ];
    const before = jobMatch(requirement(1), DEFAULT_SCORING_CONFIG).score;
    const after = jobMatch(requirement(3), DEFAULT_SCORING_CONFIG).score;
    expect(after).toBeGreaterThan(before);
  });
});

describe("evaluateLanguageConstraint", () => {
  it("passes when the actual level meets or exceeds the required level", () => {
    expect(evaluateLanguageConstraint("b2", "c1")).toBe("pass");
    expect(evaluateLanguageConstraint("b2", "b2")).toBe("pass");
  });

  it("fails when below the required level", () => {
    expect(evaluateLanguageConstraint("c1", "b2")).toBe("fail");
  });

  it("is unknown with no recorded proficiency", () => {
    expect(evaluateLanguageConstraint("b2", null)).toBe("unknown");
  });
});

describe("evaluateCertificationConstraint", () => {
  it("passes when earned, fails when expired, warns when on track, unknown when absent", () => {
    expect(evaluateCertificationConstraint("earned")).toBe("pass");
    expect(evaluateCertificationConstraint("expired")).toBe("fail");
    expect(evaluateCertificationConstraint("in_progress")).toBe("warn");
    expect(evaluateCertificationConstraint(null)).toBe("unknown");
  });
});

describe("constraintGate", () => {
  it("is the worst result; any fail wins", () => {
    expect(constraintGate(["pass", "warn", "fail", "unknown"])).toBe("fail");
    expect(constraintGate(["pass", "warn", "unknown"])).toBe("warn");
    expect(constraintGate(["pass", "unknown"])).toBe("unknown");
    expect(constraintGate(["pass", "pass"])).toBe("pass");
  });

  it("is pass with no constraints", () => {
    expect(constraintGate([])).toBe("pass");
  });
});
