// Minimal service worker: exists only so the site is installable as a PWA.
// No offline caching yet, deliberately: caching SSR'd HTML risks serving
// stale/wrong pages, and the actual features here (alerts, votes, live data)
// need a network connection anyway.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Intentionally not intercepting: pass every request straight to the network.
});
