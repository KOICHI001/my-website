/* 場所帳 service worker — network first（更新が確実に届く方式） */
const CACHE = "basho-v0.10.0";
/* OCRエンジン（ocr/ 約10MB・内容不変）は別キャッシュ＋cache first ＝ 毎回の再DLも版上げ時の再DLもしない */
const OCR_CACHE = "basho-ocr-v1";
const ASSETS = ["./", "./index.html", "./pref_data.js", "./leaflet.js", "./leaflet.css", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== OCR_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  if (new URL(e.request.url).pathname.includes("/ocr/")) {
    e.respondWith(
      caches.match(e.request).then(r => r || fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(OCR_CACHE).then(c => c.put(e.request, copy));
        return res;
      }))
    );
    return;
  }
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match("./index.html")))
  );
});
