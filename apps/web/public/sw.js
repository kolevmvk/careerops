/*
 * The portfolio survives losing the network, because that is the thing it
 * claims to be good at. A page about offline capture that goes blank in a
 * tunnel would be arguing against itself.
 *
 * Deliberately small and stale-while-revalidate: the visitor always gets
 * something instantly, and the network updates it in the background when it
 * can. No precache manifest, no build step, nothing to go stale wrongly.
 */

const CACHE = "portfolio-v1";

// Only the public surface. The cockpit holds a session and real data, and
// caching it would be a privacy problem rather than a performance win.
const PUBLIC_PATHS = ["/", "/de", "/sr", "/llms.txt"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PUBLIC_PATHS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

function isCacheable(request) {
  if (request.method !== "GET") return false;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;

  // Never the cockpit, never anything carrying a session.
  if (url.pathname.startsWith("/cockpit") || url.pathname.startsWith("/login")) return false;
  if (url.pathname.startsWith("/api")) return false;

  return true;
}

self.addEventListener("fetch", (event) => {
  if (!isCacheable(event.request)) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => cached);

      // Serve what we have immediately; let the network correct it after.
      return cached ?? network;
    }),
  );
});
