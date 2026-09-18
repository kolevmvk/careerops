import { describe, expect, it } from "vitest";
import { buildAliasIndex, extractRequirements } from "../src/index.ts";

// Fictional ad — the extraction package is public code (ADR-0012); never
// copy real ad text from private/job-corpus into a committed fixture.
const FICTIONAL_AD = `
We are Fictional Corp, a company that builds imaginary things for imaginary
customers all around the world.

Responsibilities
- Design and maintain infrastructure using Terraform.
- Deploy and operate services on Kubernetes.

Requirements
- 5+ years of experience with Docker.
- Fluent English required.
- Excellent stakeholder communication skills.

Nice to have
- Experience with Amazon Web Services.

Beyond the paycheck
- Private health insurance.
- Gym membership.
`;

describe("extractRequirements", () => {
  const dictionary = buildAliasIndex([
    { skillId: "skill-terraform", normalized: "terraform" },
    { skillId: "skill-k8s", normalized: "kubernetes" },
    { skillId: "skill-docker", normalized: "docker" },
    { skillId: "skill-aws", normalized: "amazon web services" },
  ]);

  it("matches dictionary skills with the right importance and required level", () => {
    const result = extractRequirements(FICTIONAL_AD, dictionary);

    expect(result.skillRequirements).toContainEqual(
      expect.objectContaining({
        skillId: "skill-terraform",
        importance: "required",
        mappingStatus: "auto",
      }),
    );
    expect(result.skillRequirements).toContainEqual(
      expect.objectContaining({
        skillId: "skill-docker",
        importance: "required",
        requiredLevel: 3,
      }),
    );
    expect(result.skillRequirements).toContainEqual(
      expect.objectContaining({ skillId: "skill-aws", importance: "preferred" }),
    );
  });

  it("queues an unmatched short requirement phrase for review", () => {
    const result = extractRequirements(FICTIONAL_AD, dictionary);
    expect(result.unmappedCandidates).toContainEqual({
      rawText: "Excellent stakeholder communication skills.",
      importance: "required",
    });
  });

  it("ignores the benefits section entirely", () => {
    const result = extractRequirements(FICTIONAL_AD, dictionary);
    const allText = [
      ...result.skillRequirements.map((r) => r.rawText),
      ...result.unmappedCandidates.map((c) => c.rawText),
    ].join(" ");
    expect(allText).not.toMatch(/health insurance|gym membership/i);
  });

  it("extracts hard constraints from the whole ad", () => {
    const result = extractRequirements(FICTIONAL_AD, dictionary);
    expect(result.hardConstraints).toContainEqual(
      expect.objectContaining({ kind: "language", requiredLanguageLevel: "c1" }),
    );
    expect(result.hardConstraints).toContainEqual(
      expect.objectContaining({ kind: "experience_years", years: 5 }),
    );
  });

  it("does not duplicate the same unmapped phrase twice", () => {
    const repeated = "Requirements\n- Great teamwork\n- Great teamwork\n";
    const result = extractRequirements(repeated, dictionary);
    expect(result.unmappedCandidates).toHaveLength(1);
  });
});
