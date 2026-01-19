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

// service-worker.js

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notificación clickeada');
  event.notification.close();

  // 1. Obtenemos la URL destino (ej: /taller/ordenes/5050)
  let urlToOpen = event.notification.data?.url;
  if (!urlToOpen) urlToOpen = '/';

  // Aseguramos ruta absoluta para evitar errores
  const targetUrl = new URL(urlToOpen, self.location.origin).href;

  const promiseChain = clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  }).then((windowClients) => {
    
    // --- CASO A: La App ya está abierta (Hot Start) ---
    // Si encontramos una pestaña abierta, la usamos y navegamos directo.
    const matchingClient = windowClients.find((client) => {
      return client.url.startsWith(self.location.origin) && 'focus' in client;
    });

    if (matchingClient) {
      console.log('[SW] Pestaña encontrada. Navegando directo.');
      return matchingClient.navigate(targetUrl).then((client) => client.focus());
    }

    // --- CASO B: La App está cerrada (Cold Start) ---
    // AQUÍ ESTÁ EL TRUCO:
    // No abrimos 'targetUrl' directamente porque el Auth/Middleware podría bloquearnos.
    // Abrimos la raíz '/' y pasamos el destino como parámetro 'redirect_to'.
    if (clients.openWindow) {
      console.log('[SW] Abriendo app desde cero con instrucción de redirección.');
      
      // Codificamos la URL para que viajen seguros los caracteres especiales
      const safeTarget = encodeURIComponent(targetUrl);
      
      // La URL final será: https://tuapp.com/?redirect_to=https%3A%2F%2Ftuapp.com%2Ftaller%2Fordenes%2F5050
      const bootUrl = `/?redirect_to=${safeTarget}`;
      
      return clients.openWindow(bootUrl);
    }
  });

  event.waitUntil(promiseChain);
});