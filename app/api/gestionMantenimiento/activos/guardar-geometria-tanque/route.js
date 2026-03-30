import { NextResponse } from 'next/server';
import sequelize from '@/sequelize';
import { Activo, Vehiculo, Maquina, Remolque } from '@/models';

export async function POST(request) {
    const t = await sequelize.transaction();

    try {
        // Añadimos capacidadNeta para actualizar el campo plano del Activo
        const { activoId, configuracionTanque, propagateToTemplate, capacidadNeta } = await request.json();

        if (!activoId || !configuracionTanque) {
            return NextResponse.json({ success: false, error: 'Faltan datos obligatorios' }, { status: 400 });
        }

        const activo = await Activo.findByPk(activoId, { transaction: t });
        
        if (!activo) {
            return NextResponse.json({ success: false, error: 'Activo no encontrado' }, { status: 404 });
        }

        if (propagateToTemplate) {
            // 🔥 MULTIPLEXOR POLIMÓRFICO: Detectar la plantilla correcta 🔥
            if (activo.vehiculoId) {
                await Vehiculo.update(
                    { configuracionTanque, capacidadTanqueEstandar: capacidadNeta },
                    { where: { id: activo.vehiculoId }, transaction: t }
                );
                await Activo.update({ configuracionTanque: null }, { where: { vehiculoId: activo.vehiculoId }, transaction: t });
            } 
            else if (activo.maquinaId) {
                await Maquina.update(
                    { configuracionTanque, capacidadTanqueEstandar: capacidadNeta },
                    { where: { id: activo.maquinaId }, transaction: t }
                );
                await Activo.update({ configuracionTanque: null }, { where: { maquinaId: activo.maquinaId }, transaction: t });
            } 
            else if (activo.remolqueId) {
                await Remolque.update(
                    { configuracionTanque, capacidadTanqueEstandar: capacidadNeta },
                    { where: { id: activo.remolqueId }, transaction: t }
                );
                await Activo.update({ configuracionTanque: null }, { where: { remolqueId: activo.remolqueId }, transaction: t });
            } 
            else {
                throw new Error('El activo no está vinculado a ninguna plantilla válida.');
            }

            // Actualizamos la capacidad plana del activo en uso para que 'cargar' la vea
            activo.capacidadTanque = capacidadNeta;
            await activo.save({ transaction: t });

        } else {
            // 🔥 GUARDAR SOLO EN ACTIVO (Aftermarket) 🔥
            activo.configuracionTanque = configuracionTanque;
            activo.capacidadTanque = capacidadNeta;
            await activo.save({ transaction: t });
        }

        await t.commit();

        return NextResponse.json({ 
            success: true, 
            message: propagateToTemplate 
                ? 'Geometría propagada exitosamente a todos los equipos de este modelo.'
                : 'Geometría guardada exclusivamente en este equipo (Aftermarket).' 
        });

    } catch (error) {
        await t.rollback();
        console.error("Error guardando geometría del tanque:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}