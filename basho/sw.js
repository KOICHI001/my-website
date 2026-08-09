/* 場所帳 service worker — network first（更新が確実に届く方式） */
const CACHE = "basho-v0.48.0";
/* OCRエンジン（ocr/ 約10MB・内容不変）は別キャッシュ＋cache first ＝ 毎回の再DLも版上げ時の再DLもしない */
const OCR_CACHE = "basho-ocr-v1";
/* v0.37.0: ヘルプを画像からHTML本文に刷新＝help01〜04.pngは同梱・precacheともに廃止 */
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
  /* 🔍Gマップ写真取得(v0.38.0)のGoogle応答は都度物が大きい＝キャッシュに溜め込まない（素通し） */
  const noStore = /\b(googleapis\.com|googleusercontent\.com)\//.test(e.request.url);
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (!noStore) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then(r => {
        if (r) return r;
        /* index.htmlへのフォールバックは自分のページだけ。
           外部サイトへの失敗(CORS等)に自分の画面を返すと、リンクカードの
           サイト情報取得が「場所帳自身」を掴んでしまう（v0.13.0の実機バグ） */
        if (new URL(e.request.url).origin === location.origin) return caches.match("./index.html");
        return Response.error();
      }))
  );
});
