/* ELVÉN: service worker. Мережа в пріоритеті (щоб ціни й товари завжди були свіжі), кеш лише як запасний варіант.
   Запити до бази (Supabase), Telegram та інші сторонні адреси не кешуються. Змініть VERSION, щоб скинути кеш. */
const VERSION = 'elven-v1';
const SHELL = ['/', '/offline.html', '/favicon-192.png', '/favicon-512.png', '/favicon.svg', '/apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL).catch(() => {})).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;   // чужі адреси й не-GET: як є
  e.respondWith(
    fetch(req).then((res) => {
      if (res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then((hit) => hit || (req.mode === 'navigate' ? caches.match('/offline.html') : Response.error())))
  );
});
