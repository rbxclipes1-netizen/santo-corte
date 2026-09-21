/* No page/API caching: private schedules never become an offline cache. */
self.addEventListener("install", (event) =>
  event.waitUntil(self.skipWaiting()),
);
self.addEventListener("activate", (event) =>
  event.waitUntil(self.clients.claim()),
);
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data?.json() || {};
  } catch {}
  event.waitUntil(
    self.registration.showNotification(data.title || "Santo Corte", {
      body: data.body || "Há uma atualização na sua agenda.",
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-96.png",
      tag: data.tag || "santo-corte",
      renotify: true,
      silent: false,
      vibrate: [200, 100, 200],
      data: { url: data.url || "/painel" },
    }),
  );
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  let url = new URL("/painel", self.location.origin);
  try {
    const candidate = new URL(
      event.notification.data?.url || "/painel",
      self.location.origin,
    );
    if (
      candidate.origin === self.location.origin &&
      candidate.pathname === "/painel"
    )
      url = candidate;
  } catch {}
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(async (clients) => {
        for (const client of clients) {
          if (new URL(client.url).origin === url.origin) {
            await client.navigate(url.href);
            return client.focus();
          }
        }
        return self.clients.openWindow(url.href);
      }),
  );
});
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
