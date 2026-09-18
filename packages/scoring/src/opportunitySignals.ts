export type TermsGateResult = "below_floor" | "unknown" | "ok";

/** `pursuit_score = fit × receptiveness` (1–25) (docs/SCORING.md §9). */
export function pursuitScore(fit: number, receptiveness: number): number {
  return fit * receptiveness;
}

export interface TermsGateInput {
  /** `target_roles.comp_floor`, already normalized to the same currency/period/basis as `comp`. */
  compFloor: number | null;
  /** Expected or offered compensation, normalized to the same currency/period/basis as `compFloor`. */
  comp: number | null;
}

/**
 * `terms_gate` (docs/SCORING.md §9). Currency/period/basis normalization is
 * the caller's job — this only compares two already-normalized numbers.
 */
export function termsGate(input: TermsGateInput): TermsGateResult {
  if (input.compFloor === null || input.comp === null) {
    return "unknown";
  }
  return input.comp < input.compFloor ? "below_floor" : "ok";
}

/** `staleness`: whether the opportunity has gone quiet past the follow-up threshold (docs/SCORING.md §9). */
export function isStale(daysSinceLastEvent: number, followUpThresholdDays: number): boolean {
  return daysSinceLastEvent >= followUpThresholdDays;
}

export interface FunnelCounts {
  contacted: number;
  conversation: number;
  evaluation: number;
  offer: number;
  /** Offers with `terms_gate = 'ok'`. */
  acceptableOffer: number;
}

export interface FunnelMetrics {
  responseRate: number;
  evaluationRate: number;
  offerRate: number;
  acceptableRate: number;
}

/**
 * Funnel metrics, computed per track and per origin — never blended
 * (docs/SCORING.md §9.1).
 */
export function funnelMetrics(counts: FunnelCounts): FunnelMetrics {
  const safeDiv = (numerator: number, denominator: number): number =>
    denominator > 0 ? numerator / denominator : 0;
  return {
    responseRate: safeDiv(counts.conversation, counts.contacted),
    evaluationRate: safeDiv(counts.evaluation, counts.contacted),
    offerRate: safeDiv(counts.offer, counts.contacted),
    acceptableRate: safeDiv(counts.acceptableOffer, counts.offer),
  };
}
