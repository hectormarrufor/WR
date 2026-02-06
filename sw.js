import { precacheAndRoute } from 'workbox-precaching';
precacheAndRoute(self.__WB_MANIFEST || []);

console.log('[SW personalizado] cargado');

// =================================================================
// CORRECCIÓN AGREGADA: BLINDAJE PARA LA API
// =================================================================
self.addEventListener('fetch', (event) => {
  // Si la petición va dirigida a la API o es un método POST (como generar-resumen),
  // le decimos al SW: "No toques esto, ve directo a internet".
  if (
    event.request.url.includes('/api/') || 
    event.request.method === 'POST'
  ) {
    event.respondWith(fetch(event.request));
    return;
  }
});
// =================================================================


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

// service-worker.js

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // URL destino (ej: /superuser/flota/activos/5)
  let urlToOpen = event.notification.data?.url;
  if (!urlToOpen) urlToOpen = '/superuser/dashboard'; // Default a dashboard si falla

  const targetUrl = new URL(urlToOpen, self.location.origin).href;

  const promiseChain = clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  }).then((windowClients) => {
    
    // A. App Abierta: Navegar directo (La cookie ya está ahí)
    const matchingClient = windowClients.find((client) => {
      return client.url.startsWith(self.location.origin) && 'focus' in client;
    });

    if (matchingClient) {
      return matchingClient.navigate(targetUrl).then((client) => client.focus());
    }

    // B. App Cerrada: Usar el truco del redirect_to
    if (clients.openWindow) {
      const safeTarget = encodeURIComponent(targetUrl);
      // Abrimos la raiz (que es pública o al menos carga el AuthGuard)
      const bootUrl = `/?redirect_to=${safeTarget}`;
      return clients.openWindow(bootUrl);
    }
  });

  event.waitUntil(promiseChain);
});