"use client";

import { useEffect, useState } from "react";

export interface ResilienceStrings {
  /** Shown once the page is genuinely cached and would survive a lost network. */
  ready: string;
  /** Shown when the visitor is actually offline and still reading. */
  offline: string;
  /** Shown while the worker is registering, or if it never does. */
  pending: string;
}

/**
 * A page about surviving unreliable networks should survive one.
 *
 * This is the thesis applied to the page itself, so it only ever states what
 * is true at that moment: nothing is claimed until the service worker is
 * actually controlling the page, and when the visitor really does lose the
 * network, the line changes to say so while they carry on reading.
 *
 * The honesty is the point. A static badge reading "works offline" would be a
 * decoration, and a reader who checked would catch it.
 */
export function ResilienceMarker({ strings }: { strings: ResilienceStrings }) {
  const [cached, setCached] = useState(false);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);

    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then(() => navigator.serviceWorker.ready)
        .then(() => setCached(navigator.serviceWorker.controller !== null))
        .catch(() => setCached(false));

      // A first visit registers the worker but is not yet controlled by it;
      // this fires when it takes over, which is when the claim becomes true.
      const onControllerChange = () => setCached(true);
      navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

      return () => {
        window.removeEventListener("online", goOnline);
        window.removeEventListener("offline", goOffline);
        navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      };
    }

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  const state = !online ? "offline" : cached ? "ready" : "pending";
  const label = strings[state];

  return (
    <p
      className="flex items-center gap-2 font-mono text-xs text-(--color-ink-faint)"
      aria-live="polite"
    >
      <span
        aria-hidden
        className={`inline-block size-1.5 rounded-full ${
          state === "offline"
            ? "bg-(--color-warn)"
            : state === "ready"
              ? "bg-(--color-good)"
              : "bg-(--color-ink-faint)"
        }`}
      />
      {label}
    </p>
  );
}
