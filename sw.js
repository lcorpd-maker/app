// Офлайн-оболонка: екрани відкриваються навіть без зв'язку; дані завжди беруться з сервера.
const VERSION = 'v35';   // змінюйте при кожному оновленні вигляду — телефони підхоплять нову версію
const SHELL = ['./', 'index.html', 'app.js', 'drive.js', 'style.css', 'config.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL))); self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;   // запити до сервера — напряму
  // спершу мережа (щоб оновлення приходили одразу), без мережі — збережена копія
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); return r; })
    .catch(() => caches.match(e.request).then(r => r || caches.match('index.html'))));
});
// Сповіщення (ADR-064): текст приходить зашифрованим від сервера через Cloudflare Worker.
self.addEventListener('push', e => {
  let m = {}; try { m = e.data ? e.data.json() : {}; } catch (er) { m = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(m.title || 'Л-КОРП', { body: m.body || '', tag: m.tag || undefined, renotify: !!m.tag, icon: 'icon-192.png', badge: 'icon-192.png', data: { url: m.url || './' } }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || './', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(ws => { const w = ws.find(x => x.url.startsWith(self.registration.scope)); return w ? w.focus() : self.clients.openWindow(url); }));
});
