import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';
import { BackgroundSyncPlugin } from 'workbox-background-sync';

// Precaching
precacheAndRoute(self.__WB_MANIFEST);

// Control inmediato
self.skipWaiting();
self.clients.claim();

// 🔔 Notificaciones push solo para admins
self.addEventListener('push', event => {
  const data = event.data?.json() || {};
  if (data.role === 'admin') {
    self.registration.showNotification(data.title || 'Alerta administrativa', {
      body: data.body || 'Nuevo evento registrado',
      icon: data.icon || '/icon.png',
      data: data.url || '/',
    });
  }
});

// 🧭 Click en notificación → abrir URL
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// 🔄 Estrategia de caché para inspecciones con background sync
const bgSyncPlugin = new BackgroundSyncPlugin('inspecciones-queue', {
  maxRetentionTime: 24 * 60, // 24 horas
});

registerRoute(
  ({ url }) => url.pathname.startsWith('/api/inspecciones'),
  new NetworkFirst({
    cacheName: 'inspecciones-cache',
    plugins: [bgSyncPlugin],
  })
);

// 🧹 Limpieza de suscripciones huérfanas al cerrar sesión
self.addEventListener('message', event => {
  if (event.data === 'logout') {
    self.registration.pushManager.getSubscription().then(sub => {
      if (sub) sub.unsubscribe();
    });
  }
});