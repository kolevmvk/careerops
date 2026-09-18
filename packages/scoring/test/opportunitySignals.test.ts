import { describe, expect, it } from "vitest";
import { funnelMetrics, isStale, pursuitScore, termsGate } from "../src/index.ts";

describe("pursuitScore", () => {
  it("multiplies fit and receptiveness", () => {
    expect(pursuitScore(5, 5)).toBe(25);
    expect(pursuitScore(1, 1)).toBe(1);
  });
});

describe("termsGate", () => {
  it("is below_floor when comp is under the floor", () => {
    expect(termsGate({ compFloor: 5000, comp: 4000 })).toBe("below_floor");
  });

  it("is ok at or above the floor", () => {
    expect(termsGate({ compFloor: 5000, comp: 5000 })).toBe("ok");
  });

  it("is unknown when either value is missing", () => {
    expect(termsGate({ compFloor: null, comp: 5000 })).toBe("unknown");
    expect(termsGate({ compFloor: 5000, comp: null })).toBe("unknown");
  });
});

describe("isStale", () => {
  it("is stale at or past the follow-up threshold", () => {
    expect(isStale(7, 7)).toBe(true);
    expect(isStale(8, 7)).toBe(true);
    expect(isStale(6, 7)).toBe(false);
  });
});

describe("funnelMetrics", () => {
  it("computes each rate independently, never blended", () => {
    const metrics = funnelMetrics({
      contacted: 10,
      conversation: 4,
      evaluation: 2,
      offer: 1,
      acceptableOffer: 1,
    });
    expect(metrics.responseRate).toBeCloseTo(0.4, 5);
    expect(metrics.evaluationRate).toBeCloseTo(0.2, 5);
    expect(metrics.offerRate).toBeCloseTo(0.1, 5);
    expect(metrics.acceptableRate).toBe(1);
  });

  it("is 0 for empty denominators instead of dividing by zero", () => {
    const metrics = funnelMetrics({
      contacted: 0,
      conversation: 0,
      evaluation: 0,
      offer: 0,
      acceptableOffer: 0,
    });
    expect(metrics.responseRate).toBe(0);
    expect(metrics.acceptableRate).toBe(0);
  });
});
