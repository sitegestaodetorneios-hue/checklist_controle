/*
  Service Worker (PWA + Push)
  - Cache básico (app-shell) para abrir rápido mesmo com sinal ruim
  - Push Notifications (web-push)
  Observação: este SW é propositalmente simples para não brigar com o cache do Next.
*/

const CACHE = "checklist-shell-v1";

const APP_SHELL = [
  "/",
  "/turno",
  "/pendencias",
  "/carros/saida",
  "/icons/icon_192x192.png",
  "/icons/icon_512x512.png",
  "/manifest.webmanifest",
  "/brand/ativa.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(APP_SHELL).catch(() => {});
      self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Não cacheia APIs
  if (url.pathname.startsWith("/api")) return;

  // Estratégia: network-first p/ páginas, cache-first p/ assets.
  const isAsset = url.pathname.startsWith("/_next") || url.pathname.startsWith("/icons") || url.pathname.startsWith("/brand") || url.pathname.endsWith(".css") || url.pathname.endsWith(".js");

  if (isAsset) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        const res = await fetch(req);
        const cache = await caches.open(CACHE);
        cache.put(req, res.clone()).catch(() => {});
        return res;
      })()
    );
    return;
  }

  event.respondWith(
    (async () => {
      try {
        const res = await fetch(req);
        const cache = await caches.open(CACHE);
        cache.put(req, res.clone()).catch(() => {});
        return res;
      } catch {
        const cached = await caches.match(req);
        return cached || caches.match("/");
      }
    })()
  );
});

// ===== Push =====
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Aviso", body: event.data?.text?.() || "Você tem uma notificação." };
  }

  const title = data.title || "Checklist";
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
  const targetUrl = event.notification?.data?.url || "/";
  event.waitUntil(
    (async () => {
      const allClients = await clients.matchAll({ includeUncontrolled: true, type: "window" });
      const existing = allClients.find((c) => c.url.includes(targetUrl));
      if (existing) return existing.focus();
      return clients.openWindow(targetUrl);
    })()
  );
});
