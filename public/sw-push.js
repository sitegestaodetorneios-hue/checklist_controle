self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Aviso", body: event.data?.text?.() || "Você tem uma notificação." };
  }

  const title = data.title || "BOT Turno";
  const options = {
    body: data.body || "",
    icon: "/icons/icon_192x192.png",
    badge: "/icons/favicon_32.png",
    data: { url: data.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification?.data?.url || "/";
  event.waitUntil(
    (async () => {
      const allClients = await clients.matchAll({ includeUncontrolled: true, type: "window" });
      const existing = allClients.find((c) => c.url.includes(url));
      if (existing) return existing.focus();
      return clients.openWindow(url);
    })()
  );
});
