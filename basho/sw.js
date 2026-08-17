/* 場所帳 service worker  Enetwork first�E�更新が確実に届く方式！E*/
const CACHE = "basho-v0.68.0";
/* OCRエンジン�E�Ecr/ 紁E0MB・冁E��不変）�E別キャチE��ュ�E�cache first �E�E毎回の再DLも版上げ時�E再DLもしなぁE*/
const OCR_CACHE = "basho-ocr-v1";
/* v0.37.0: ヘルプを画像からHTML本斁E��刷新�E�help01、E4.pngは同梱・precacheともに廁E�� */
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
  /* 🔍Gマップ�E真取征Ev0.38.0)のGoogle応答�E都度物が大きい�E�キャチE��ュに溜め込まなぁE��素通し�E�E*/
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
        /* index.htmlへのフォールバックは自刁E�Eペ�Eジだけ、E           外部サイトへの失敁ECORS筁Eに自刁E�E画面を返すと、リンクカード�E
           サイト情報取得が「場所帳自身」を掴んでしまぁE��E0.13.0の実機バグ�E�E*/
        if (new URL(e.request.url).origin === location.origin) return caches.match("./index.html");
        return Response.error();
      }))
  );
});
