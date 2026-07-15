// Garden State Water — offline support.
// Network-first for pages with cache fallback, so the delivery sheet,
// dashboard, and customer portal keep working with spotty signal once
// they've been loaded. Paying always requires a connection (never cached).
const CACHE = 'gsw-v2'; // bump together with the register-time cache in app/layout.tsx
const OFFLINE_URL = '/offline.html';
// With one bar of signal a fetch can hang for ~30s before failing. Give the
// network a fair chance, then serve the cached copy instead of a spinner.
const NETWORK_TIMEOUT_MS = 4000;

function fetchWithTimeout(request) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('network timeout')), NETWORK_TIMEOUT_MS);
    fetch(request).then(
      (response) => { clearTimeout(timer); resolve(response); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}

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
    // Pages: network first (with a timeout for weak signal), fall back to
    // the cached copy, then the offline page.
    event.respondWith(
      fetchWithTimeout(request)
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
