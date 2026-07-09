// Garden State Water — offline support.
// Network-first for pages with cache fallback, so the delivery sheet and
// dashboard keep working with spotty signal once they've been loaded.
const CACHE = 'gsw-v1';
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll([OFFLINE_URL])).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache API calls or auth flows.
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/login')) return;

  if (request.mode === 'navigate') {
    // Pages: network first, fall back to the cached copy, then the offline page.
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached ?? caches.match(OFFLINE_URL))
        )
    );
    return;
  }

  // Static assets: cache first (Next.js hashes them, so stale is impossible).
  if (url.pathname.startsWith('/_next/static/') || url.pathname.match(/\.(svg|png|ico|css|js|woff2?)$/)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
            return response;
          })
      )
    );
  }
});
