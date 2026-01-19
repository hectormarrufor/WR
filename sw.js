import { precacheAndRoute } from 'workbox-precaching';
precacheAndRoute(self.__WB_MANIFEST || []);

console.log('[SW personalizado] cargado');


// service-worker.js
self.skipWaiting();
self.addEventListener('activate', () => self.clients.claim());

self.addEventListener('notificationclick', event => {
  console.log('[SW] Notificación clickeada:', event.notification);
  event.notification.close();

  // 1. Obtener la URL cruda (puede ser relativa o absoluta)
  const rawUrl = event.notification.data.url || '/';

  // 2. Convertir SIEMPRE a absoluta usando el origen actual
  // Esto arregla problemas si rawUrl es solo "/admin"
  const absoluteUrl = new URL(rawUrl, self.location.origin).href;

  // 3. Abrir
  event.waitUntil(clients.openWindow(absoluteUrl));
});