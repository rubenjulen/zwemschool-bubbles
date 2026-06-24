/* Service worker voor Zwemschool Bubbles (FR-13.2).
 * Strategie:
 *  - App-shell + statische assets: cache-first met versiebeheer.
 *  - Navigaties: network-first met offline fallback naar /offline-cache.
 *  - API/Supabase-calls: NIET cachen (verse, autorisatie-gevoelige data).
 * Bump CACHE_VERSION bij elke release zodat oude caches worden opgeruimd.
 */
const CACHE_VERSION = "v2";
const CACHE_NAME = `bubbles-${CACHE_VERSION}`;
const APP_SHELL = ["/", "/manifest.webmanifest", "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Nooit autorisatie-gevoelige of dynamische data cachen.
  if (url.pathname.startsWith("/api") || url.hostname.endsWith(".supabase.co")) {
    return;
  }

  // Navigaties: network-first, val terug op de gecachete app-shell.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/").then((r) => r ?? Response.error())),
    );
    return;
  }

  // Statische assets: cache-first.
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ??
        fetch(request).then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        }),
    ),
  );
});
