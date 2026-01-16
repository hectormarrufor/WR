import { NextResponse } from 'next/server';
import sequelize from '@/sequelize';
import { 

// filepath: c:\Users\Hector Marrufo\Documents\App Web DADICA hector marrufo\WR\app\api\gestionMantenimiento\vehiculo\[id]\route.js
    Vehiculo, 
    Subsistema, 
    VehiculoInstancia,
    ConsumibleRecomendado // Necesario para anidar el detalle completo en el GET
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
    const { id } = await params; // ID de la Plantilla (Vehiculo)
    const t = await sequelize.transaction();

    try {
        const body = await request.json();
        const { propagar = false } = body; // El check que definimos en la UI

        // 1. Verificar existencia de la plantilla
        const vehiculo = await Vehiculo.findByPk(id);
        if (!vehiculo) {
            return NextResponse.json({ success: false, error: 'Plantilla no encontrada' }, { status: 404 });
        }

        // 2. Actualizar Datos Base de la Plantilla
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
        // 3. GESTIÓN DE SUBSISTEMAS Y PROPAGACIÓN
        // =========================================================

        if (body.subsistemas) {
            const subsistemasActuales = await Subsistema.findAll({
                where: { vehiculoId: id },
                attributes: ['id'],
                transaction: t
            });
            const idsEnBD = subsistemasActuales.map(s => s.id);
            const idsEnPayload = body.subsistemas.filter(s => s.id).map(s => s.id);

            // --- A. BORRADO ---
            const idsParaBorrar = idsEnBD.filter(dbId => !idsEnPayload.includes(dbId));
            if (idsParaBorrar.length > 0) {
                if (propagar) {
                    // Si propagamos, eliminamos las instancias físicas de esos subsistemas en los activos
                    await SubsistemaInstancia.destroy({
                        where: { subsistemaPlantillaId: idsParaBorrar },
                        transaction: t
                    });
                }
                await Subsistema.destroy({ where: { id: idsParaBorrar }, transaction: t });
            }

            // --- B. PROCESAR ALTAS Y CAMBIOS ---
            // Necesitamos los Activos vinculados a esta plantilla si vamos a propagar
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

            for (const subData of body.subsistemas) {
                let subsistemaPlantilla;

                if (subData.id) {
                    // ACTUALIZAR SUBSISTEMA EXISTENTE
                    subsistemaPlantilla = await Subsistema.findByPk(subData.id, { transaction: t });
                    if (subsistemaPlantilla) {
                        await subsistemaPlantilla.update({
                            nombre: subData.nombre,
                            categoria: subData.categoria
                        }, { transaction: t });
                        
                        if (propagar) {
                            // Actualizar nombre en las instancias físicas para mantener consistencia
                            await SubsistemaInstancia.update(
                                { nombre: `${subData.nombre} (Sincronizado)` },
                                { where: { subsistemaPlantillaId: subsistemaPlantilla.id }, transaction: t }
                            );
                        }
                    }
                } else {
                    // CREAR NUEVO SUBSISTEMA EN PLANTILLA
                    subsistemaPlantilla = await Subsistema.create({
                        nombre: subData.nombre,
                        categoria: subData.categoria,
                        vehiculoId: id
                    }, { transaction: t });

                    if (propagar && activosVinculados.length > 0) {
                        // PROPAGAR: Crear el subsistema físico en todos los activos que no lo tengan
                        const nuevasInstanciasFisicas = activosVinculados.map(activo => ({
                            nombre: `${subData.nombre} ${activo.vehiculoInstancia?.placa || ''}`,
                            activoId: activo.id,
                            subsistemaPlantillaId: subsistemaPlantilla.id,
                            estado: 'ok',
                            observaciones: 'Añadido por actualización de modelo'
                        }));
                        await SubsistemaInstancia.bulkCreate(nuevasInstanciasFisicas, { transaction: t });
                    }
                }

                // --- C. GESTIÓN DE RECOMENDACIONES (NIETOS) ---
                if (subsistemaPlantilla) {
                    await ConsumibleRecomendado.destroy({
                        where: { subsistemaId: subsistemaPlantilla.id },
                        transaction: t
                    });

                    if (subData.recomendaciones && subData.recomendaciones.length > 0) {
                        const detallesMap = subData.recomendaciones.map(rec => ({
                            subsistemaId: subsistemaPlantilla.id,
                            label: rec.label || rec.labelOriginal,
                            categoria: rec.categoria,
                            cantidad: rec.cantidad || 1,
                            tipoCriterio: rec.tipoCriterio,
                            grupoEquivalenciaId: rec.tipoCriterio === 'grupo' ? rec.criterioId : null,
                            valorCriterio: rec.tipoCriterio === 'tecnico' ? rec.criterioId : (rec.tipoCriterio === 'individual' ? rec.labelOriginal : null),
                            consumibleId: rec.tipoCriterio === 'individual' ? rec.criterioId : null
                        }));
                        await ConsumibleRecomendado.bulkCreate(detallesMap, { transaction: t });
                    }
                }
            }
        }

        await t.commit();
        return NextResponse.json({ 
            success: true, 
            message: propagar 
                ? 'Modelo y activos actualizados correctamente' 
                : 'Modelo actualizado (sin afectar activos existentes)' 
        });

    } catch (error) {
        if (t) await t.rollback();
        console.error("Error en PUT Vehiculo con Propagación:", error);
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