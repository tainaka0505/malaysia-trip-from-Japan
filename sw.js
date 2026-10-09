/* オフライン用：一度開いたファイルは保存して、ネットがなくても使えるようにする */
const SHELL = "mt-shell-202610100847";
const DATA = "mt-data-v1";
const SHELL_FILES = ["./", "index.html", "manifest.webmanifest", "icons/icon-192.png", "icons/apple-touch-icon.png", "vendor/maplibre-gl.js", "vendor/maplibre-gl.css", "vendor/firebase-app-compat.js", "vendor/firebase-auth-compat.js", "vendor/firebase-firestore-compat.js", "core/config.js", "core/router-worker.js", "core/app.js", "core/icons.js", "core/store.js", "data/ets.js", "data/guide.js", "data/spots.js", "data/transport.js", "data/trip.js", "modules/guide.js", "modules/itinerary.js", "modules/map.js", "modules/packing.js", "modules/split.js", "modules/spots.js", "modules/transit.js"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith("mt-shell-") && k !== SHELL).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  const isData = /\/(tiles|fonts|data\/map)\//.test(u.pathname);
  if (isData) {
    // 地図データ：保存済みならそれを使う
    e.respondWith(caches.open(DATA).then(async (c) => {
      const hit = await c.match(e.request, { ignoreSearch: true });
      if (hit) return hit;
      const r = await fetch(e.request);
      if (r.ok) c.put(e.request, r.clone());
      return r;
    }));
    return;
  }
  // アプリ本体：まずネット、だめなら保存した物
  e.respondWith(fetch(e.request).then((r) => {
    if (r.ok) { const cp = r.clone(); caches.open(SHELL).then((c) => c.put(e.request, cp)); }
    return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: true }).then((h) => h || caches.match("index.html"))));
});
