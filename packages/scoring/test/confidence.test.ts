import { describe, expect, it } from "vitest";
import {
  DEFAULT_SCORING_CONFIG,
  evidenceConfidence,
  linkContribution,
  recency,
  type EvidenceLink,
} from "../src/index.ts";

describe("recency", () => {
  const config = DEFAULT_SCORING_CONFIG.recency;

  it("is 1 within the grace period", () => {
    expect(recency(0, config)).toBe(1);
    expect(recency(24, config)).toBe(1);
  });

  it("decays by half life after the grace period", () => {
    expect(recency(24 + config.halfLifeMonths, config)).toBeCloseTo(0.5, 5);
  });

  it("never drops below floor", () => {
    expect(recency(10_000, config)).toBe(config.floor);
  });
});

describe("linkContribution", () => {
  it("multiplies type weight, strength and recency", () => {
    const link: EvidenceLink = {
      evidenceType: "repository",
      strength: 3,
      demonstratedLevel: 3,
      ageMonths: 0,
    };
    // repository weight 0.75 × strength 3 → 1.0 × recency 1.0
    expect(linkContribution(link, DEFAULT_SCORING_CONFIG)).toBeCloseTo(0.75, 5);
  });
});

describe("evidenceConfidence", () => {
  it("returns 0 for no links", () => {
    expect(evidenceConfidence([], DEFAULT_SCORING_CONFIG).confidence).toBe(0);
  });

  it("is monotone: adding a verified link never lowers confidence", () => {
    let seed = 42;
    const rand = (): number => {
      // deterministic LCG, no external dependency needed for this property check
      seed = (seed * 1_103_515_245 + 12_345) % 2 ** 31;
      return seed / 2 ** 31;
    };
    const evidenceTypes: EvidenceLink["evidenceType"][] = [
      "repository",
      "lab",
      "release",
      "certification",
    ];

    for (let trial = 0; trial < 50; trial++) {
      const links: EvidenceLink[] = [];
      for (let i = 0; i < 5; i++) {
        const before = evidenceConfidence(links, DEFAULT_SCORING_CONFIG).confidence;
        links.push({
          evidenceType: evidenceTypes[Math.floor(rand() * evidenceTypes.length)] ?? "repository",
          strength: (Math.floor(rand() * 3) + 1) as 1 | 2 | 3,
          demonstratedLevel: Math.floor(rand() * 6),
          ageMonths: Math.floor(rand() * 120),
        });
        const after = evidenceConfidence(links, DEFAULT_SCORING_CONFIG).confidence;
        expect(after).toBeGreaterThanOrEqual(before);
      }
    }
  });
});
