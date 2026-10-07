/* Share Barabara Web Push worker. No private keys or service credentials belong here. */
self.addEventListener("push", (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { payload = {}; }
  const title = typeof payload.title === "string" ? payload.title : "Share Barabara";
  const body = typeof payload.body === "string" ? payload.body : "You have a new notification.";
  const rawUrl = typeof payload.url === "string" ? payload.url : "/notifications";
  let url = "/notifications";
  try {
    const parsed = new URL(rawUrl, self.location.origin);
    if (parsed.origin === self.location.origin) url = `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch { /* keep the safe fallback */ }
  event.waitUntil(self.registration.showNotification(title, {
    body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url },
    tag: typeof payload.tag === "string" ? payload.tag : "share-barabara-notification",
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/notifications";
  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of clients) {
      if ("focus" in client) { await client.focus(); if ("navigate" in client) await client.navigate(new URL(target, self.location.origin)); return; }
    }
    if (self.clients.openWindow) await self.clients.openWindow(new URL(target, self.location.origin));
  })());
});
