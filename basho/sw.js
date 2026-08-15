/* 蝣ｴ謇蟶ｳ service worker 窶・network first・域峩譁ｰ縺檎｢ｺ螳溘↓螻翫￥譁ｹ蠑擾ｼ・*/
const CACHE = "basho-v0.64.0";
/* OCR繧ｨ繝ｳ繧ｸ繝ｳ・・cr/ 邏・0MB繝ｻ蜀・ｮｹ荳榊､会ｼ峨・蛻･繧ｭ繝｣繝・す繝･・議ache first ・・豈主屓縺ｮ蜀好L繧ら沿荳翫￡譎ゅ・蜀好L繧ゅ＠縺ｪ縺・*/
const OCR_CACHE = "basho-ocr-v1";
/* v0.37.0: 繝倥Ν繝励ｒ逕ｻ蜒上°繧羽TML譛ｬ譁・↓蛻ｷ譁ｰ・拮elp01縲・4.png縺ｯ蜷梧｢ｱ繝ｻprecache縺ｨ繧ゅ↓蟒・ｭ｢ */
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
  /* 剥G繝槭ャ繝怜・逵溷叙蠕・v0.38.0)縺ｮGoogle蠢懃ｭ斐・驛ｽ蠎ｦ迚ｩ縺悟､ｧ縺阪＞・昴く繝｣繝・す繝･縺ｫ貅懊ａ霎ｼ縺ｾ縺ｪ縺・ｼ育ｴ騾壹＠・・*/
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
        /* index.html縺ｸ縺ｮ繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ縺ｯ閾ｪ蛻・・繝壹・繧ｸ縺縺代・           螟夜Κ繧ｵ繧､繝医∈縺ｮ螟ｱ謨・CORS遲・縺ｫ閾ｪ蛻・・逕ｻ髱｢繧定ｿ斐☆縺ｨ縲√Μ繝ｳ繧ｯ繧ｫ繝ｼ繝峨・
           繧ｵ繧､繝域ュ蝣ｱ蜿門ｾ励′縲悟ｴ謇蟶ｳ閾ｪ霄ｫ縲阪ｒ謗ｴ繧薙〒縺励∪縺・ｼ・0.13.0縺ｮ螳滓ｩ溘ヰ繧ｰ・・*/
        if (new URL(e.request.url).origin === location.origin) return caches.match("./index.html");
        return Response.error();
      }))
  );
});
