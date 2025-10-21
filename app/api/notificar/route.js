import webpush from 'web-push';
import { PushSubscription } from '@/models'; // Sequelize: solo en server

export async function notificarAdmins(payload) {
  const subscripciones = await PushSubscription.findAll({
    where: { rol: 'admin', activo: true },
  });
  if( subscripciones.length === 0 ) {
    throw new Error('No hay subscripciones de administradores activas.');
  }

  for (const sub of subscripciones) {
    try {
      const subscription = {
        endpoint: sub.endpoint,
        keys: sub.keys, // Sequelize ya lo guarda como JSONB
      };

      await webpush.sendNotification(
        subscription,
        JSON.stringify({ ...payload, role: 'admin' })
      );
    } catch (err) {
      console.error('Error enviando notificación a admin:', err);

      // Opcional: marcar como inactiva si falla
      await sub.update({ activo: false });
    }
  }
}

