// utils/push.js
export async function suscribirsePush(fetched) {
  try {
    // Esperar a que el SW esté listo
    const reg = await navigator.serviceWorker.ready;

    // Crear suscripción push
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    });

    if (sub.endpoint.includes('wns2-ch1p.notify.windows.com')) {
      console.warn('Suscripción WNS no soportada');
      return;
    }


    // Enviar suscripción al backend junto con datos del usuario
    await fetch('/api/suscribir', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        suscripcion: sub,
        usuarioId: fetched?.id,
        rol: fetched?.isAdmin ? 'admin' : (fetched?.rol || 'user'),
        navegador: navigator.userAgent,
      }),
    });

    return sub;
  } catch (e) {
    console.error('Push subscribe failed', e);
    throw e; // opcional: relanzar para manejarlo fuera
  }
}
export async function desuscribirsePush() {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service workers no disponibles');
    return null;
  }
  console.log("hay service worker");
  try {
    console.log('navigator.serviceWorker.controller:', navigator.serviceWorker.controller);
    console.log('navigator.serviceWorker.ready:', navigator.serviceWorker.ready);

    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    console.log("pase de obtener la suscripcion")
    if (sub) {
      try {
        await sub.unsubscribe();
        await fetch('/api/suscribir', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        console.log('Desuscripción push exitosa');
        return sub.endpoint;
      } catch (err) {
        console.error('Error al desuscribir push:', err.message);
      }
    }
    else {
      console.log('No hay suscripción push activa para desuscribir.');
    }
  }
  catch (e) {
    console.error("error en desuscribirsePush", e);
  }

  return null;
}

export async function pedirPermisoPush() {
  if (!('Notification' in window)) {
    console.warn('Este navegador no soporta notificaciones.');
    return;
  }
  if (Notification.permission === 'default') {
    const permiso = await Notification.requestPermission();
    if (permiso === 'granted') {
      console.log('Permiso de notificaciones concedido.');
    }
  } else if (Notification.permission === 'denied') {
    console.warn('Las notificaciones están bloqueadas. Revisa los permisos del navegador.');
  }
}