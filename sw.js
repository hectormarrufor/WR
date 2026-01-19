import { precacheAndRoute } from 'workbox-precaching';

// 1. Precacheo
precacheAndRoute(self.__WB_MANIFEST || []);

// 2. Control Inmediato (Obligatorio para recuperar el control)
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// 3. PUSH (Simplificado)
self.addEventListener('push', event => {
  const payload = event.data?.json?.() ?? {};
  
  const title = payload.title || 'Transporte Dadica';
  // Aseguramos que SIEMPRE haya una URL válida
  const url = payload.url || self.location.origin;

  const options = {
    body: payload.body || 'Nueva notificación',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/android-launchericon-96-96.png',
    data: { url: url }, // Guardamos la URL simple
    requireInteraction: true // Para que te de tiempo de ver qué pasa
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// 4. CLICK (Modo "Solo abre la maldita ventana")
self.addEventListener('notificationclick', event => {
  event.notification.close();

  // Recuperamos la URL
  let urlToOpen = event.notification.data?.url;

  // Si por alguna razón viene vacía, mandamos al Home
  if (!urlToOpen) {
    urlToOpen = self.location.origin;
  }

  // Aseguramos que sea absoluta
  const absoluteUrl = new URL(urlToOpen, self.location.origin).href;

  // Lógica SUPER SIMPLE: Solo abre una ventana nueva.
  // Quitamos la lógica de buscar pestañas existentes porque ahí es donde suele fallar
  // si el navegador se confunde de 'client'.
  event.waitUntil(
    clients.openWindow(absoluteUrl)
  );
});