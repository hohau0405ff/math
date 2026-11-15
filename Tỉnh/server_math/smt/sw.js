'use strict';
/* Sinh tu tools/gen-sw.cjs. Moi ban la mot bo tai nguyen da kiem SHA-256. */
const BUILD_ID = '197a5d7ec0e2';
const FILES = [{"url":"assets/fonts/unifont-vinacal.woff2","hash":"24c29a3373bb843e9783a3c0db1d9785ac3e795e3fbab6b46ebd88f1b95395bf"},{"url":"assets/fonts/vinacal-lcd-italic.woff","hash":"7106db34af9e50b356082b03fcec1af8d57549363e58b2750e1c25d6ce17aa8b"},{"url":"assets/fonts/vinacal-lcd-small-italic.woff","hash":"40c4d8cb5bea274d4a0ca13b65f5ba8abd7233d155026f5d36b63246aa2699ad"},{"url":"assets/fonts/vinacal-lcd-small.woff","hash":"56ae3337d580991627324bfff1f5b3b87555856c9cbd26f9a83d76ef66f90acf"},{"url":"assets/fonts/vinacal-lcd-tiny-italic.woff","hash":"d4ce170a847c0786e61de533d0d61470c3e1843561ac69aaf6b9a7547737a35f"},{"url":"assets/fonts/vinacal-lcd-tiny.woff","hash":"fca82394e63336a3b344a44e260e3528dfc8e7b76ca0cf49b5061877ee7962e9"},{"url":"assets/fonts/vinacal-lcd.woff","hash":"07547a615c25bfdc8be0d8b0ab08e768171e7cc443589ea8ccc1e1beb4b10ad6"},{"url":"assets/vinacal-logo.png","hash":"3e479e25a82bd58af8acb683eb57cc10ed338c07b4c78a4d3f233d88735f5e95"},{"url":"assets/vinacal-sticker.webp","hash":"6b3f3d076d94ed5389570412c7b711ee97e42eb36e8941c653d28bc4d6642694"},{"url":"css/vinacal.82ce4eb71c.css","hash":"e113c30833cf23ed2f639b9e89bc8ed22c8fac0e47dcef5cb07e17469e082cce"},{"url":"icons/apple-touch-icon.png","hash":"a9aeb38ea481c5666eb80514850bd83bd11c3af1bbc476750868c57745578591"},{"url":"icons/icon-192.png","hash":"45fdbeaaca5f0b507bcb1f94a078794d7a81e8449a62b625fa2a9d42b2f3db2d"},{"url":"icons/icon-512.png","hash":"a4b3ca9015e7a6a700f739fe35d69f7020980c5abc95b29244c70051c97f55d7"},{"url":"icons/icon-maskable-192.png","hash":"45fdbeaaca5f0b507bcb1f94a078794d7a81e8449a62b625fa2a9d42b2f3db2d"},{"url":"icons/icon-maskable-512.png","hash":"a4b3ca9015e7a6a700f739fe35d69f7020980c5abc95b29244c70051c97f55d7"},{"url":"./","hash":"decb2098705411fd0a44c03a380abf77b7d3611ce3c2b9020567e5f43440c1d4"},{"url":"js/vinacal.e8a0240a55.js","hash":"e8a0240a552d62d3fdb6f7a07b12f87df8904e1e950f0903c27e683c4b35a1f3"},{"url":"logo.png","hash":"dd1473497caeacff8d3cdae6cdb79370442dd73a2c4ec14db5edcc3a869d8f7f"},{"url":"manifest.webmanifest","hash":"f873a839685032bddb3f216c1448e0f2f85df8f219c59558756cd5879e491c22"}];
const BASE = self.registration.scope;
const PREFIX = 'vinacal-offline:' + encodeURIComponent(new URL(BASE).pathname) + ':';
const CACHE = PREFIX + BUILD_ID;
const urls = FILES.map((file) => new URL(file.url, BASE).href);
let refreshing = null;

function cacheRelease() {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    // Tai du va xac minh TRUOC khi ghi; loi mang/deploy do dang giu nguyen ban cu.
    const responses = await Promise.all(FILES.map(async (file, index) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      try {
        const response = await fetch(urls[index], {
          cache: 'no-store', credentials: 'same-origin', signal: controller.signal
        });
        if (!response.ok) throw new Error('Missing resource');
        const digest = await crypto.subtle.digest('SHA-256', await response.clone().arrayBuffer());
        const hash = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
        if (hash !== file.hash) throw new Error('Incomplete deployment');
        return response;
      } finally { clearTimeout(timeout); }
    }));
    const cache = await caches.open(CACHE);
    await Promise.all(responses.map((response, index) => cache.put(urls[index], response)));
  })().finally(() => { refreshing = null; });
  return refreshing;
}

self.addEventListener('install', (event) => { event.waitUntil(cacheRelease()); });
self.addEventListener('activate', (event) => { event.waitUntil(self.clients.claim()); });

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  url.search = '';
  url.hash = '';
  const isHome = event.request.mode === 'navigate' &&
    (url.href === BASE || url.href === new URL('index.html', BASE).href);
  const key = isHome ? BASE : url.href;
  if (!urls.includes(key)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    return (await cache.match(key)) || fetch(event.request);
  })());
});

self.addEventListener('message', (event) => {
  if (!event.source || !event.source.url.startsWith(BASE)) return;
  // Nut "Tai lai" cua ban cu gui SKIP_WAITING ma khong co MessageChannel.
  // Ban nay da tai du va kiem hash trong install; kich hoat de tab cu tai lai.
  if (event.data && event.data.type === 'SKIP_WAITING') {
    event.waitUntil(self.skipWaiting());
    return;
  }
  const port = event.ports[0];
  if (!port) return;
  event.waitUntil((async () => {
    try {
      if (event.data.type === 'REFRESH') {
        await cacheRelease();
        await self.skipWaiting();
      } else if (event.data.type === 'STATUS') {
        const cache = await caches.open(CACHE);
        const saved = await Promise.all(urls.map((url) => cache.match(url)));
        if (saved.some((response) => !response)) throw new Error('Offline copy incomplete');
      } else if (event.data.type === 'CLEANUP') {
        // Tab cu van co the can tai nguyen ban cu; don khi chi con tab cap nhat.
        const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        if (clients.filter((client) => client.url.startsWith(BASE)).length <= 1) {
          const names = await caches.keys();
          await Promise.all(names.filter((name) => name.startsWith(PREFIX) && name !== CACHE)
            .map((name) => caches.delete(name)));
        }
      } else { throw new Error('Unknown message'); }
      port.postMessage({ ok: true, build: BUILD_ID });
    } catch (_) { port.postMessage({ ok: false }); }
  })());
});
