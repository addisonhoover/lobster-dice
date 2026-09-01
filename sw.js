/* Lobster Dice / Crimson Dice service worker — offline app shell (cache-first) */
const CACHE = 'lobster-dice-v10';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './crimson/manifest.webmanifest',
  './activity.html',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png',
  './crimson/icon-192.png',
  './crimson/icon-512.png',
  './crimson/elephant-flat.png',
  './crimson/elephant-white.png',
  './crimson/elephant-shaded.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(ASSETS.map(a => c.add(a))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (new URL(e.request.url).origin !== self.location.origin) return; // never cache sync/API calls
  const isDoc = e.request.mode === 'navigate' || e.request.destination === 'document';
  if (isDoc) {
    // network-first for the app shell so updates land immediately; cache is the offline fallback
    e.respondWith(
      fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put('./index.html', copy)).catch(() => {});
        return res;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }
  // cache-first for static assets (icons, manifest)
  e.respondWith(
    caches.match(e.request).then(hit =>
      hit || fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match('./index.html'))
    )
  );
});
