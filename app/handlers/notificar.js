// utils/notificar.js
import webpush from 'web-push';
import { PushSubscription } from '@/models';


export async function notificar({ title, body, icon = '/icons/icon-192x192.png' }) {
  if (!('Notification' in window)) {
    console.warn('Este navegador no soporta notificaciones.');
    return;
  }

  if (Notification.permission === 'granted') {
    new Notification(title, { body, icon });
  } else if (Notification.permission !== 'denied') {
    const permiso = await Notification.requestPermission();
    if (permiso === 'granted') {
      new Notification(title, { body, icon });
    } else {
      console.warn('Permiso de notificación denegado.');
    }
  } else {
    console.warn('Las notificaciones están bloqueadas. Revisa los permisos del navegador.');
  }
}

export const pedirPermiso = async () => {
  const permiso = await Notification.requestPermission();
  if (permiso === 'granted') {
    console.log('Permiso concedido');
  }
};

export async function notificarAdmins(payload) {
  const subscripciones = await PushSubscription.findAll({
    where: { rol: 'admin' },
  });

  for (const sub of subscripciones) {
    try {
      const parsed = JSON.parse(sub.suscripcion);
      await webpush.sendNotification(parsed, JSON.stringify({
        ...payload,
        role: 'admin',
      }));
    } catch (e) {
      console.error('Error enviando notificación a admin:', e);
    }
  }
}

