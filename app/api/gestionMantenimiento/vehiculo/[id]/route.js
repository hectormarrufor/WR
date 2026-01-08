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
    const { id } = await params; // ID del Vehículo
    const t = await sequelize.transaction();

    try {
        const body = await request.json();

        // 1. Verificar existencia
        const vehiculo = await Vehiculo.findByPk(id);
        if (!vehiculo) {
            return NextResponse.json({ success: false, error: 'Vehículo no encontrado' }, { status: 404 });
        }

        // 2. Actualizar Datos Base del Vehículo
        await vehiculo.update({
            nombre: body.nombre,
            marca: body.marca,
            modelo: body.modelo,
            anio: body.anio,
            tipo: body.tipo, // 'chuto', 'camion', etc.
            peso: body.peso,
            numeroEjes: body.numeroEjes,
            tipoCombustible: body.tipoCombustible,
            imagen: body.imagen,
            capacidadArrastre: body.capacidadArrastre,
            pesoMaximoCombinado: body.pesoMaximoCombinado

            // ... otros campos
        }, { transaction: t });

        // =========================================================
        // 3. GESTIÓN INTELIGENTE DE SUBSISTEMAS (ABM / CRUD)
        // =========================================================

        if (body.subsistemas) {
            
            // A. Obtener IDs actuales en BD para este vehículo
            const subsistemasActuales = await Subsistema.findAll({
                where: { vehiculoId: id },
                attributes: ['id'],
                transaction: t
            });
            const idsEnBD = subsistemasActuales.map(s => s.id);

            // B. Obtener IDs que vienen del Frontend (solo los que tienen ID son viejos)
            const idsEnPayload = body.subsistemas
                .filter(s => s.id) // Filtramos los nuevos (que no tienen ID)
                .map(s => s.id);

            // C. DETERMINAR QUÉ BORRAR (Están en BD pero NO en el Payload)
            const idsParaBorrar = idsEnBD.filter(dbId => !idsEnPayload.includes(dbId));

            if (idsParaBorrar.length > 0) {
                // AL BORRAR EL SUBSISTEMA, EL CASCADE DE SEQUELIZE BORRA SUS RECOMENDACIONES
                await Subsistema.destroy({
                    where: { id: idsParaBorrar },
                    transaction: t
                });
            }

            // D. PROCESAR LO QUE VIENE (Actualizar Viejos o Crear Nuevos)
            for (const subData of body.subsistemas) {
                
                let subsistemaActual;

                if (subData.id) {
                    // --- CASO 1: ACTUALIZAR EXISTENTE ---
                    subsistemaActual = await Subsistema.findByPk(subData.id, { transaction: t });
                    if (subsistemaActual) {
                        await subsistemaActual.update({
                            nombre: subData.nombre,
                            categoria: subData.categoria
                        }, { transaction: t });
                    }
                } else {
                    // --- CASO 2: CREAR NUEVO (El usuario agregó uno nuevo en el form) ---
                    subsistemaActual = await Subsistema.create({
                        nombre: subData.nombre,
                        categoria: subData.categoria,
                        vehiculoId: id // Link al padre
                    }, { transaction: t });
                }

                // E. GESTIÓN DE NIETOS (RECOMENDACIONES)
                // Estrategia "Clean Slate": Borrar viejas recomendaciones y poner las nuevas.
                // Es más seguro para evitar duplicados o inconsistencias en reglas técnicas.
                
                if (subsistemaActual) {
                    // 1. Borrar recomendaciones anteriores de este subsistema
                    await ConsumibleRecomendado.destroy({
                        where: { subsistemaId: subsistemaActual.id },
                        transaction: t
                    });

                    // 2. Crear las nuevas (si trae)
                    if (subData.recomendaciones && subData.recomendaciones.length > 0) {
                        const detallesMap = subData.recomendaciones.map(rec => ({
                            subsistemaId: subsistemaActual.id,
                            label: rec.label,
                            categoria: rec.categoria,
                            cantidad: rec.cantidad || 1,
                            tipoCriterio: rec.tipoCriterio,
                            // Mapeo de columnas según el tipo
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
        return NextResponse.json({ success: true, message: 'Actualizado correctamente' });

    } catch (error) {
        await t.rollback();
        console.error("Error en PUT Vehiculo:", error);
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