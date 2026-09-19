import { describe, expect, it } from "vitest";
import {
  planReviewQueueResolution,
  resolveRequirement,
  type UnmappedRequirementCandidate,
} from "../src/index.ts";

const candidate: UnmappedRequirementCandidate = {
  rawText: "Continuous Integration",
  importance: "required",
};

describe("planReviewQueueResolution", () => {
  it("plans just an alias when resolving to an existing skill", () => {
    const plan = planReviewQueueResolution(candidate, { existingSkillId: "skill-ci" });
    expect(plan.skillToCreate).toBeNull();
    expect(plan.aliasToCreate).toEqual({
      alias: "Continuous Integration",
      normalized: "continuous integration",
    });
  });

  it("plans a new skill plus its alias when resolving to a brand-new skill", () => {
    const plan = planReviewQueueResolution(candidate, {
      newSkill: { name: "Continuous Integration", kind: "practice", categoryId: "cat-devops" },
    });
    expect(plan.skillToCreate).toEqual({
      name: "Continuous Integration",
      kind: "practice",
      categoryId: "cat-devops",
    });
    expect(plan.aliasToCreate.normalized).toBe("continuous integration");
  });
});

describe("resolveRequirement", () => {
  it("produces a confirmed requirement for the resolved skill", () => {
    const requirement = resolveRequirement(candidate, "skill-ci");
    expect(requirement).toEqual({
      rawText: "Continuous Integration",
      importance: "required",
      skillId: "skill-ci",
      requiredLevel: null,
      mappingStatus: "confirmed",
    });
  });
});
