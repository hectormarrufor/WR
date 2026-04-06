import { NextResponse } from 'next/server';
import sequelize from '@/sequelize';
import { Activo, Vehiculo, Maquina, Remolque, VehiculoInstancia, MaquinaInstancia, RemolqueInstancia } from '@/models';

export async function POST(request) {
    const t = await sequelize.transaction();

    try {
        const body = await request.json();
        const { activoId, configuracionTanque, propagateToTemplate, capacidadNeta } = body;

        // 🔥 ESCUDO VALIDATORIO 🔥
        const capacidadFinal = parseFloat(capacidadNeta);
        if (isNaN(capacidadFinal) || capacidadFinal <= 0) {
            throw new Error('El sistema no recibió una capacidad matemática válida desde el formulario frontal. Verifique las dimensiones.');
        }

        if (!activoId || !configuracionTanque) {
            throw new Error('Faltan datos obligatorios para guardar la geometría.');
        }

        // Buscamos el activo incluyendo sus instancias para mapear de dónde viene
        const activo = await Activo.findByPk(activoId, {
            include: [
                { model: VehiculoInstancia, as: 'vehiculoInstancia' },
                { model: MaquinaInstancia, as: 'maquinaInstancia' },
                { model: RemolqueInstancia, as: 'remolqueInstancia' }
            ],
            transaction: t
        });

        if (!activo) throw new Error('Activo no encontrado');

        // 1. Guardamos el JSON de la geometría en el Activo origen
        activo.configuracionTanque = configuracionTanque;
        activo.changed('configuracionTanque', true);

        // 2. AUTO-COMPLETAMOS LA CAPACIDAD CON EL VALOR VALIDADO EN EL ACTIVO
        activo.capacidadTanque = capacidadFinal;
        
        if (activo.nivelCombustible === null || activo.nivelCombustible === undefined) {
            activo.nivelCombustible = 0;
        }

        await activo.save({ transaction: t });

        // 🔥 3. PROPAGACIÓN CORREGIDA A LOS HERMANOS (BASADO EN TUS MODELOS EXACTOS) 🔥
        if (propagateToTemplate) {
            let modeloDestino = null;
            let idPlantilla = null;
            let includeModel = null;
            let includeAs = null;
            let fkName = null;

            // Identificamos las relaciones y la llave foránea real
            if (activo.vehiculoInstancia?.vehiculoId) {
                modeloDestino = Vehiculo;
                idPlantilla = activo.vehiculoInstancia.vehiculoId; 
                includeModel = VehiculoInstancia;
                includeAs = 'vehiculoInstancia';
                fkName = 'vehiculoId'; // Ahora apuntamos a la columna que sí existe
            } else if (activo.remolqueInstancia?.remolqueId) {
                modeloDestino = Remolque;
                idPlantilla = activo.remolqueInstancia.remolqueId;
                includeModel = RemolqueInstancia;
                includeAs = 'remolqueInstancia';
                fkName = 'remolqueId';
            } else if (activo.maquinaInstancia?.maquinaId) {
                modeloDestino = Maquina;
                idPlantilla = activo.maquinaInstancia.maquinaId;
                includeModel = MaquinaInstancia;
                includeAs = 'maquinaInstancia';
                fkName = 'maquinaId';
            }

            if (modeloDestino && idPlantilla && includeModel) {
                const plantilla = await modeloDestino.findByPk(idPlantilla, { transaction: t });
                
                if (plantilla) {
                    // Guardamos la configuración y la capacidad en la tabla maestra (Vehiculo, Maquina o Remolque)
                    plantilla.configuracionTanque = configuracionTanque;
                    plantilla.capacidadTanque = capacidadFinal; 
                    plantilla.changed('configuracionTanque', true);
                    await plantilla.save({ transaction: t });

                    // Hacemos INNER JOIN desde Activo -> Instancia buscando la FK exacta
                    const hermanos = await Activo.findAll({
                        include: [{
                            model: includeModel,
                            as: includeAs,
                            where: { [fkName]: idPlantilla },
                            required: true 
                        }],
                        transaction: t
                    });

                    // Inyectamos la data a todos los Activos hermanos que estén vacíos o en 0
                    for (const hermano of hermanos) {
                        if (hermano.id === activo.id) continue;

                        const cap = parseFloat(hermano.capacidadTanque);
                        if (isNaN(cap) || cap === 0) {
                            hermano.capacidadTanque = capacidadFinal;
                            hermano.configuracionTanque = configuracionTanque;
                            hermano.changed('configuracionTanque', true);
                            await hermano.save({ transaction: t });
                        }
                    }
                }
            }
        }

        await t.commit();
        
        return NextResponse.json({ 
            success: true, 
            message: 'Geometría y Capacidad guardadas y propagadas con éxito a todos los modelos vinculados.' 
        });

    } catch (error) {
        await t.rollback();
        console.error("Error guardando geometría del tanque:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}