import db from '@/models';
import { Op } from 'sequelize';


export async function DELETE() {
  try {

      await db.PushSubscription.destroy({
        where: {
          endpoint: {
            [Op.like]: '%fcm.googleapis.com%'
          }
        }
      });
  
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }
    catch (error) {
      console.error('Error deleting subscriptions:', error);
      return new Response(JSON.stringify({ error: 'Error deleting subscriptions' }), { status: 500 });
    }
}