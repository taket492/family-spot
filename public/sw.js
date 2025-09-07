// Minimal service worker for PWA installability and basic offline
const CACHE_NAME = 'app-cache-v1';
const CORE_ASSETS = [
  '/',
  '/manifest.webmanifest',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => (k === CACHE_NAME ? undefined : caches.delete(k)))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  // Only handle same-origin GET requests
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  const isStatic = /\.(?:js|css|png|jpg|jpeg|webp|svg|ico|woff2?)$/i.test(url.pathname);
  const isApi = url.pathname.startsWith('/api/');

  // Cache-first for static assets
  if (isStatic) {
    event.respondWith(
      caches.match(req).then((cached) =>
        cached || fetch(req).then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone)).catch(() => {});
          return res;
        })
      )
    );
    return;
  }

  // Stale-while-revalidate for API GETs
  if (isApi) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(req).then((cached) => {
          const network = fetch(req).then((res) => {
            cache.put(req, res.clone()).catch(() => {});
            return res;
          });
          return cached || network;
        })
      )
    );
    return;
  }

  // Default: network-first with cache fallback
  event.respondWith(
    fetch(req)
      .then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then((cached) => cached || caches.match('/')))
  );
});
