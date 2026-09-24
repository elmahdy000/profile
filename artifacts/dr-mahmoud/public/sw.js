// Service Worker for Dr. Mahmoud Elmahdy PWA
// Version — bump this to force cache refresh
const CACHE_VERSION = "drelmahdy-v5-safe-refresh";
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

  // Built assets are hashed. Prefer the network so a stale worker can never
  // pin an old application shell; use cache only when the network is offline.
  if (
    url.pathname.startsWith("/assets/") ||
    url.pathname.startsWith("/fonts/") ||
    /\.(png|jpg|jpeg|webp|svg|ico|woff2?|ttf|mp3|wav)$/.test(url.pathname)
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const cloned = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, cloned));
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || Response.error())),
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

// ── Web Push Notifications (active even when browser/site is closed!) ────────
self.addEventListener("push", (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { title: "أكاديمية د. محمود المهدي", body: event.data.text() };
    }
  }

  const title = data.title || "أكاديمية د. محمود المهدي";
  const options = {
    body: data.body || "لديك إشعار وتحديث جديد في حسابك",
    icon: data.icon || "/web-app-manifest-192x192.png",
    badge: data.badge || "/favicon-96x96.png",
    dir: "rtl",
    lang: "ar",
    vibrate: [250, 100, 250],
    tag: data.tag || `drelmahdy-${Date.now()}`,
    renotify: true,
    data: {
      url: data.url || "/platform",
      timestamp: Date.now(),
    },
    actions: [
      { action: "open", title: "فتح المنصة 🚀" },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/platform";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      // Focus existing tab if open
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          if ("navigate" in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    }),
  );
});
