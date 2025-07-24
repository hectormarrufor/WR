import { NextResponse } from 'next/server';
import Inventario from '../../../../models/gestionMantenimiento/Inventario';
import Repuesto from '../../../../models/gestionMantenimiento/Repuesto';


// Obtener todo el inventario
export async function GET(request) {
  try {
    const inventario = await Inventario.findAll({
      include: [{ model: Repuesto, as: 'repuesto' }]
    });
    return NextResponse.json(inventario);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error al obtener el inventario', error: error.message }, { status: 500 });
  }
}

// Ajustar stock (añadir o quitar)
export async function POST(request) {
    try {
        const body = await request.json();
        // repuestoId: ID del repuesto a ajustar
        // cantidad: número positivo para añadir, negativo para descontar
        // ubicacion: opcional
        const { repuestoId, cantidad, ubicacion } = body;

        if (!repuestoId || !cantidad) {
            return NextResponse.json({ message: 'repuestoId y cantidad son requeridos' }, { status: 400 });
        }

        const item = await Inventario.findOne({ where: { repuestoId } });

        if (item) {
            // Si el item existe, actualiza la cantidad
            item.cantidad += cantidad;
            await item.save();
            return NextResponse.json(item);
        } else {
            // Si es un repuesto nuevo en el inventario, lo crea
            const nuevoItem = await Inventario.create({ repuestoId, cantidad, ubicacion });
            return NextResponse.json(nuevoItem, { status: 201 });
        }

    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: 'Error al ajustar el inventario', error: error.message }, { status: 500 });
    }
}