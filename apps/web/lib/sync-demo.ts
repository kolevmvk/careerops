/**
 * The offline capture engine the portfolio demonstrates.
 *
 * This is the actual semantics, not an animation that pretends: a durable
 * local queue, exactly-once delivery under retry, per-actor ordering, and
 * recovery from process death. The page drives it; the tests hold it honest.
 *
 * It is deliberately small and synchronous. A reader who opens DevTools should
 * be able to follow it in a minute, because the point is the reasoning rather
 * than the machinery.
 */

export type EventStatus = "pending" | "in_flight" | "acknowledged" | "dead_letter";

export interface CaptureEvent {
  /** Stable across retries. Two taps of the same action share one. */
  idempotencyKey: string;
  /** Monotonic per device, which is what makes ordering checkable. */
  localSequence: number;
  label: string;
  occurredAt: number;
  status: EventStatus;
  attempts: number;
}

export interface ServerRecord {
  idempotencyKey: string;
  localSequence: number;
  label: string;
  receivedAt: number;
}

export interface SyncState {
  online: boolean;
  queue: CaptureEvent[];
  server: ServerRecord[];
  nextSequence: number;
  /** Set when a duplicate was rejected, so the page can say why. */
  lastRejection: string | null;
}

export function initialState(): SyncState {
  return { online: true, queue: [], server: [], nextSequence: 1, lastRejection: null };
}

/**
 * Records an event locally. It is durable the moment it is written, which is
 * the whole point: capture never depends on the network being up.
 */
export function capture(state: SyncState, label: string, idempotencyKey: string): SyncState {
  const event: CaptureEvent = {
    idempotencyKey,
    localSequence: state.nextSequence,
    label,
    occurredAt: Date.now(),
    status: "pending",
    attempts: 0,
  };

  return {
    ...state,
    queue: [...state.queue, event],
    nextSequence: state.nextSequence + 1,
    lastRejection: null,
  };
}

export function setOnline(state: SyncState, online: boolean): SyncState {
  return { ...state, online, lastRejection: null };
}

/**
 * Process death. Anything in flight had an unknown outcome, so it returns to
 * pending rather than being dropped or assumed delivered — the server's
 * idempotency check is what makes retrying it safe.
 */
export function killProcess(state: SyncState): SyncState {
  return {
    ...state,
    queue: state.queue.map((event) =>
      event.status === "in_flight" ? { ...event, status: "pending" } : event,
    ),
    lastRejection: null,
  };
}

/**
 * Sends the oldest pending event, in order. Returns the state unchanged when
 * offline or when there is nothing to send, so the caller can drive it from a
 * timer without special cases.
 */
export function flushOne(state: SyncState): SyncState {
  if (!state.online) return state;

  const index = state.queue.findIndex((event) => event.status === "pending");
  if (index === -1) return state;

  const event = state.queue[index];
  if (event === undefined) return state;

  // Ordering is per device: an earlier sequence that is still pending must go
  // first, or the server sees the day's events out of order.
  const earlierPending = state.queue.some(
    (other) => other.status === "pending" && other.localSequence < event.localSequence,
  );
  if (earlierPending) return state;

  const alreadyAccepted = state.server.some(
    (record) => record.idempotencyKey === event.idempotencyKey,
  );

  const queue = state.queue.map((other, position) =>
    position === index
      ? { ...other, status: "acknowledged" as const, attempts: other.attempts + 1 }
      : other,
  );

  if (alreadyAccepted) {
    // The server answers the same way it did the first time. A duplicate is
    // not an error for the client; it is the retry working.
    return {
      ...state,
      queue,
      lastRejection: `${event.label} was already recorded — the server returned the first result.`,
    };
  }

  return {
    ...state,
    queue,
    server: [
      ...state.server,
      {
        idempotencyKey: event.idempotencyKey,
        localSequence: event.localSequence,
        label: event.label,
        receivedAt: Date.now(),
      },
    ],
    lastRejection: null,
  };
}

export function pendingCount(state: SyncState): number {
  return state.queue.filter((event) => event.status === "pending").length;
}

/** The claim the demo makes, checkable at any moment. */
export function isExactlyOnce(state: SyncState): boolean {
  const keys = state.server.map((record) => record.idempotencyKey);
  return new Set(keys).size === keys.length;
}

/** The other claim: the server saw them in the order the device recorded them. */
export function isOrdered(state: SyncState): boolean {
  return state.server.every(
    (record, index) =>
      index === 0 || record.localSequence > (state.server[index - 1]?.localSequence ?? 0),
  );
}
