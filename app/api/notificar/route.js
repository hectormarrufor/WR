import webpush from 'web-push';
import { PushSubscription } from '@/models'; // Sequelize: solo en server

export async function notificarAdmins(payload) {
  const subscripciones = await PushSubscription.findAll({
    where: { rol: 'admin', activo: true },
  });
  
  if( subscripciones.length === 0 ) {
    throw new Error('No hay subscripciones de administradores activas.');
  }
  else {
    console.log(`\x1b[42m [INFO]: Enviando notificación a ${subscripciones.length} administradores. \x1b[0m`);
    console.log(subscripciones);
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
        console.log(`\x1b[42m [INFO]: Notificación enviada a admin: ${sub.usuarioId} \x1b[0m`);
    } catch (err) {
      console.error('Error enviando notificación a admin:', err);

      // Opcional: marcar como inactiva si falla
      await sub.update({ activo: false });
    }
  }
}

