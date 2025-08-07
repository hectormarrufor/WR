import db from '@/models';
import { NextResponse } from 'next/server';
import { Op } from 'sequelize';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo');
    const codigoParte = searchParams.get('codigoParte');
    const grupoId = searchParams.get('grupoId'); // ✨ Nuevo parámetro de filtro

    try {
        const whereClause = {};

        if (tipo) {
            whereClause.tipo = tipo;
        }
        if (codigoParte) {
            whereClause.codigoParte = codigoParte;
        }
        if (grupoId) {
            whereClause.grupoCompatibilidadId = grupoId; // ✨ Añadimos el filtro por grupo
        }

        const consumibles = await db.Consumible.findAll({
            where: whereClause,
            order: [['nombre', 'ASC']]
        });
        return NextResponse.json(consumibles);
    } catch (error) {
        console.error("Error al obtener consumibles:", error);
        return NextResponse.json({ message: 'Error al obtener consumibles' }, { status: 500 });
    }
}

export async function POST(request) {
    const transaction = await db.sequelize.transaction();
    try {
        const data = await request.json();
        console.log(`\x1b[44m data: ${JSON.stringify(data)} \x1b[0m`);
        const {compatibilidades, ...consumible} = data
        const nuevoConsumible = await db.Consumible.create(consumible, { transaction });
        console.log(`\x1b[42m CONSUMIBLE CREADO \x1b[0m`);
        if (compatibilidades && Array.isArray(compatibilidades) && compatibilidades.length > 0) {
            // Extraemos solo los IDs de los modelos que se van a asociar.
            const modelosIds = compatibilidades.map(comp => comp.modeloId);
            
            // Usamos el mixin 'setModelosCompatibles' que Sequelize nos da.
            // Este método crea todas las entradas necesarias en la tabla intermedia.
            await nuevoConsumible.setModelosCompatibles(modelosIds, { transaction });
        }
        await transaction.commit();
        return NextResponse.json(nuevoConsumible, { status: 201 });
    } catch (error) {
        console.log(`\x1b[41m ERROR: error al crear el consumible: ${error.message} \x1b[0m`);
        return NextResponse.json({ message: error.message }, { status: 400 });
    }
}