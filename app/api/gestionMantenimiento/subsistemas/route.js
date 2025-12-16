import { NextResponse } from 'next/server';
import sequelize from '@/sequelize';
import { 
    Subsistema, 
    Activo, 
    SubsistemaInstancia,
    VehiculoInstancia,
    RemolqueInstancia,
    MaquinaInstancia
} from '@/models';

export async function POST(request) {
    const t = await sequelize.transaction();

    try {
        const body = await request.json();
        
        // 1. Datos del nuevo Subsistema (Plantilla)
        // Recibimos: nombre ("Sistema Hidráulico"), plantillaId (ID del Iveco), tipoPlantilla ("Vehiculo")
        const { nombre, descripcion, plantillaId, tipoPlantilla } = body;

        // 2. Crear la Plantilla del Subsistema
        let nuevoSubsistemaData = {
            nombre,
            descripcion
        };

        // Asignamos el ID foráneo correcto según el tipo
        if (tipoPlantilla === 'Vehiculo') nuevoSubsistemaData.vehiculoId = plantillaId;
        else if (tipoPlantilla === 'Remolque') nuevoSubsistemaData.remolqueId = plantillaId;
        else if (tipoPlantilla === 'Maquina') nuevoSubsistemaData.maquinaId = plantillaId;

        const nuevoSubsistema = await Subsistema.create(nuevoSubsistemaData, { transaction: t });

        // ---------------------------------------------------------
        // 3. LA MAGIA DE LA CASCADA (Propagación a Activos Existentes)
        // ---------------------------------------------------------
        
        // A. Buscar todos los Activos que sean de este modelo (plantillaId)
        let whereCondition = {};
        
        if (tipoPlantilla === 'Vehiculo') {
            // Buscamos activos que tengan un vehiculoInstancia, y ese vehiculoInstancia sea del modelo plantillaId
            const instancias = await VehiculoInstancia.findAll({ 
                where: { vehiculoId: plantillaId },
                attributes: ['id'], // Solo necesitamos el ID de la instancia hija
                transaction: t
            });
            const idsHijos = instancias.map(i => i.id);
            if (idsHijos.length > 0) {
                whereCondition = { vehiculoInstanciaId: idsHijos };
            }
        } 
        else if (tipoPlantilla === 'Remolque') {
            const instancias = await RemolqueInstancia.findAll({ 
                where: { remolqueId: plantillaId },
                attributes: ['id'],
                transaction: t
            });
            const idsHijos = instancias.map(i => i.id);
            if (idsHijos.length > 0) {
                whereCondition = { remolqueInstanciaId: idsHijos };
            }
        }
        else if (tipoPlantilla === 'Maquina') {
            const instancias = await MaquinaInstancia.findAll({ 
                where: { maquinaId: plantillaId },
                attributes: ['id'],
                transaction: t
            });
            const idsHijos = instancias.map(i => i.id);
            if (idsHijos.length > 0) {
                whereCondition = { maquinaInstanciaId: idsHijos };
            }
        }

        // B. Obtenemos los IDs de los ACTIVOS padres
        const activosAfectados = await Activo.findAll({
            where: whereCondition,
            attributes: ['id'],
            transaction: t
        });

        // C. Crear los SubsistemaInstancia (Huecos vacíos) para cada Activo encontrado
        if (activosAfectados.length > 0) {
            const nuevasInstanciasSubsistema = activosAfectados.map(activo => ({
                activoId: activo.id,
                subsistemaId: nuevoSubsistema.id,
                estado: 'Operativo',
                fechaUltimoMantenimiento: new Date()
            }));

            await SubsistemaInstancia.bulkCreate(nuevasInstanciasSubsistema, { transaction: t });
        }

        await t.commit();

        return NextResponse.json({ 
            success: true, 
            message: `Subsistema creado y propagado a ${activosAfectados.length} activos existentes.`,
            data: nuevoSubsistema 
        }, { status: 201 });

    } catch (error) {
        await t.rollback();
        console.error("Error creando subsistema:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}