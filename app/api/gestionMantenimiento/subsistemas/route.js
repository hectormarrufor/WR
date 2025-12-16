import { NextResponse } from 'next/server';
import sequelize from '@/sequelize';
import { Subsistema, Activo, SubsistemaInstancia, VehiculoInstancia, RemolqueInstancia, MaquinaInstancia } from '@/models';

export async function POST(request) {
    const t = await sequelize.transaction();

    try {
        const body = await request.json();
        const { nombre, descripcion, plantillaId, tipoPlantilla } = body; // tipoPlantilla: 'Vehiculo', 'Remolque'...

        // 1. CREAR EL SUBSISTEMA EN LA PLANTILLA
        let dataCreacion = { nombre, descripcion };
        if (tipoPlantilla === 'Vehiculo') dataCreacion.vehiculoId = plantillaId;
        else if (tipoPlantilla === 'Remolque') dataCreacion.remolqueId = plantillaId;
        else if (tipoPlantilla === 'Maquina') dataCreacion.maquinaId = plantillaId;

        const nuevoSubsistema = await Subsistema.create(dataCreacion, { transaction: t });

        // 2. LÓGICA EXPLÍCITA: PROPAGACIÓN A ACTIVOS EXISTENTES (CASCADA)
        // Buscamos todos los activos que coincidan con esta plantilla y les inyectamos el nuevo sistema.

        let activosAfectados = [];

        if (tipoPlantilla === 'Vehiculo') {
            // Buscamos VehiculoInstancias de ese modelo, y traemos su Activo padre
            const instancias = await VehiculoInstancia.findAll({ 
                where: { vehiculoId: plantillaId },
                include: [{ model: Activo, as: 'activo' }],
                transaction: t 
            });
            activosAfectados = instancias.map(i => i.activo).filter(a => a); // Filtramos nulos por si acaso
        } else if (tipoPlantilla === 'Remolque') {
            const instancias = await RemolqueInstancia.findAll({ 
                where: { remolqueId: plantillaId },
                include: [{ model: Activo, as: 'activo' }],
                transaction: t 
            });
            activosAfectados = instancias.map(i => i.activo).filter(a => a);
        } else if (tipoPlantilla === 'Maquina') {
            const instancias = await MaquinaInstancia.findAll({ 
                where: { maquinaId: plantillaId },
                include: [{ model: Activo, as: 'activo' }],
                transaction: t 
            });
            activosAfectados = instancias.map(i => i.activo).filter(a => a);
        }

        // Insertamos masivamente
        if (activosAfectados.length > 0) {
            const nuevosHuecos = activosAfectados.map(activo => ({
                activoId: activo.id,
                subsistemaId: nuevoSubsistema.id,
                estado: 'Operativo'
            }));
            await SubsistemaInstancia.bulkCreate(nuevosHuecos, { transaction: t });
        }

        await t.commit();
        return NextResponse.json({ success: true, message: 'Subsistema creado y propagado.', data: nuevoSubsistema }, { status: 201 });

    } catch (error) {
        await t.rollback();
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}