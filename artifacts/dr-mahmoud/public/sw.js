// Service Worker for Dr. Mahmoud Elmahdy PWA
// Version — bump this to force cache refresh
const CACHE_VERSION = "drelmahdy-v1";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;

// Assets to cache on install (app shell)
const PRECACHE_URLS = [
  "/",
  "/site.webmanifest",
  "/favicon-96x96.png",
  "/favicon.ico",
  "/apple-touch-icon.png",
  "/web-app-manifest-192x192.png",
  "/web-app-manifest-512x512.png",
];

// ── Install: cache app shell ─────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

// ── Activate: clean up old caches ────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// ── Fetch: network-first for API, cache-first for assets ─────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin requests
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // API calls: network only (never cache)
  if (url.pathname.startsWith("/api/")) return;

  // Static assets (JS/CSS/fonts/images): cache-first, fallback to network
  if (
    url.pathname.startsWith("/assets/") ||
    url.pathname.startsWith("/fonts/") ||
    /\.(png|jpg|jpeg|webp|svg|ico|woff2?|ttf|mp3|wav)$/.test(url.pathname)
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const cloned = response.clone();
              caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, cloned));
            }
            return response;
          }),
      ),
    );
    return;
  }

  // HTML navigation: network-first, fallback to cached index.html (SPA)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match("/").then((cached) => cached || Response.error()),
      ),
    );
    return;
  }
});

// ── Push Notifications (future use) ─────────────────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let data = {};
  try { data = event.data.json(); } catch { data = { title: "إشعار جديد", body: event.data.text() }; }
  const { title = "د. محمود المهدي", body = "لديك إشعار جديد" } = data;
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/web-app-manifest-192x192.png",
      badge: "/favicon-96x96.png",
      dir: "rtl",
      lang: "ar",
      vibrate: [200, 100, 200],
      tag: "drelmahdy-notification",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      const client = clients.find((c) => c.url.includes(self.location.origin));
      if (client) return client.focus();
      return self.clients.openWindow("/");
    }),
  );
});
