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

self.addEventListener('notificationclick', event => {
  console.log('[SW] Notificación clickeada:', event.notification);
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url || '/'));
});