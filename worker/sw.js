console.log('[SW personalizado] cargado');


self.addEventListener('push', event => {
  const data = event.data?.text() || 'Sin contenido';
  event.waitUntil(
    self.registration.showNotification('Notificación', {
      body: data,
      icon: '/icon.png',
    })
  );
});