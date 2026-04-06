import { NextResponse } from 'next/server';
import sequelize from '@/sequelize';
import { Activo, Vehiculo, Maquina, Remolque, VehiculoInstancia, MaquinaInstancia, RemolqueInstancia } from '@/models';

export async function POST(request) {
    const t = await sequelize.transaction();

    try {
        const body = await request.json();
        const { activoId, configuracionTanque, propagateToTemplate, capacidadNeta } = body;

        if (!activoId || !configuracionTanque || capacidadNeta === undefined) {
            throw new Error('Faltan datos obligatorios para calcular la geometría.');
        }

        // Buscamos el activo incluyendo sus instancias para saber a qué plantilla pertenece
        const activo = await Activo.findByPk(activoId, {
            include: [
                { model: VehiculoInstancia, as: 'vehiculoInstancia' },
                { model: MaquinaInstancia, as: 'maquinaInstancia' },
                { model: RemolqueInstancia, as: 'remolqueInstancia' }
            ],
            transaction: t
        });

        if (!activo) throw new Error('Activo no encontrado');

        // 1. Guardamos el JSON de la geometría en el Activo
        activo.configuracionTanque = configuracionTanque;
        activo.changed('configuracionTanque', true);

        // 🔥 2. AUTO-COMPLETAMOS LA CAPACIDAD (Adiós al cuadro naranja) 🔥
        activo.capacidadTanque = capacidadNeta;
        
        // Prevención contra errores si el camión es nuevo y no tiene nivel
        if (activo.nivelCombustible === null || activo.nivelCombustible === undefined) {
            activo.nivelCombustible = 0;
        }

        await activo.save({ transaction: t });

        // 3. Propagar a la Plantilla (Si el usuario activó el Switch)
        if (propagateToTemplate) {
            let modeloDestino = null;
            let idPlantilla = null;

            if (activo.vehiculoInstancia?.plantillaId) {
                modeloDestino = Vehiculo;
                idPlantilla = activo.vehiculoInstancia.plantillaId;
            } else if (activo.remolqueInstancia?.plantillaId) {
                modeloDestino = Remolque;
                idPlantilla = activo.remolqueInstancia.plantillaId;
            } else if (activo.maquinaInstancia?.plantillaId) {
                modeloDestino = Maquina;
                idPlantilla = activo.maquinaInstancia.plantillaId;
            }

            if (modeloDestino && idPlantilla) {
                const plantilla = await modeloDestino.findByPk(idPlantilla, { transaction: t });
                if (plantilla) {
                    // Guardamos la geometría maestra en el modelo (Ej: Mack Granite 2008)
                    plantilla.configuracionTanque = configuracionTanque;
                    plantilla.changed('configuracionTanque', true);
                    await plantilla.save({ transaction: t });

                    // Opcional (pero muy recomendado): Actualizar a todos los "Mack Granite 2008" que tengan capacidad vacía
                    // para que hereden automáticamente la capacidad matemática que acabas de calcular
                    const instanciasRelacionadas = await modeloDestino === Vehiculo 
                        ? await VehiculoInstancia.findAll({ where: { plantillaId: idPlantilla }, attributes: ['activoId'], transaction: t })
                        : modeloDestino === Maquina 
                            ? await MaquinaInstancia.findAll({ where: { plantillaId: idPlantilla }, attributes: ['activoId'], transaction: t })
                            : await RemolqueInstancia.findAll({ where: { plantillaId: idPlantilla }, attributes: ['activoId'], transaction: t });

                    const idsRelacionados = instanciasRelacionadas.map(i => i.activoId);

                    if (idsRelacionados.length > 0) {
                        await Activo.update(
                            { capacidadTanque: capacidadNeta },
                            { 
                                where: { 
                                    id: idsRelacionados, 
                                    capacidadTanque: null // Solo pisamos a los que no tienen nada configurado
                                }, 
                                transaction: t 
                            }
                        );
                    }
                }
            }
        }

        await t.commit();
        
        return NextResponse.json({ 
            success: true, 
            message: 'Geometría y Capacidad guardadas y calculadas con éxito.' 
        });

    } catch (error) {
        await t.rollback();
        console.error("Error guardando geometría del tanque:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}