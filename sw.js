import { precacheAndRoute } from 'workbox-precaching';
precacheAndRoute(self.__WB_MANIFEST || []);

console.log('[SW personalizado] cargado');


// service-worker.js
self.skipWaiting();
self.addEventListener('activate', () => self.clients.claim());

self.addEventListener('push', event => {
  const payload = event.data?.json?.() ?? { title: 'Notificación', body: event.data?.text() ?? 'Mensaje' };
  const title = payload.title || 'Notificación';
  const options = {
    body: payload.body || '',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/android-launchericon-96-96.png',

    data: {
      url: payload.url || '/', // Tomamos la URL del nivel raíz del JSON
      ...payload.data          // Mantenemos cualquier otra data extra si existiera
    },
    requireInteraction: payload.requireInteraction || false,
    tag: payload.tag,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  // Close the notification immediately after clicking
  event.notification.close();

  // Retrieve the URL from the data object sent in the payload
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if a tab with the same origin is already open
      for (const client of windowClients) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      // If no tab is open, open a new window to the target URL
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});