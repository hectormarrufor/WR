// app/api/suscribir/route.js
import db from '@/models';
import { QueryInterface } from 'sequelize';

export async function POST(req) {
  const body = await req.json();
  const { suscripcion, usuarioId, rol } = body;
  await QueryInterface.dropTable('PushSubscriptions');
  await db.PushSubscription.upsert({
    endpoint: suscripcion.endpoint,
    keys: suscripcion.keys,
    usuarioId: parseInt(usuarioId),
    rol,
    activo: true,
  });
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}
export async function DELETE(req) {
  const body = await req.json();
  const { endpoint } = body;
  await db.PushSubscription.update({ activo: false }, { where: { endpoint } });
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}