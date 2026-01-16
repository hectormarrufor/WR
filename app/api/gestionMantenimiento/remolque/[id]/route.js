import { NextResponse } from 'next/server';
import sequelize from '@/sequelize';
import { 

// filepath: c:\Users\Hector Marrufo\Documents\App Web DADICA hector marrufo\WR\app\api\gestionMantenimiento\remolque\[id]\route.js
    Remolque, 
    Subsistema, 
    RemolqueInstancia,
    ConsumibleRecomendado,
    SubsistemaInstancia,
    Activo
} from '@/models';

// ----------------------------------------------------------------------
// GET: Obtener un Remolque por ID (con todas sus relaciones)
// ----------------------------------------------------------------------
export async function GET(request, { params }) {
    const { id } = await params;

    try {
        const remolque = await Remolque.findByPk(id, {
            include: [
                {
                    model: Subsistema,
                    as: 'subsistemas',
                    include: [
                        {
                            model: ConsumibleRecomendado,
                            as: "listaRecomendada",
                            // Asegúrate de que este alias coincida con tu modelo de Subsistema.
                            // Si no tienes alias definido en hasMany, elimina la linea 'as'
                            // as: 'listaRecomendada' 
                        }
                    ]
                },
                {
                    model: RemolqueInstancia,
                    as: 'instancias', 
                }
            ]
        });

        if (!remolque) {
            return NextResponse.json({ success: false, error: 'Plantilla de Remolque no encontrada' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: remolque });

    } catch (error) {
        console.error("Error obteniendo remolque:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// ----------------------------------------------------------------------
// PUT: Actualizar datos de la Plantilla de Remolque
// ----------------------------------------------------------------------

export async function PUT(request, { params }) {
    const { id } = await params; 
    const t = await sequelize.transaction();

    try {
        const body = await request.json();
        const { propagar = false } = body; 

        // 1. Verificar existencia de la plantilla
        const remolque = await Remolque.findByPk(id);
        if (!remolque) {
            return NextResponse.json({ success: false, error: 'Plantilla de Remolque no encontrada' }, { status: 404 });
        }

        // 2. Actualizar Datos Base de la Plantilla
        await remolque.update({
            marca: body.marca,
            modelo: body.modelo,
            anio: body.anio,
            imagen: body.imagen,
            nroEjes: body.nroEjes,
            capacidadCarga: body.capacidadCarga,
            peso: body.peso,
            tipoRemolque: body.tipoRemolque,
        }, { transaction: t });

        // =========================================================
        // 3. GESTIÓN DE SUBSISTEMAS Y PROPAGACIÓN
        // =========================================================

        if (body.subsistemas) {
            const subsistemasActuales = await Subsistema.findAll({
                where: { remolqueId: id },
                attributes: ['id'],
                transaction: t
            });
            const idsEnBD = subsistemasActuales.map(s => s.id);
            const idsEnPayload = body.subsistemas.filter(s => s.id).map(s => s.id);

            // --- A. BORRADO ---
            const idsParaBorrar = idsEnBD.filter(dbId => !idsEnPayload.includes(dbId));
            if (idsParaBorrar.length > 0) {
                if (propagar) {
                    await SubsistemaInstancia.destroy({
                        where: { subsistemaPlantillaId: idsParaBorrar },
                        transaction: t
                    });
                }
                await Subsistema.destroy({ where: { id: idsParaBorrar }, transaction: t });
            }

            // --- B. PROCESAR ALTAS Y CAMBIOS ---
            let activosVinculados = [];
            if (propagar) {
                // Buscamos Activos que tengan una instancia de este Remolque asociada
                activosVinculados = await Activo.findAll({
                    include: [{
                        model: RemolqueInstancia,
                        as: 'remolqueInstancia',
                        where: { remolqueId: id },
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
                        remolqueId: id // Clave foránea correcta para Remolque
                    }, { transaction: t });

                    if (propagar && activosVinculados.length > 0) {
                        const nuevasInstanciasFisicas = activosVinculados.map(activo => ({
                            nombre: `${subData.nombre} ${activo.remolqueInstancia?.placa || ''}`,
                            activoId: activo.id,
                            subsistemaPlantillaId: subsistemaPlantilla.id,
                            estado: 'ok',
                            observaciones: 'Añadido por actualización de modelo (remolque)'
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
                ? 'Plantilla de Remolque y activos actualizados correctamente' 
                : 'Plantilla de Remolque actualizada (sin afectar activos existentes)' 
        });

    } catch (error) {
        if (t) await t.rollback();
        console.error("Error en PUT Remolque con Propagación:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// ----------------------------------------------------------------------
// DELETE: Eliminar Remolque
// ----------------------------------------------------------------------
export async function DELETE(request, { params }) {
    const { id } = await params;

    try {
        const remolque = await Remolque.findByPk(id);

        if (!remolque) {
            return NextResponse.json({ success: false, error: 'Plantilla de Remolque no encontrada' }, { status: 404 });
        }

        // Verificar si hay instancias físicas asociadas
        const instanciasCount = await RemolqueInstancia.count({ where: { remolqueId: id } });
        if (instanciasCount > 0) {
            return NextResponse.json({ 
                success: false, 
                error: `No se puede eliminar la plantilla. Hay ${instanciasCount} remolques físicos asociados a este modelo.` 
            }, { status: 400 });
        }

        // Al tener cascade, se borran subsistemas hijos automáticamente
        await remolque.destroy();

        return NextResponse.json({ success: true, message: 'Plantilla eliminada correctamente' });

    } catch (error) {
        console.error("Error eliminando remolque:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}