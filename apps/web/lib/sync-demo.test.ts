import { describe, expect, it } from "vitest";

import {
  capture,
  flushOne,
  initialState,
  isExactlyOnce,
  isOrdered,
  killProcess,
  pendingCount,
  setOnline,
  type SyncState,
} from "./sync-demo.ts";

/** Drains the queue the way the page's timer does. */
function drain(state: SyncState): SyncState {
  let current = state;
  for (let i = 0; i < 50 && pendingCount(current) > 0; i += 1) {
    const next = flushOne(current);
    if (next === current) break;
    current = next;
  }
  return current;
}

describe("capture never depends on the network", () => {
  it("records while offline and keeps everything queued", () => {
    let state = setOnline(initialState(), false);
    state = capture(state, "Shift start", "k1");
    state = capture(state, "Break start", "k2");

    expect(pendingCount(state)).toBe(2);
    expect(state.server).toHaveLength(0);
  });

  it("delivers everything once the network returns", () => {
    let state = setOnline(initialState(), false);
    state = capture(state, "Shift start", "k1");
    state = capture(state, "Break start", "k2");
    state = drain(setOnline(state, true));

    expect(pendingCount(state)).toBe(0);
    expect(state.server.map((r) => r.label)).toEqual(["Shift start", "Break start"]);
  });

  it("flushing while offline changes nothing", () => {
    const state = capture(setOnline(initialState(), false), "Shift start", "k1");
    expect(flushOne(state)).toBe(state);
  });
});

describe("exactly once", () => {
  it("two taps of the same action reach the server once", () => {
    let state = initialState();
    state = capture(state, "Shift start", "same-key");
    state = capture(state, "Shift start", "same-key");
    state = drain(state);

    expect(state.server).toHaveLength(1);
    expect(isExactlyOnce(state)).toBe(true);
    expect(state.lastRejection).toContain("already recorded");
  });

  it("distinct actions are not collapsed", () => {
    let state = initialState();
    state = capture(state, "Shift start", "k1");
    state = capture(state, "Shift end", "k2");
    state = drain(state);

    expect(state.server).toHaveLength(2);
  });
});

describe("ordering is per device", () => {
  it("the server sees events in the order the device recorded them", () => {
    let state = setOnline(initialState(), false);
    for (const [index, label] of ["a", "b", "c", "d"].entries()) {
      state = capture(state, label, `k${index}`);
    }
    state = drain(setOnline(state, true));

    expect(state.server.map((r) => r.label)).toEqual(["a", "b", "c", "d"]);
    expect(isOrdered(state)).toBe(true);
  });

  it("a later event never overtakes an earlier pending one", () => {
    let state = setOnline(initialState(), false);
    state = capture(state, "first", "k1");
    state = capture(state, "second", "k2");
    state = setOnline(state, true);

    state = flushOne(state);
    expect(state.server.map((r) => r.label)).toEqual(["first"]);
  });
});

describe("process death", () => {
  it("returns in-flight work to pending rather than losing or assuming it", () => {
    let state = setOnline(initialState(), false);
    state = capture(state, "Shift start", "k1");

    const inFlight: SyncState = {
      ...state,
      queue: state.queue.map((event) => ({ ...event, status: "in_flight" as const })),
    };

    const recovered = killProcess(inFlight);
    expect(pendingCount(recovered)).toBe(1);
    expect(recovered.server).toHaveLength(0);
  });

  it("a retry after a crash still delivers exactly once", () => {
    let state = initialState();
    state = capture(state, "Shift start", "k1");
    state = flushOne(state);

    // The acknowledgement was lost, so the client retries the same key.
    const retried: SyncState = {
      ...state,
      queue: state.queue.map((event) => ({ ...event, status: "pending" as const })),
    };

    const final = drain(retried);
    expect(final.server).toHaveLength(1);
    expect(isExactlyOnce(final)).toBe(true);
  });
});

describe("the claims hold under a mixed sequence", () => {
  it("offline capture, duplicate tap, crash and reconnect", () => {
    let state = setOnline(initialState(), false);
    state = capture(state, "Shift start", "k1");
    state = capture(state, "Break start", "k2");
    state = capture(state, "Break start", "k2");
    state = killProcess(state);
    state = drain(setOnline(state, true));

    expect(pendingCount(state)).toBe(0);
    expect(state.server.map((r) => r.label)).toEqual(["Shift start", "Break start"]);
    expect(isExactlyOnce(state)).toBe(true);
    expect(isOrdered(state)).toBe(true);
  });
});
