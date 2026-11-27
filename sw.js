const CACHE = 'qand-v2';
const FILES = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];
// Шу илованинг манзили (.../qand/). Сайтдаги бошқа иловалар («Дори вақти» ва б.) билан аралашмаслик учун
const SCOPE = self.registration.scope;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

// Фақат шу илованинг эски кэшлари ўчирилади — бошқа иловаларникига тегилмайди
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const ks = await caches.keys();
    await Promise.all(ks.filter(k => k.startsWith('qand-') && k !== CACHE).map(k => caches.delete(k)));
    // Олдин бу ерга адашиб «Дори вақти» файли юкланган эди — у шу илова нусхаларини 'dori-v1' кэшига ёзган.
    // Ўша кэшдан фақат шу илованинг (qand) нусхалари ўчирилади, «Дори вақти»никига тегилмайди.
    if (ks.includes('dori-v1')) {
      const c = await caches.open('dori-v1');
      const reqs = await c.keys();
      await Promise.all(reqs.filter(r => r.url.startsWith(SCOPE)).map(r => c.delete(r)));
    }
    await self.clients.claim();
  })());
});

// Аввал интернетдан, бўлмаса кэшдан (янгиланишлар тез келиши учун)
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || !req.url.startsWith(SCOPE)) return;
  e.respondWith(
    fetch(req).then(r => {
      if (r && r.ok && !new URL(req.url).search) {
        const copy = r.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      }
      return r;
    }).catch(() => caches.open(CACHE).then(c => c.match(req, { ignoreSearch: true }).then(r => r || c.match('./index.html'))))
  );
});

// Эслатма босилганда — фақат «Қанд назорати» ойнаси очилади ва керакли ўлчов ойнаси чиқади
self.addEventListener('notificationclick', e => {
  const n = e.notification;
  const k = (n.data && n.data.k) || '';
  n.close();
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const cs = all.filter(c => c.url.startsWith(SCOPE));
    if (cs.length) {
      cs[0].postMessage({ type: 'qand-open', k });
      try { await cs[0].focus(); } catch (_) {}
      return;
    }
    return self.clients.openWindow(SCOPE + '?k=' + encodeURIComponent(k));
  })());
});
