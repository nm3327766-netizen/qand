const CACHE = 'dori-v1';
const FILES = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];
// Шу илованинг манзили (масалан .../dori/). Сайтдаги бошқа иловалар (Қанд назорати ва б.) билан аралашмаслик учун
const SCOPE = self.registration.scope;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

// Фақат шу илованинг эски кэшлари ўчирилади — бошқа иловаларникига тегилмайди
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k.startsWith('dori-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
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

// Билдиришнома босилганда — фақат «Дори вақти» ойнаси очилади
self.addEventListener('notificationclick', e => {
  const n = e.notification;
  const data = n.data || {};
  const act = e.action || 'open';
  n.close();
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const cs = all.filter(c => c.url.startsWith(SCOPE));
    if (cs.length) {
      cs[0].postMessage({ type: act, date: data.date, key: data.key });
      try { await cs[0].focus(); } catch (_) {}
      return;
    }
    const url = SCOPE + '?act=' + act + '&date=' + encodeURIComponent(data.date || '') + '&key=' + encodeURIComponent(data.key || '');
    return self.clients.openWindow(url);
  })());
});
