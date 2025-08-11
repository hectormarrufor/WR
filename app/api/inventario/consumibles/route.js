import db from '@/models';
import { NextResponse } from 'next/server';
import { Op } from 'sequelize';

/**
 * GET para obtener una lista de consumibles con filtros avanzados.
 * Puede filtrar por: tipo, codigoParte, grupoId, y/o especificaciones (JSON).
 */
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo');
    const codigoParte = searchParams.get('codigoParte');
    const grupoId = searchParams.get('grupoId');
    const especificacionesQuery = searchParams.get('especificaciones');

    try {
        const whereClause = {};

        // Filtro por tipo (ej: 'Aceite', 'Filtro')
        if (tipo) {
            whereClause.tipo = tipo;
        }
        // Filtro por código de parte exacto
        if (codigoParte) {
            whereClause.codigoParte = codigoParte;
        }
        // Filtro por grupo de compatibilidad
        if (grupoId) {
            whereClause.grupoCompatibilidadId = grupoId;
        }

        // ✨ LÓGICA UNIFICADA: Filtro por propiedades dentro del JSONB 'especificaciones' ✨
        if (especificacionesQuery) {
            try {
                const especificaciones = JSON.parse(especificacionesQuery);
                // Por cada propiedad en el objeto, añadimos una condición a la consulta
                // Sequelize es lo suficientemente inteligente para buscar dentro del JSONB
                for (const key in especificaciones) {
                    // Esto se traduce a una consulta como: WHERE especificaciones->>'viscosidad' = '15W40'
                    whereClause[`especificaciones.${key}`] = especificaciones[key];
                }
            } catch (e) {
                console.error("Error al parsear el JSON de especificaciones:", e);
                // Ignoramos el filtro si el JSON es inválido
            }
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

/**
 * POST para crear un nuevo consumible.
 */
export async function POST(request) {
    const transaction = await db.sequelize.transaction();
    try {
        const body = await request.json();
        const { compatibilidades, ...consumibleData } = body;
        
        const nuevoConsumible = await db.Consumible.create(consumibleData, { transaction });

        if (compatibilidades && Array.isArray(compatibilidades) && compatibilidades.length > 0) {
            const modelosIds = compatibilidades.map(comp => comp.modeloId);
            await nuevoConsumible.setModelosCompatibles(modelosIds, { transaction });
        }
        
        await transaction.commit();
        return NextResponse.json(nuevoConsumible, { status: 201 });
    } catch (error) {
        await transaction.rollback();
        console.error("Error al crear el consumible:", error);
        return NextResponse.json({ message: error.message }, { status: 400 });
    }
}