import { NextResponse } from 'next/server';
import sequelize from '@/sequelize';
import { Op } from "sequelize";
import {

    // filepath: c:\Users\Hector Marrufo\Documents\App Web DADICA hector marrufo\WR\app\api\gestionMantenimiento\vehiculo\[id]\route.js
    Vehiculo,
    Subsistema,
    VehiculoInstancia,
    ConsumibleRecomendado, // Necesario para anidar el detalle completo en el GET
    SubsistemaInstancia,
    Activo
} from '@/models';

// ----------------------------------------------------------------------
// GET: Obtener un Vehículo por ID (con todas sus relaciones)
// ----------------------------------------------------------------------
export async function GET(request, { params }) {
    const { id } = await params;

    try {
        const vehiculo = await Vehiculo.findByPk(id, {
            include: [
                {
                    model: Subsistema,
                    as: 'subsistemas',
                    include: [
                        {
                            // Incluimos las recomendaciones de mantenimiento de cada subsistema
                            model: ConsumibleRecomendado,

                            // Nota: Asegúrate de tener el alias definido en tu modelo Subsistema, 
                            // si no tienes un 'as', retira esta línea:
                            as: 'listaRecomendada'
                        }
                    ]
                },
                {
                    model: VehiculoInstancia,
                    as: 'instancias', // Definido en Vehiculo.js
                    // Opcional: limitar atributos para no traer demasiada data innecesaria
                    // attributes: ['id', 'placa', 'activo'] 
                }
            ]
        });

        if (!vehiculo) {
            return NextResponse.json({ success: false, error: 'Vehículo no encontrado' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: vehiculo });

    } catch (error) {
        console.error("Error obteniendo vehículo:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// ----------------------------------------------------------------------
// PUT: Actualizar datos del Vehículo
// ----------------------------------------------------------------------

export async function PUT(request, { params }) {
    const { id } = await params;
    const t = await sequelize.transaction();

    try {
        const body = await request.json();
        const { propagar = false } = body;

        console.log("--- INICIO PUT VEHICULO ---");
        console.log(`Propagar: ${propagar}`);
        console.log(`Subsistemas recibidos: ${body.subsistemas?.length || 0}`);

        // 1. Verificar y Actualizar Vehículo (Plantilla)
        const vehiculo = await Vehiculo.findByPk(id);
        if (!vehiculo) {
            await t.rollback();
            return NextResponse.json({ success: false, error: 'Plantilla no encontrada' }, { status: 404 });
        }

        await vehiculo.update({
            marca: body.marca,
            modelo: body.modelo,
            anio: body.anio,
            tipoVehiculo: body.tipoVehiculo,
            peso: body.peso,
            numeroEjes: body.numeroEjes,
            tipoCombustible: body.tipoCombustible,
            imagen: body.imagen,
            capacidadArrastre: body.capacidadArrastre,
            pesoMaximoCombinado: body.pesoMaximoCombinado
        }, { transaction: t });

        // =========================================================
        // 2. GESTIÓN DE SUBSISTEMAS
        // =========================================================

        if (body.subsistemas) {
            // A. Obtener IDs actuales para saber qué borrar
            const subsistemasBD = await Subsistema.findAll({
                where: { vehiculoId: id },
                attributes: ['id'],
                transaction: t
            });
            const idsBD = subsistemasBD.map(s => s.id);
            const idsPayload = body.subsistemas.filter(s => s.id).map(s => s.id);

            // B. Borrar Subsistemas que ya no vienen en el payload
            const idsParaBorrar = idsBD.filter(dbId => !idsPayload.includes(dbId));

            if (idsParaBorrar.length > 0) {
                if (propagar) {
                    // Usamos la FK correcta que me indicaste: 'subsistemaId'
                    await SubsistemaInstancia.destroy({
                        where: { subsistemaId: idsParaBorrar },
                        transaction: t
                    });
                }
                await Subsistema.destroy({ where: { id: idsParaBorrar }, transaction: t });
            }

            // C. Buscar Activos Vinculados (Solo si vamos a propagar)
            let activosVinculados = [];
            if (propagar) {
                activosVinculados = await Activo.findAll({
                    include: [{
                        model: VehiculoInstancia,
                        as: 'vehiculoInstancia',
                        where: { vehiculoId: id },
                        required: true
                    }],
                    transaction: t
                });
            }

            // D. Iterar sobre los subsistemas del Payload (Crear o Actualizar)
            for (const subData of body.subsistemas) {
                let subsistemaActual;

                if (subData.id) {
                    // --- ACTUALIZAR SUBSISTEMA EXISTENTE ---
                    subsistemaActual = await Subsistema.findByPk(subData.id, { transaction: t });
                    if (subsistemaActual) {
                        await subsistemaActual.update({
                            nombre: subData.nombre,
                            categoria: subData.categoria
                        }, { transaction: t });

                        if (propagar) {
                            // Propagar cambio de nombre a instancias
                            await SubsistemaInstancia.update(
                                { nombre: `${subData.nombre} (Sincronizado)` },
                                { where: { subsistemaId: subsistemaActual.id }, transaction: t }
                            );
                        }
                    }
                } else {
                    // --- CREAR NUEVO SUBSISTEMA ---
                    // --- CREAR ---
                    console.log(`Creando nuevo subsistema: ${subData.nombre}`);
                    subsistemaActual = await Subsistema.create({
                        nombre: subData.nombre,
                        categoria: subData.categoria,
                        vehiculoId: id
                    }, { transaction: t });

                    // Propagar creación a activos existentes
                    if (propagar && activosVinculados.length > 0) {
                        const nuevasInstancias = activosVinculados.map(activo => ({
                            nombre: `${subData.nombre} ${activo.vehiculoInstancia?.placa || ''}`,
                            activoId: activo.id,
                            subsistemaId: subsistemaActual.id, // FK Correcta
                            estado: 'ok',
                            observaciones: 'Propagado por actualización de modelo'
                        }));
                        await SubsistemaInstancia.bulkCreate(nuevasInstancias, { transaction: t });
                    }
                }

                // =========================================================
                // 3. GESTIÓN DE RECOMENDACIONES (Smart Sync: Sin borrar todo)
                // =========================================================
                if (subsistemaActual && subData.recomendaciones && subData.recomendaciones.length > 0) {
                    console.log(`Procesando ${subData.recomendaciones.length} recomendaciones para Subsistema ID: ${subsistemaActual.id}`);

                    // 3.1 Sincronización: Eliminar las que no vienen en el payload
                    const recsPayloadIds = subData.recomendaciones.filter(r => r.id).map(r => r.id);
                    await ConsumibleRecomendado.destroy({
                        where: {
                            subsistemaId: subsistemaActual.id,
                            id: { [Op.notIn]: recsPayloadIds }
                        },
                        transaction: t
                    });

                    // 3.2 Loop de Guardado
                    for (const rec of subData.recomendaciones) {
                        // SANITIZACIÓN: Evitar guardar strings vacíos "" como IDs
                        const cleanValue = (val) => (val === '' || val === undefined || val === null) ? null : val;

                        // Determinar el valor clave (puede venir como criterioId o valor)
                        const valorRaw = cleanValue(rec.criterioId) || cleanValue(rec.valor);

                        const datosRecomendacion = {
                            label: rec.label || rec.labelOriginal || 'Componente',
                            categoria: rec.categoria,
                            cantidad: rec.cantidad || 1,
                            tipoCriterio: rec.tipoCriterio,
                            subsistemaId: subsistemaActual.id, // VINCULACIÓN CRÍTICA

                            // Asignación correcta según tipo
                            grupoEquivalenciaId: rec.tipoCriterio === 'grupo' ? valorRaw : null,
                            valorCriterio: rec.tipoCriterio === 'tecnico' ? valorRaw : null,
                            consumibleId: rec.tipoCriterio === 'individual' ? valorRaw : null
                        };

                        try {
                            if (rec.id) {
                                await ConsumibleRecomendado.update(datosRecomendacion, {
                                    where: { id: rec.id },
                                    transaction: t
                                });
                            } else {
                                console.log("Creando recomendación:", datosRecomendacion);
                                await ConsumibleRecomendado.create(datosRecomendacion, { transaction: t });
                            }
                        } catch (innerError) {
                            console.error(`Error guardando recomendación individual: ${innerError.message}`);
                            // No hacemos throw aquí para no matar todo el proceso si falla una sola, 
                            // pero idealmente deberías revisar los logs.
                            throw innerError;
                        }
                    }
                } else {
                    console.log(`Subsistema ${subsistemaActual?.nombre} no tiene recomendaciones para procesar.`);
                }
            }
        }



        await t.commit();
        return NextResponse.json({
            success: true,
            message: propagar ? 'Modelo y flota sincronizados correctamente' : 'Modelo actualizado'
        });

    } catch (error) {
        await t.rollback();
        console.error("Error PUT Vehiculo:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// ----------------------------------------------------------------------
// DELETE: Eliminar Vehículo
// ----------------------------------------------------------------------
export async function DELETE(request, { params }) {
    const { id } = await params;

    try {
        const vehiculo = await Vehiculo.findByPk(id);

        if (!vehiculo) {
            return NextResponse.json({ success: false, error: 'Vehículo no encontrado' }, { status: 404 });
        }

        // Verificación opcional: ¿Tiene instancias activas?
        // Si hay 'VehiculoInstancia' (camiones reales) usando esta plantilla, la BD 
        // probablemente lance error de Foreign Key, pero es bueno verificar antes.
        const instanciasCount = await VehiculoInstancia.count({ where: { vehiculoId: id } });
        if (instanciasCount > 0) {
            return NextResponse.json({
                success: false,
                error: `No se puede eliminar la plantilla. Hay ${instanciasCount} vehículos físicos asociados a este modelo.`
            }, { status: 400 });
        }

        // Si tienes configurado 'ON DELETE CASCADE' en la base de datos para los Subsistemas,
        // esto borrará también los subsistemas. Si no, deberás borrarlos manualmente aquí.
        await vehiculo.destroy();

        return NextResponse.json({ success: true, message: 'Vehículo eliminado correctamente' });

    } catch (error) {
        console.error("Error eliminando vehículo:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}