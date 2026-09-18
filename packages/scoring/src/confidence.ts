import type {
  EvidenceConfidenceResult,
  EvidenceLink,
  RecencyConfig,
  ScoringConfig,
} from "./types.ts";

/**
 * Recency decay `r(a)` (docs/SCORING.md §2.3). A decay, not a cliff: old work
 * never drops below `floor`.
 */
export function recency(ageMonths: number, config: RecencyConfig): number {
  if (ageMonths <= config.graceMonths) {
    return 1;
  }
  const decayed = Math.pow(0.5, (ageMonths - config.graceMonths) / config.halfLifeMonths);
  return Math.max(config.floor, decayed);
}

/** `c_i = w_type(i) × s(i) × r(i)` for one eligible link (docs/SCORING.md §3). */
export function linkContribution(link: EvidenceLink, config: ScoringConfig): number {
  const w = config.evidenceTypeWeight[link.evidenceType];
  const s = config.strength[link.strength];
  const r = recency(link.ageMonths, config.recency);
  return w * s * r;
}

/**
 * `evidence_confidence = 1 − Π (1 − c_i)` (noisy-OR, docs/SCORING.md §3).
 * Monotone: passing more eligible links can never lower the result.
 */
export function evidenceConfidence(
  links: EvidenceLink[],
  config: ScoringConfig,
): EvidenceConfidenceResult {
  const contributions = links.map((link) => ({
    link,
    contribution: linkContribution(link, config),
  }));
  const confidence =
    1 - contributions.reduce((product, { contribution }) => product * (1 - contribution), 1);
  return { confidence, contributions };
}
