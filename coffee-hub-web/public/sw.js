const STATIC_CACHE = 'coffee-hub-static-v1';
const NOTIFICATION_ICON = '/icon-192.png';
const NOTIFICATION_BADGE = '/icon-192.png';
const APP_SHELL = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(keys.filter(key => key !== STATIC_CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

const shouldHandleRequest = request => {
  if (request.method !== 'GET') return false;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;
  if (url.pathname.startsWith('/api/')) return false;

  return true;
};

self.addEventListener('fetch', event => {
  const { request } = event;
  if (!shouldHandleRequest(request)) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            void caches.open(STATIC_CACHE).then(cache => cache.put('/', copy));
          }
          return response;
        })
        .catch(async () => (await caches.match(request)) || (await caches.match('/')) || Response.error()),
    );
    return;
  }

  if (!['document', 'style', 'script', 'worker', 'font', 'image'].includes(request.destination)) {
    return;
  }

  event.respondWith(
    caches.match(request).then(cachedResponse => {
      const networkResponse = fetch(request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            void caches.open(STATIC_CACHE).then(cache => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cachedResponse || Response.error());

      return cachedResponse || networkResponse;
    }),
  );
});

const parsePushPayload = event => {
  if (!event.data) {
    return null;
  }

  try {
    const rawPayload = event.data.json();
    const data = rawPayload?.data && typeof rawPayload.data === 'object'
      ? rawPayload.data
      : rawPayload;

    const title = `${data?.title || rawPayload?.notification?.title || 'COFFEE-HUB'}`.trim();
    const body = `${data?.body || rawPayload?.notification?.body || ''}`.trim();
    const url = `${data?.url || rawPayload?.fcmOptions?.link || '/'}`.trim() || '/';
    const tag = `${data?.tag || data?.collapseKey || 'coffee-hub-notification'}`.trim();

    return {
      title,
      options: {
        body,
        badge: NOTIFICATION_BADGE,
        data: {
          url,
        },
        icon: NOTIFICATION_ICON,
        renotify: false,
        requireInteraction: false,
        tag,
      },
    };
  } catch (error) {
    console.error('Failed to parse push payload', error);
    return null;
  }
};

self.addEventListener('push', event => {
  const payload = parsePushPayload(event);
  if (!payload) {
    return;
  }

  event.waitUntil(self.registration.showNotification(payload.title, payload.options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();

  const targetUrl = event.notification?.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }

      return undefined;
    }),
  );
});
