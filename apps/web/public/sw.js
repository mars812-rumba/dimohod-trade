const CACHE_NAME = "dimohod-trade-shell-v1";
const APP_ASSETS = [
  "brand/logo-original.jpg",
  "brand/app-icon-192.png",
  "brand/app-icon-512.png",
  "brand/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  const urls = APP_ASSETS.map((path) => new URL(path, self.registration.scope).toString());
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(urls)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(caches.match(event.request).then((cached) => cached ?? fetch(event.request)));
});
