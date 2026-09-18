import { describe, expect, it } from "vitest";
import {
  DEFAULT_SCORING_CONFIG,
  effectiveLevel,
  evidenceConfidence,
  gapPriority,
  gapType,
  jobMatch,
  supportedLevel,
  type EvidenceLink,
} from "../src/index.ts";

/**
 * Golden fixture: docs/SCORING.md §11's Docker worked example. If the prose
 * and the code disagree, this test — not the prose — is wrong (§12).
 */
describe("docs/SCORING.md §11 worked example (Docker)", () => {
  const links: EvidenceLink[] = [
    { evidenceType: "lab", strength: 3, demonstratedLevel: 2, ageMonths: 3 },
    { evidenceType: "repository", strength: 2, demonstratedLevel: 2, ageMonths: 1 },
  ];

  it("computes evidence confidence ≈ 0.76", () => {
    const result = evidenceConfidence(links, DEFAULT_SCORING_CONFIG);
    expect(result.confidence).toBeCloseTo(0.76, 2);
  });

  it("computes supported level 2 and effective level 2.5 from assessed level 3", () => {
    const { confidence, contributions } = evidenceConfidence(links, DEFAULT_SCORING_CONFIG);
    const S = supportedLevel(
      contributions.map((c) => ({
        demonstratedLevel: c.link.demonstratedLevel,
        confidence: c.contribution,
      })),
      DEFAULT_SCORING_CONFIG.supportThreshold,
    );
    expect(S).toBe(2);

    const E = effectiveLevel({
      assessedLevel: 3,
      supportedLevel: S,
      unsupportedFactor: DEFAULT_SCORING_CONFIG.unsupportedFactor,
    });
    expect(E).toBe(2.5);
    expect(confidence).toBeCloseTo(0.76, 2);
  });

  it("classifies a level-3 requirement as partial at 0.83 coverage", () => {
    const { confidence } = evidenceConfidence(links, DEFAULT_SCORING_CONFIG);
    const result = jobMatch(
      [
        {
          requirementId: "req-docker",
          mappingStatus: "confirmed",
          requiredLevel: 3,
          importance: "required",
          effectiveLevel: 2.5,
          evidenceConfidence: confidence,
        },
      ],
      DEFAULT_SCORING_CONFIG,
    );

    expect(result.requirementScores[0]?.coverage).toBeCloseTo(0.83, 2);
    expect(result.requirementScores[0]?.classification).toBe("partial");
  });

  it("computes gap priority ≈ 44.5 for a learn gap with F=0.62 and high feasibility", () => {
    const { confidence } = evidenceConfidence(links, DEFAULT_SCORING_CONFIG);
    const E = 2.5;
    const targetLevelValue = 3;
    const type = gapType(
      E,
      targetLevelValue,
      confidence,
      DEFAULT_SCORING_CONFIG.classification.confidenceStrong,
    );
    expect(type).toBe("learn");

    const priority = gapPriority(
      {
        targetLevel: targetLevelValue,
        effectiveLevel: E,
        evidenceConfidence: confidence,
        marketFrequency: 0.62,
        feasibility: "high",
        gapType: type,
        failsHardConstraintOnBenchmarkJob: false,
      },
      DEFAULT_SCORING_CONFIG.gap,
    );

    // docs/SCORING.md §11 rounds confidence to 0.76 (deficit 0.24) before
    // showing 44.5; the unrounded inputs land a fraction of a point away.
    expect(priority).toBeCloseTo(44.5, 1);
  });
});
