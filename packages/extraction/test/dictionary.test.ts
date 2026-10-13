import { describe, expect, it } from "vitest";
import { buildAliasIndex, buildSkillDictionary, findSkillMentions } from "../src/index.ts";

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

  it("reports one skill once per line even when named several ways", () => {
    // Regression: once the catalog name is indexed alongside the alias, a line
    // writing both ("Kubernetes (k8s)") matched twice and produced two
    // job_requirements rows for one requirement.
    const index = buildSkillDictionary({
      aliases: [{ skillId: "skill-k8s", normalized: "k8s" }],
      skills: [{ skillId: "skill-k8s", name: "Kubernetes", slug: "kubernetes" }],
    });
    expect(findSkillMentions("Operating Kubernetes (k8s) clusters at scale.", index)).toEqual([
      { skillId: "skill-k8s", phrase: "kubernetes" },
    ]);
  });
});

describe("buildSkillDictionary", () => {
  const skills = [
    { skillId: "skill-terraform", name: "Terraform", slug: "terraform" },
    { skillId: "skill-ci", name: "CI/CD", slug: "ci-cd" },
    { skillId: "skill-linux", name: "Linux Administration", slug: "linux-administration" },
    {
      skillId: "skill-iam",
      name: "Identity & Access Management",
      slug: "identity-access-management",
    },
  ];

  it("matches a catalogued skill that has no alias at all", () => {
    // The whole point: with aliases only, an ad naming Terraform outright
    // produced an unmapped requirement.
    const index = buildSkillDictionary({ skills });
    expect(findSkillMentions("Infrastructure as code with Terraform.", index)).toEqual([
      { skillId: "skill-terraform", phrase: "terraform" },
    ]);
  });

  it("matches by slug as well as by name", () => {
    const index = buildSkillDictionary({ skills });
    expect(findSkillMentions("Solid Linux administration background.", index)).toEqual([
      { skillId: "skill-linux", phrase: "linux administration" },
    ]);
    expect(findSkillMentions("Owns identity-access-management.", index)).toEqual([
      { skillId: "skill-iam", phrase: "identity access management" },
    ]);
  });

  it("normalizes punctuation in names and slugs to one form", () => {
    const index = buildSkillDictionary({ skills });
    // "CI/CD" and "ci-cd" both normalize to "ci cd", so one entry serves both.
    expect(findSkillMentions("Maintains CI/CD pipelines.", index)).toEqual([
      { skillId: "skill-ci", phrase: "ci cd" },
    ]);
  });

  it("lets an alias win over a colliding catalog entry", () => {
    const index = buildSkillDictionary({
      aliases: [{ skillId: "skill-alias-owner", normalized: "terraform" }],
      skills,
    });
    expect(index.get("terraform")).toBe("skill-alias-owner");
  });

  it("keeps the first entry within one source, so row order alone decides nothing else", () => {
    const index = buildSkillDictionary({
      skills: [
        { skillId: "skill-first", name: "Go", slug: "go" },
        { skillId: "skill-second", name: "Go", slug: "golang" },
      ],
    });
    expect(index.get("go")).toBe("skill-first");
    expect(index.get("golang")).toBe("skill-second");
  });

  it("ignores entries that normalize to nothing", () => {
    const index = buildSkillDictionary({
      aliases: [{ skillId: "skill-blank", normalized: "   " }],
      skills: [{ skillId: "skill-blank", name: "!!!", slug: "" }],
    });
    expect(index.size).toBe(0);
  });

  it("builds an empty index from no input", () => {
    expect(buildSkillDictionary({}).size).toBe(0);
  });
});
