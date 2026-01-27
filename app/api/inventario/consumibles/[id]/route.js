import { NextResponse } from 'next/server';
import sequelize from '@/sequelize';
import {
    Consumible,
    Filtro,
    Aceite,
    Bateria,
    Neumatico,
    Correa,
    Sensor,
    GrupoEquivalencia,
    ConsumibleSerializado,
    ConsumibleInstalado,
    SubsistemaInstancia,
    Activo,
    VehiculoInstancia,
    Remolque,
    MaquinaInstancia,
    Vehiculo,
    Maquina,
    RemolqueInstancia

} from '@/models';


// GET: Obtener un consumible por ID con detalles completos
export async function GET(request, { params }) {
    const { id } = await params;

    try {
        const consumible = await Consumible.findByPk(id, {
            include: [
                // --- 1. FILTRO Y SUS EQUIVALENCIAS ---
                { 
                    model: Filtro,
                    include: [{ 
                        model: GrupoEquivalencia,
                        as: 'grupoEquivalencia', // <--- SINGULAR (Validado por tus logs)
                        include: [{ 
                            model: Filtro,
                            as: 'filtros', // <--- PLURAL (Validado por tus logs)
                            include: [{ model: Consumible }]

                        }] 
                    }]
                },

                // --- 2. OTROS HIJOS ---
                { model: Aceite },
                { model: Bateria }, // Si falla, intenta con 'Baterium' o revisa logs igual que Filtro
                { model: Neumatico },
                { model: Correa },
                { model: Sensor },
                
                // --- 3. SERIALES ---
                { 
                    model: ConsumibleSerializado, 
                    as: 'serializados' ,
                    include: [{ model: Activo, as: 'activo', include: [
                        { model: VehiculoInstancia, as: 'vehiculoInstancia', include: [{model: Vehiculo, as: 'plantilla'}] },
                        {model: RemolqueInstancia, as: 'remolqueInstancia', include: [{model: Remolque, as: 'plantilla'}]},
                        {model: MaquinaInstancia, as: 'maquinaInstancia', include: [{model: Maquina, as: 'plantilla'}]}
                    
                    ] }]
                },

                // --- 4. HISTORIAL ---
                { 
                    model: ConsumibleInstalado, 
                    as: 'instalaciones',
                    limit: 20,
                    order: [['createdAt', 'DESC']],
                    include: [{ model: SubsistemaInstancia, as: 'subsistema' }] 
                }
            ]
        });

        if (!consumible) {
            return NextResponse.json({ error: 'Consumible no encontrado' }, { status: 404 });
        }


        return NextResponse.json(consumible);

    } catch (error) {
        console.error("ERROR FULL:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}


export async function PUT(request, { params }) {
    const { id } = await params; // ID del Consumible
    const body = await request.json();
    const t = await sequelize.transaction();

    try {
        const consumible = await Consumible.findByPk(id, { transaction: t });
        if (!consumible) throw new Error('Consumible no encontrado');

        // 1. Actualizar datos generales
        await consumible.update({
            nombre: body.nombre,
            descripcion: body.descripcion,
            categoria: body.categoria,
            stockMinimo: body.stockMinimo,
            unidadMedida: body.unidadMedida,
            precioPromedio: body.precioPromedio,
            stockAlmacen: body.stockAlmacen
        }, { transaction: t });

        const datosTecnicos = body.datosTecnicos || {};

        // 2. Lógica de Filtro en Edición
        if (body.tipoSpecifico === 'Filtro') {
            const filtro = await Filtro.findOne({ where: { consumibleId: id }, transaction: t });
            
            let grupoId = datosTecnicos.grupoEquivalenciaId || (filtro ? filtro.grupoEquivalenciaId : null);

            // Si el usuario seleccionó una NUEVA equivalencia en el modal durante la edición
            if (datosTecnicos.equivalenciaSeleccionada && datosTecnicos.equivalenciaSeleccionada.id) {
                const filtroHermano = await Filtro.findByPk(datosTecnicos.equivalenciaSeleccionada.id, { transaction: t });
                
                if (filtroHermano) {
                    if (filtroHermano.grupoEquivalenciaId) {
                        grupoId = filtroHermano.grupoEquivalenciaId;
                    } else {
                        const nuevoGrupo = await GrupoEquivalencia.create({ 
                            nombre: `Grupo para ${filtroHermano.marca} ${filtroHermano.codigo}` 
                        }, { transaction: t });
                        grupoId = nuevoGrupo.id;
                        await filtroHermano.update({ grupoEquivalenciaId: grupoId }, { transaction: t });
                    }
                }
            }

            if (filtro) {
                await filtro.update({
                    marca: datosTecnicos.marca,
                    codigo: datosTecnicos.codigo,
                    tipo: datosTecnicos.tipo,
                    posicion: datosTecnicos.posicion,
                    grupoEquivalenciaId: grupoId
                }, { transaction: t });
            } else {
                await Filtro.create({ 
                    ...datosTecnicos, 
                    consumibleId: id, 
                    grupoEquivalenciaId: grupoId 
                }, { transaction: t });
            }
        }

        // Lógica de Aceite (Ejemplo de consistencia)
        if (body.tipoSpecifico === 'Aceite') {
            const aceite = await Aceite.findOne({ where: { consumibleId: id }, transaction: t });
            const dataAceite = {
                viscosidad: datosTecnicos.viscosidad,
                tipoBase: datosTecnicos.tipoBase,
                marca: datosTecnicos.marca
            };
            if (aceite) {
                await aceite.update(dataAceite, { transaction: t });
            } else {
                await Aceite.create({ ...dataAceite, consumibleId: id }, { transaction: t });
            }
        }

        await t.commit();
        return NextResponse.json({ success: true, message: 'Consumible actualizado' });

    } catch (error) {
        await t.rollback();
        console.error("Error en PUT:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE: Eliminar un consumible
export async function DELETE(request, { params }) {
    const { id } = await params;
    const t = await sequelize.transaction();
    try {
        const consumible = await Consumible.findByPk(id, { transaction: t });
        if (!consumible) throw new Error('Consumible no encontrado');

        // Nota: Asegúrate que las asociaciones en el modelo Consumible tengan onDelete: 'CASCADE'
        await consumible.destroy({ transaction: t });
        await t.commit();
        return NextResponse.json({ success: true, message: 'Consumible eliminado' });
    } catch (error) {
        await t.rollback();
        console.error("Error API Consumibles:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}