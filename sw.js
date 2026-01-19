import { precacheAndRoute } from 'workbox-precaching';

// 1. Precacheo estándar de Workbox (Mantenlo siempre arriba)
precacheAndRoute(self.__WB_MANIFEST || []);

console.log('[SW] Service Worker cargado.');

// 2. CICLO DE VIDA: Forzar instalación y activación inmediata
// Esto es vital para que tus cambios de código (como este fix del click)
// se apliquen apenas el navegador detecte el nuevo archivo.
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando y saltando espera...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activando y reclamando control de clientes...');
  event.waitUntil(self.clients.claim());
});

// 3. EVENTO PUSH: Recibir y Mostrar
self.addEventListener('push', event => {
  // Parseo seguro del JSON
  const payload = event.data?.json?.() ?? { title: 'Notificación', body: event.data?.text() ?? 'Mensaje' };
  
  const title = payload.title || 'Transporte Dadica';
  
  const options = {
    body: payload.body || '',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/android-launchericon-96-96.png',
    
    // --- PERSISTENCIA DE DATOS ---
    // Guardamos la URL en 'data' para poder leerla luego en el click
    data: {
      url: payload.url || '/', // Prioridad a la propiedad 'url' en la raíz del payload
      ...payload.data
    },
    
    requireInteraction: payload.requireInteraction || false,
    tag: payload.tag,
    renotify: payload.renotify || false, // Para que vuelva a sonar si usas tags
    vibrate: [100, 50, 100], // Patrón de vibración (útil en Android)
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// 4. EVENTO CLICK: Navegación Inteligente (El FIX)
self.addEventListener('notificationclick', event => {
  console.log('[SW] Notificación clickeada');
  event.notification.close();

  // Obtenemos la URL cruda del payload
  const rawUrl = event.notification.data.url;

  if (!rawUrl) return;

  // Convertimos a URL absoluta para evitar errores de comparación
  // new URL() maneja bien si ya viene absoluta o si es relativa
  const urlToOpen = new URL(rawUrl, self.location.origin).href;

  const promiseChain = clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  }).then(windowClients => {
    
    // CASO A: Ya hay una pestaña de la App abierta
    // Buscamos cualquier cliente que pertenezca a nuestro origen (dominio)
    const matchingClient = windowClients.find(client => {
      return client.url.startsWith(self.location.origin) && 'focus' in client;
    });

    if (matchingClient) {
      console.log('[SW] Pestaña encontrada. Navegando a:', urlToOpen);
      // PRIMERO navegamos a la URL correcta, LUEGO enfocamos la ventana
      return matchingClient.navigate(urlToOpen).then(client => client.focus());
    }

    // CASO B: No hay pestaña abierta
    console.log('[SW] No hay pestaña abierta. Abriendo nueva:', urlToOpen);
    if (clients.openWindow) {
      return clients.openWindow(urlToOpen);
    }
  });

  event.waitUntil(promiseChain);
});