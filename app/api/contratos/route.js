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
    const {renglones, ...contratoData} = await request.json();
    console.log(contratoData)
    console.log("renglones: ",renglones)
    
    // return NextResponse.json({ error: 'probando' }, { status: 500 });
    // Crear el contrato
    const nuevoContrato = await db.ContratoServicio.create(contratoData);

    // Crear los renglones asociados al nuevo contrato
    if (renglones && renglones.length > 0) {
      const renglonesConContratoId = renglones.map(renglon => ({
        ...renglon,
        contratoId: nuevoContrato.id,
      }));
      await db.RenglonContrato.bulkCreate(renglonesConContratoId);
    }

    return NextResponse.json(nuevoContrato, { status: 201 });
  } catch (error) {
    console.error('Error al registrar contrato:', error);
    return NextResponse.json({ error: 'Error interno del servidor al registrar contrato', details: error.message }, { status: 500 });
  }
}