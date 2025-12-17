import { NextResponse } from 'next/server';
import sequelize from '@/sequelize';
import { 
    Subsistema, Activo, SubsistemaInstancia, 
    VehiculoInstancia, RemolqueInstancia, MaquinaInstancia,
    ConsumibleRecomendado // <--- IMPORTANTE
} from '@/models';

// POST: Crear Subsistema + Propagación + Recomendaciones
export async function POST(request) {
    const t = await sequelize.transaction();

    try {
        const body = await request.json();
        const { 
            nombre, descripcion, plantillaId, tipoPlantilla,
            recomendacionesIds = [] // Array de IDs de consumibles [200, 201, 305]
        } = body;

        // 1. CREAR EL SUBSISTEMA (PLANTILLA)
        let dataCreacion = { nombre, descripcion };
        if (tipoPlantilla === 'Vehiculo') dataCreacion.vehiculoId = plantillaId;
        else if (tipoPlantilla === 'Remolque') dataCreacion.remolqueId = plantillaId;
        else if (tipoPlantilla === 'Maquina') dataCreacion.maquinaId = plantillaId;

        const nuevoSubsistema = await Subsistema.create(dataCreacion, { transaction: t });

        // 2. GUARDAR LAS RECOMENDACIONES (La "Dieta")
        if (recomendacionesIds.length > 0) {
            const recomendacionesData = recomendacionesIds.map(consumibleId => ({
                subsistemaId: nuevoSubsistema.id,
                consumibleId: consumibleId,
                cantidadRecomendada: 1 // Default, podrías pedirlo en el front si quisieras
            }));
            
            await ConsumibleRecomendado.bulkCreate(recomendacionesData, { transaction: t });
        }

        // 3. PROPAGACIÓN A ACTIVOS EXISTENTES (Igual que antes)
        // ... (Tu código de propagación que ya tenías y es correcto) ...
        let activosAfectados = [];
        if (tipoPlantilla === 'Vehiculo') {
            const instancias = await VehiculoInstancia.findAll({ 
                where: { vehiculoId: plantillaId },
                include: [{ model: Activo, as: 'activo' }],
                transaction: t 
            });
            activosAfectados = instancias.map(i => i.activo).filter(a => a);
        }
        // ... (Repetir para Remolque y Maquina) ...
        else if (tipoPlantilla === 'Remolque') {
            const instancias = await RemolqueInstancia.findAll({ 
                where: { remolqueId: plantillaId },
                include: [{ model: Activo, as: 'activo' }],
                transaction: t 
            });
            activosAfectados = instancias.map(i => i.activo).filter(a => a);
        }
        else if (tipoPlantilla === 'Maquina') {
            const instancias = await MaquinaInstancia.findAll({ 
                where: { maquinaId: plantillaId },
                include: [{ model: Activo, as: 'activo' }],
                transaction: t 
            });
            activosAfectados = instancias.map(i => i.activo).filter(a => a);
        }
        

        if (activosAfectados.length > 0) {
            const nuevosHuecos = activosAfectados.map(activo => ({
                activoId: activo.id,
                subsistemaId: nuevoSubsistema.id,
                estado: 'Operativo'
            }));
            await SubsistemaInstancia.bulkCreate(nuevosHuecos, { transaction: t });
        }

        await t.commit();
        return NextResponse.json({ success: true, data: nuevoSubsistema }, { status: 201 });

    } catch (error) {
        await t.rollback();
        console.error(error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}