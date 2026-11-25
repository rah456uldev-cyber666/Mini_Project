// Service worker: stores the whole app on the device so it opens and works with no internet.
const CACHE = "medibot-v4-2";
const FILES = [
  "./", "index.html", "app.css", "config.js", "manifest.webmanifest",
  "js/core.js", "js/search.js", "js/answer.js", "js/extras.js", "js/app.js", "fonts/inter.woff2",
  "data/diseases.js", "data/passages.js",
  "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png", "icons/apple-touch-icon.png"
];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== self.location.origin) return; // AI/SMS calls go straight to the network
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request)));
});
