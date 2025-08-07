import db from '@/models';
import { NextResponse } from 'next/server';

export async function POST(request) {
    const transaction = await db.sequelize.transaction();
    try {
        const body = await request.json();
        const {
            activoId,
            userId,
            kilometrajeActual,
            horometroActual,
            observacionesGenerales,
            hallazgosReportados
        } = body;

        if (!activoId || !userId || !kilometrajeActual) {
            throw new Error('Faltan datos requeridos.');
        }

        let nuevoKmId = null;
        let nuevoHorometroId = null;

        if (kilometrajeActual) {
            const nuevoKm = await db.Kilometraje.create({ activoId, valor: kilometrajeActual }, { transaction });
            nuevoKmId = nuevoKm.id;
        }
        if (horometroActual) {
            const nuevoHorometro = await db.Horometro.create({ activoId, valor: horometroActual }, { transaction });
            nuevoHorometroId = nuevoHorometro.id;
        }

        if (!nuevoKmId && !nuevoHorometroId) {
            throw new Error('Debe registrar al menos un kilometraje o horómetro.');
        }
        else {
            console.log('Kilometraje o Horómetro registrado:', { nuevoKmId, nuevoHorometroId });
        }

        let nuevoEstadoActivo = 'Operativo';
        if (hallazgosReportados && hallazgosReportados.length > 0) {
            if (hallazgosReportados.some(h => h.severidad === 'Critico')) {
                nuevoEstadoActivo = 'No Operativo';
            } else if (hallazgosReportados.some(h => h.severidad === 'Advertencia')) {
                nuevoEstadoActivo = 'Advertencia';
            }
        }

        await db.Activo.update(
            { estadoOperativo: nuevoEstadoActivo },
            { where: { id: activoId }, transaction }
        );

        const nuevaInspeccion = await db.Inspeccion.create({
            activoId,
            inspectorId: userId,
            kilometrajeId: nuevoKmId,
            horometroId: nuevoHorometroId,
            observacionesGenerales
        }, { transaction });

        if (hallazgosReportados && hallazgosReportados.length > 0) {
            const hallazgosParaCrear = hallazgosReportados.map(h => ({
                ...h,
                activoId,
                inspeccionId: nuevaInspeccion.id,
                origen: 'Manual',
                estado: 'Pendiente',
            }));
            await db.Hallazgo.bulkCreate(hallazgosParaCrear, { transaction });
        }

        await transaction.commit();
        return NextResponse.json({
            message: 'Inspección guardada y estado del activo actualizado.',
            inspeccion: nuevaInspeccion,
            hallazgosCreados: hallazgosReportados?.length || 0
        }, { status: 201 });

    } catch (error) {
        await transaction.rollback();
        console.error("Error al crear inspección:", error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}