import { NextResponse } from 'next/server';
import db from '../../../models';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeRenglones = searchParams.get('includeRenglones') === 'true';

    const includeOptions = [];
    if (includeRenglones) {
      includeOptions.push({
        model: db.RenglonContrato,
        as: 'renglones',
      });
    }

    const contratos = await db.ContratoServicio.findAll({
      include: [
        ...includeOptions,
        {
          model: db.Cliente,
          as: 'cliente',
          // attributes: ['nombreCompleto']
        }],
      order: [['fechaInicio', 'DESC']],
    });
    return NextResponse.json(contratos);
  } catch (error) {
    console.error('Error fetching contratos:', error);
    return NextResponse.json({ message: 'Error al obtener contratos', error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { hasAnticipo, montoAnticipo, cuentaAnticipoId, ...contratoData } = body;

    // Convertir fechas a formato de cadena YYYY-MM-DD si vienen como objetos Date
    // y asegurar que montoEstimado sea un número flotante
    const payloadContrato = {
      ...contratoData,
      fechaInicio: contratoData.fechaInicio ? new Date(contratoData.fechaInicio).toISOString().split('T')[0] : null,
      fechaFinEstimada: contratoData.fechaFinEstimada ? new Date(contratoData.fechaFinEstimada).toISOString().split('T')[0] : null,
      montoEstimado: parseFloat(contratoData.montoEstimado),
      renglones: contratoData.renglones.map(renglon => ({
        ...renglon,
        fechaInicioEstimada: renglon.fechaInicioEstimada ? new Date(renglon.fechaInicioEstimada).toISOString().split('T')[0] : null,
        fechaFinEstimada: renglon.fechaFinEstimada ? new Date(renglon.fechaFinEstimada).toISOString().split('T')[0] : null,
      })),
    };

    // Crear el contrato de servicio
    const nuevoContrato = await db.ContratoServicio.create(payloadContrato, {
      include: [{
        model: db.RenglonContrato,
        as: 'renglones'
      }],
      transaction
    });

    // Si se indicó un anticipo, crear el movimiento de tesorería
    if (hasAnticipo && parseFloat(montoAnticipo) > 0 && cuentaAnticipoId) {
      const movimientoTesoreriaPayload = {
        monto: parseFloat(montoAnticipo),
        moneda: 'USD', // Asegúrate de que la moneda sea correcta, o hazla dinámica
        tipoMovimiento: 'Ingreso',
        categoria: 'Venta Servicio',
        descripcion: `Anticipo de pago para Contrato N° ${nuevoContrato.numeroContrato}`,
        cuentaDestinoId: parseInt(cuentaAnticipoId),
        contratoServicioId: nuevoContrato.id, // Enlazar al contrato recién creado
        fechaMovimiento: new Date(), // Fecha actual del movimiento
      };

      // Crear el movimiento de tesorería
      await db.MovimientoTesoreria.create(movimientoTesoreriaPayload, { transaction });
    }

    await transaction.commit(); // Confirmar la transacción si todo fue bien
    return NextResponse.json(nuevoContrato, { status: 201 });

  } catch (error) {
    await transaction.rollback(); // Revertir la transacción si algo falla
    console.error('Error al registrar contrato o anticipo:', error);
    return NextResponse.json({ message: 'Error al registrar contrato o anticipo', error: error.message }, { status: 400 });
  }
}
