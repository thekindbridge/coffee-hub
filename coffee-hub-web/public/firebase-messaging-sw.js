const NOTIFICATION_ICON = '/icon-192.png';
const NOTIFICATION_BADGE = '/icon-192.png';

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
    const tag = `${data?.tag || 'coffee-hub-notification'}`.trim();

    return {
      title,
      options: {
        badge: NOTIFICATION_BADGE,
        body,
        data: { url },
        icon: NOTIFICATION_ICON,
        tag,
      },
    };
  } catch (error) {
    console.error('Failed to parse Firebase push payload', error);
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
    self.clients.matchAll({ includeUncontrolled: true, type: 'window' }).then(clientList => {
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
