// utils/push.js
export async function suscribirsePush(vapidPublicKey) {
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: vapidPublicKey,
  });

  await fetch('/api/suscribir', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sub),
  });

  return sub;
}
export async function desuscribirsePush() {
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    await sub.unsubscribe();
    await fetch('/api/suscribir', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    });
  }
  return sub ? sub.endpoint : null;
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