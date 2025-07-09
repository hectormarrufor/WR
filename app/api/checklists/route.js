import { NextResponse } from 'next/server';
import Checklist from '../../../models/checklist'; // tu instancia de Sequelize
import Vehiculo from '../../../models/vehiculo'; // tu instancia de Sequelize

export async function POST(req) {
  const body = await req.json();

  const {
    vehiculoId,
    kilometraje,    
    aceiteUltimoCambioKm,
    bombilloDelBaja,
    bombilloDelAlta,
    intermitenteDelFrizq,
    intermitenteDelFder,
    intermitenteLateral,
    bombilloTrasero,
    // ...otros campos del checklist
  } = body;

  // 1. Buscar ficha técnica del vehículo
  const vehiculo = await Vehiculo.findByPk(vehiculoId);
  if (!vehiculo) {
    return NextResponse.json({ error: 'Vehículo no encontrado' }, { status: 404 });
  }

  // 2. Calcular estado del aceite
  const intervalo = vehiculo.motor.aceite.intervaloCambioKm;
  const kmDesdeUltCambio = kilometraje - aceiteUltimoCambioKm;

  let aceiteEstado = 'OK';
  if (kmDesdeUltCambio >= intervalo) {
    aceiteEstado = 'Cambio requerido';
  } else if (kmDesdeUltCambio >= intervalo - 200) {
    aceiteEstado = 'Próximo a cambio';
  }

  // 3. Verificar bombillos rotos
  const bombillosRotos = [
    !bombilloDelBaja,
    !bombilloDelAlta,
    !intermitenteDelFrizq,
    !intermitenteDelFder,
    !intermitenteLateral,
    !bombilloTrasero,
  ];
  const necesitaRevisiónLuces = bombillosRotos.some(Boolean);

  // 4. Determinar estado global del vehículo
  let estadoVehiculo = 'OK';
  if (aceiteEstado === 'Próximo a cambio' || necesitaRevisiónLuces) {
    estadoVehiculo = 'Próximo a mantenimiento';
  }
  if (aceiteEstado === 'Cambio requerido') {
    estadoVehiculo = 'Mantenimiento urgente';
  }

  // 5. Crear el checklist
  const checklist = await Checklist.create({
    ...body,
    aceiteEstado,
  });

  // 6. Actualizar el estado y valores actuales en Vehículo
  await vehiculo.update({
    kilometraje,
    horometro: body.horometro,
    estado: estadoVehiculo,
  });

  // 7. Retornar respuesta
  return NextResponse.json({ checklist, estadoActualizado: estadoVehiculo });
}


export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const vehiculoId = searchParams.get('vehiculoId');

  if (!vehiculoId) {
    return NextResponse.json({ error: 'Falta el parámetro vehiculoId' }, { status: 400 });
  }

  const checklist = await Checklist.findOne({
    where: { vehiculoId },
    order: [['fecha', 'DESC']],
  });

  return NextResponse.json(checklist);
}