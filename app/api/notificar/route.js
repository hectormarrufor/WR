import webpush from 'web-push';
import { PushSubscription } from '@/models'; // Sequelize: solo en server

// Configurar VAPID (debe coincidir con el cliente)
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
webpush.setVapidDetails(
  'mailto: hectormmarrufor@gmail.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

export async function notificarAdmins(payload) {
  const subscripciones = await PushSubscription.findAll({
    where: { rol: 'admin', activo: true },
  });
  
  if( subscripciones.length === 0 ) {
    console.warn('No hay subscripciones de administradores activas.');
    return;
  }
  else {
    console.log(`\x1b[42m [INFO]: Enviando notificación a ${subscripciones.length} administradores. \x1b[0m`);
  }

  for (const sub of subscripciones) {
    try {
      const subscription = {
        endpoint: sub.endpoint,
        keys: sub.keys, // Sequelize ya lo guarda como JSONB
      };

      await webpush.sendNotification(
        subscription,   
        JSON.stringify({ ...payload, role: 'admin', icon: "/icons/Icon-192x192.png", badge: "/icons/android-launchericon-96-96.png" })
      );
        console.log(`\x1b[42m [INFO]: Notificación enviada a admin: ${sub.usuarioId} \x1b[0m`);
    } catch (err) {
      console.error('Error enviando notificación a admin:', err);

      // Opcional: marcar como inactiva si falla
      await sub.update({ activo: false });
    }
  }
}

export async function notificarUsuario(usuarioId, payload) {
  const subscripciones = await PushSubscription.findAll({
    where: { usuarioId, activo: true },
  });
  if( subscripciones.length === 0 ) {
    console.warn(`No hay subscripciones activas para el usuario ${usuarioId}.`);
    return;
  }
  for (const sub of subscripciones) {
    try {
      const subscription = {
        endpoint: sub.endpoint,
        keys: sub.keys, // Sequelize ya lo guarda como JSONB
      };
      await webpush.sendNotification(
        subscription,
        JSON.stringify({ ...payload, role: 'user', icon: "/icons/Icon-192x192.png", badge: "/icons/android-launchericon-96-96.png" })
      );
      console.log(`\x1b[42m [INFO]: Notificación enviada a usuario: ${usuarioId} \x1b[0m`);
    }
    catch (err) {
      console.error(`Error enviando notificación a usuario ${usuarioId}:`, err);
      // Opcional: marcar como inactiva si falla
      await sub.update({ activo: false });
    } 
  }
}

export async function notificarTodos(payload) {
  const subscripciones = await PushSubscription.findAll({
    where: { activo: true },
  });
  console.log(`\x1b[42m [INFO]: Enviando notificación a ${subscripciones.length} usuarios. \x1b[0m`);
  for (const sub of subscripciones) {
    try {
      const subscription = {
        endpoint: sub.endpoint,
        keys: sub.keys, // Sequelize ya lo guarda como JSONB
      };
      await webpush.sendNotification(
        subscription,
        JSON.stringify({ ...payload, role: 'user', icon: "/icons/Icon-192x192.png", badge: "/icons/android-launchericon-96-96.png" })
      );
      console.log(`\x1b[42m [INFO]: Notificación enviada a usuario: ${sub.usuarioId} \x1b[0m`);
    }
    catch (err) {
      console.error(`Error enviando notificación a usuario ${sub.usuarioId}:`, err);
      // Opcional: marcar como inactiva si falla
      await sub.update({ activo: false });
    }
  }
}


