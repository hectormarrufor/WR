import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { NetworkFirst, StaleWhileRevalidate, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

// 1. CONFIGURACIÓN BÁSICA
self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();

// 2. PRECACHE DE NEXT.JS (Archivos estáticos del Build)
// Esto descarga el JS, CSS y HTML básico para que la App Shell funcione offline.
precacheAndRoute(self.__WB_MANIFEST || []);

// 3. ESTRATEGIA DE NAVEGACIÓN (El arreglo del Bug)
// Para cualquier página HTML (rutas de navegación):
const navigationStrategy = new NetworkFirst({
  cacheName: 'pages-cache',
  networkTimeoutSeconds: 3, // SI EN 3 SEGUNDOS NO RESPONDE, USA CACHÉ
  plugins: [
    new ExpirationPlugin({
      maxEntries: 50,             // Guarda las últimas 50 páginas visitadas
      maxAgeSeconds: 30 * 24 * 60 * 60, // Por 30 días
    }),
  ],
});

// Registramos la ruta de navegación para que use la estrategia de arriba
registerRoute(new NavigationRoute(navigationStrategy));

// 4. ESTRATEGIA PARA IMÁGENES (Cache First)
// Si ya descargó una foto (ej: la del camión), no la vuelve a pedir.
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 24 * 60 * 60, // 60 días
      }),
    ],
  })
);

// 5. ESTRATEGIA PARA API/DATA (Stale While Revalidate)
// Muestra datos viejos rápido mientras busca los nuevos en el fondo.
// Útil para ver datos offline.
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 5,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 24 * 60 * 60, // 24 horas
      }),
    ],
  })
);

// -----------------------------------------------------------------
// LÓGICA DE NOTIFICACIONES PUSH (La que ya arreglamos)
// -----------------------------------------------------------------

self.addEventListener('push', (event) => {
  const payload = event.data?.json?.() ?? {};
  const title = payload.title || 'Transporte Dadica';
  // URL absoluta siempre para evitar errores
  const url = payload.url || self.location.origin;

  const options = {
    body: payload.body || 'Nueva notificación',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/android-launchericon-96-96.png',
    data: { url: url }, // Guardamos URL
    requireInteraction: payload.requireInteraction || false,
    tag: payload.tag,
    renotify: payload.renotify || false,
    vibrate: [100, 50, 100]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Click en notificación');
  event.notification.close();

  let urlToOpen = event.notification.data?.url;
  if (!urlToOpen) urlToOpen = self.location.origin;

  // Asegurar URL absoluta
  const absoluteUrl = new URL(urlToOpen, self.location.origin).href;

  const promiseChain = clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  }).then((windowClients) => {
    // 1. Buscar si ya está abierta
    const matchingClient = windowClients.find((client) => {
      return client.url.startsWith(self.location.origin) && 'focus' in client;
    });

    if (matchingClient) {
      // Navegar y enfocar
      return matchingClient.navigate(absoluteUrl).then((client) => client.focus());
    }

    // 2. Si no, abrir nueva
    if (clients.openWindow) {
      return clients.openWindow(absoluteUrl);
    }
  });

  event.waitUntil(promiseChain);
});