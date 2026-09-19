import { describe, expect, it } from "vitest";
import { buildAliasIndex, findSkillMentions } from "../src/index.ts";

const dictionary = buildAliasIndex([
  { skillId: "skill-aws", normalized: "aws" },
  { skillId: "skill-aws", normalized: "amazon web services" },
  { skillId: "skill-k8s", normalized: "kubernetes" },
  { skillId: "skill-docker", normalized: "docker" },
]);

describe("findSkillMentions", () => {
  it("matches a single-word alias", () => {
    expect(findSkillMentions("Experience with Docker required.", dictionary)).toEqual([
      { skillId: "skill-docker", phrase: "docker" },
    ]);
  });

  it("prefers the longest multi-word alias over shorter overlapping ones", () => {
    // "aws" alone would also match inside "amazon web services" token-wise if not for the longest-first pass
    const matches = findSkillMentions("Experience with Amazon Web Services.", dictionary);
    expect(matches).toEqual([{ skillId: "skill-aws", phrase: "amazon web services" }]);
  });

  it("finds multiple distinct skills in one line", () => {
    const matches = findSkillMentions("Deploy Docker containers on Kubernetes.", dictionary);
    expect(matches).toContainEqual({ skillId: "skill-docker", phrase: "docker" });
    expect(matches).toContainEqual({ skillId: "skill-k8s", phrase: "kubernetes" });
    expect(matches).toHaveLength(2);
  });

  it("returns nothing when no alias matches", () => {
    expect(findSkillMentions("Excellent communication skills.", dictionary)).toEqual([]);
  });
});
