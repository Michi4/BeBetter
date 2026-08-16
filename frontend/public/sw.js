// BeBetter Service Worker — Push Notifications + Offline Support

const CACHE_VERSION = 'bebetter-v4';
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const DATA_CACHE = `${CACHE_VERSION}-data`;

const SHELL_URLS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/maskable-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !k.startsWith(CACHE_VERSION)).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ---- Client messages: clear personal data from caches on logout ----
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'clear-data-cache') {
    event.waitUntil(caches.delete(DATA_CACHE));
  }
});

// ---- Push notifications ----
self.addEventListener('push', (event) => {
  let data = { title: 'BeBetter', body: 'You have a new update!', url: '/' };

  try {
    if (event.data) {
      const parsed = event.data.json();
      data = {
        title: parsed.title || 'BeBetter',
        body: parsed.body || '',
        url: parsed.url || '/'
      };
    }
  } catch (e) {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    data: { url: data.url || '/' },
    vibrate: [100, 50, 100],
    actions: [{ action: 'open', title: 'Open BeBetter' }]
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data && event.notification.data.url ? event.notification.data.url : '/';
  const absoluteUrl = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url === absoluteUrl && 'focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(absoluteUrl);
    })
  );
});

// Offline support
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Navigation requests: network-first, fall back to cached shell
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put('/index.html', clone));
          return res;
        })
        .catch(() =>
          caches.match('/index.html').then((cached) =>
            cached || caches.match('/').then((root) => root || new Response('Offline', { status: 503 }))
          )
        )
    );
    return;
  }

  // API GET requests (data): network-first with cache fallback for offline.
  // /auth/* is never cached — it's account-specific and must always hit the
  // network so another visitor can never be shown a previous account's data.
  if (url.pathname.startsWith('/api/')) {
    if (url.pathname.startsWith('/api/auth/')) {
      event.respondWith(fetch(req));
      return;
    }
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(DATA_CACHE).then((cache) => cache.put(req, clone));
          }
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached))
    );
    return;
  }

  // Static assets (hashed, immutable): cache-first, then network
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put(req, clone));
        }
        return res;
      });
    })
  );
});