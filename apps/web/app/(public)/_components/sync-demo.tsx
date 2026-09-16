"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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
} from "@/lib/sync-demo.ts";

export interface SyncDemoStrings {
  eyebrow: string;
  heading: string;
  lede: string;
  device: string;
  server: string;
  goOffline: string;
  goOnline: string;
  crash: string;
  reset: string;
  offlineNote: string;
  emptyQueue: string;
  emptyServer: string;
  exactlyOnce: string;
  ordered: string;
  actions: { label: string; key: string }[];
  hint: string;
}

/**
 * The centrepiece: the reader does the thing rather than reads about it.
 *
 * An engineering manager at a workforce company recognises this problem in
 * about three seconds — capture on a phone that loses signal, a worker who
 * taps twice, an app the OS kills mid-sync. Twenty seconds of clicking says
 * more than a paragraph claiming the same competence.
 *
 * The state machine behind it is the real one, in `lib/sync-demo.ts`, and it
 * is covered by tests. Nothing here fakes an outcome.
 */
export function SyncDemo({ strings }: { strings: SyncDemoStrings }) {
  const [state, setState] = useState<SyncState>(initialState);
  const [announcement, setAnnouncement] = useState("");
  const tapCount = useRef(0);

  // One timer drains the queue, the way a sync worker would. Sending is
  // deliberately unhurried so the ordering is visible rather than instant.
  useEffect(() => {
    if (!state.online || pendingCount(state) === 0) return;

    const timer = window.setTimeout(() => setState(flushOne), 420);
    return () => window.clearTimeout(timer);
  }, [state]);

  const record = useCallback((label: string, key: string) => {
    tapCount.current += 1;
    setState((current) => capture(current, label, key));
  }, []);

  const pending = pendingCount(state);
  const exactlyOnce = isExactlyOnce(state);
  const ordered = isOrdered(state);

  useEffect(() => {
    setAnnouncement(
      state.online
        ? `${pending} queued, ${state.server.length} delivered`
        : `Offline. ${pending} queued locally.`,
    );
  }, [pending, state.server.length, state.online]);

  return (
    <section className="reveal mt-28">
      <p className="font-mono text-xs tracking-widest text-(--color-accent) uppercase">
        {strings.eyebrow}
      </p>
      <h2 className="mt-3 text-2xl sm:text-3xl">{strings.heading}</h2>
      <p className="mt-3 max-w-prose leading-relaxed text-(--color-ink-muted)">{strings.lede}</p>

      {/* 44px minimum on every control: this is read and poked on a phone. */}
      <div className="mt-8 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setState((current) => setOnline(current, !current.online))}
          aria-pressed={!state.online}
          className={`min-h-11 rounded-full border px-4 text-sm font-medium transition-colors duration-200 ${
            state.online
              ? "border-(--color-border-strong) text-(--color-ink)"
              : "border-(--color-warn) bg-(--color-warn)/10 text-(--color-warn)"
          }`}
        >
          {state.online ? strings.goOffline : strings.goOnline}
        </button>

        <button
          type="button"
          onClick={() => setState(killProcess)}
          className="min-h-11 rounded-full border border-(--color-border-strong) px-4 text-sm transition-colors duration-200 hover:border-(--color-danger) hover:text-(--color-danger)"
        >
          {strings.crash}
        </button>

        <button
          type="button"
          onClick={() => {
            tapCount.current = 0;
            setState(initialState());
          }}
          className="min-h-11 rounded-full px-3 text-sm text-(--color-ink-faint) transition-colors duration-200 hover:text-(--color-ink)"
        >
          {strings.reset}
        </button>
      </div>

      <div className="mt-6 grid gap-px overflow-hidden rounded-xl border border-(--color-border-subtle) bg-(--color-border-subtle) sm:grid-cols-2">
        {/* Device */}
        <div className="bg-(--color-surface-raised) p-5">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="font-mono text-xs tracking-widest text-(--color-ink-muted) uppercase">
              {strings.device}
            </h3>
            <span
              className={`font-mono text-xs ${state.online ? "text-(--color-good)" : "text-(--color-warn)"}`}
            >
              {state.online ? "online" : "offline"}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {strings.actions.map((action) => (
              <button
                key={action.key}
                type="button"
                onClick={() => record(action.label, action.key)}
                className="min-h-11 flex-1 rounded-md border border-(--color-border-subtle) px-3 text-sm transition-[transform,border-color] duration-150 hover:border-(--color-accent) active:scale-[0.98] sm:flex-none"
              >
                {action.label}
              </button>
            ))}
          </div>

          <ul className="mt-5 flex min-h-32 flex-col gap-1.5 font-mono text-xs">
            {state.queue.length === 0 ? (
              <li className="text-(--color-ink-faint)">{strings.emptyQueue}</li>
            ) : (
              state.queue.map((event) => (
                <li
                  key={`${event.idempotencyKey}-${event.localSequence}`}
                  className="flex items-center gap-2"
                >
                  <span className="w-5 text-(--color-ink-faint)">{event.localSequence}</span>
                  <span className="flex-1 truncate text-(--color-ink)">{event.label}</span>
                  <StatusDot status={event.status} />
                </li>
              ))
            )}
          </ul>

          {!state.online && pending > 0 ? (
            <p className="mt-3 text-xs text-(--color-warn)">{strings.offlineNote}</p>
          ) : null}
        </div>

        {/* Server */}
        <div className="bg-(--color-surface-sunken) p-5">
          <h3 className="font-mono text-xs tracking-widest text-(--color-ink-muted) uppercase">
            {strings.server}
          </h3>

          <ul className="mt-4 flex min-h-32 flex-col gap-1.5 font-mono text-xs">
            {state.server.length === 0 ? (
              <li className="text-(--color-ink-faint)">{strings.emptyServer}</li>
            ) : (
              state.server.map((row) => (
                <li key={row.idempotencyKey} className="flex items-center gap-2">
                  <span className="w-5 text-(--color-ink-faint)">{row.localSequence}</span>
                  <span className="flex-1 truncate">{row.label}</span>
                  <span className="text-(--color-good)">✓</span>
                </li>
              ))
            )}
          </ul>

          <div className="mt-5 flex flex-col gap-1 text-xs">
            <Invariant ok={exactlyOnce} label={strings.exactlyOnce} />
            <Invariant ok={ordered} label={strings.ordered} />
          </div>
        </div>
      </div>

      {state.lastRejection !== null ? (
        <p className="mt-3 font-mono text-xs text-(--color-accent)">{state.lastRejection}</p>
      ) : null}

      <p className="mt-4 text-sm text-(--color-ink-faint)">{strings.hint}</p>

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </section>
  );
}

function StatusDot({ status }: { status: string }) {
  const tone =
    status === "acknowledged"
      ? "text-(--color-good)"
      : status === "in_flight"
        ? "text-(--color-accent)"
        : status === "dead_letter"
          ? "text-(--color-danger)"
          : "text-(--color-warn)";

  return <span className={`${tone} tabular-nums`}>{status.replace("_", " ")}</span>;
}

function Invariant({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={ok ? "text-(--color-good)" : "text-(--color-danger)"}>
      {ok ? "✓" : "✕"} {label}
    </span>
  );
}
