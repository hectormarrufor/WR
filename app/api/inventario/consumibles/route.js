// app/api/superuser/inventario/consumibles/route.js
import { NextResponse } from 'next/server';
import { Op } from 'sequelize';
import db from '../../../../models';


export async function POST(request) {
  try {
    const body = await request.json();
    const { nombre, descripcion, unidadMedida, stockMinimo, ubicacionAlmacen } = body;

    // Validación básica de campos requeridos
    if (!nombre || !unidadMedida || stockMinimo === undefined || stockMinimo === null) {
      return NextResponse.json({ message: 'Nombre, unidad de medida y stock mínimo son requeridos.' }, { status: 400 });
    }

    // Asegurarse de que stockMinimo sea un número válido
    const parsedStockMinimo = parseFloat(stockMinimo);
    if (isNaN(parsedStockMinimo) || parsedStockMinimo < 0) {
      return NextResponse.json({ message: 'El stock mínimo debe ser un número válido y no negativo.' }, { status: 400 });
    }

    // Crear el nuevo consumible. stockActual se inicializa en 0.00
    const nuevoConsumible = await db.Consumible.create({
      nombre,
      descripcion,
      unidadMedida,
      stockActual: 0.00, // Siempre inicializar stock en 0, se actualiza con Entradas/Salidas
      stockMinimo: parsedStockMinimo,
      ubicacionAlmacen,
      precioUnitarioPromedio: 0.00, // Se actualizará al registrar entradas con precio
    });

    return NextResponse.json(nuevoConsumible, { status: 201 });
  } catch (error) {
    console.error('Error creando consumible:', error);
    // Errores de validación de Sequelize (ej. unique constraints) pueden ser más específicos
    if (error.name === 'SequelizeUniqueConstraintError') {
      return NextResponse.json({ message: 'El nombre del consumible ya existe.', error: error.message }, { status: 409 });
    }
    return NextResponse.json({ message: 'Error al crear consumible', error: error.message }, { status: 400 });
  }
}

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('query'); // Para búsquedas
        const stockBajo = searchParams.get('stockBajo'); // Para filtrar por stock bajo

        const whereClause = {};
        if (query) {
            whereClause[Op.or] = [
                { nombre: { [Op.like]: `%${query}%` } },
                { descripcion: { [Op.like]: `%${query}%` } },
            ];
        }
        
        // Filtro para mostrar solo consumibles con stock bajo
        if (stockBajo === 'true') {
          // Asegúrate de que stockActual y stockMinimo sean comparables numéricamente
          // En PostgreSQL/MySQL, esto funciona si son FLOAT/DECIMAL
          whereClause.stockActual = { [Op.lte]: db.sequelize.col('stockMinimo') };
        }


        const consumibles = await db.Consumible.findAll({
            where: whereClause,
            order: [['nombre', 'ASC']],
        });
        return NextResponse.json(consumibles);
    } catch (error) {
        console.error('Error fetching consumibles:', error);
        return NextResponse.json({ message: 'Error al obtener consumibles', error: error.message }, { status: 500 });
    }
}