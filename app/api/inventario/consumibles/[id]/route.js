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
    ConsumibleUsado,
    SubsistemaInstancia

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
                            as: 'filtros' // <--- PLURAL (Validado por tus logs)
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
                    as: 'serializados' 
                },

                // --- 4. HISTORIAL ---
                { 
                    model: ConsumibleUsado, 
                    as: 'usos',
                    limit: 20,
                    order: [['createdAt', 'DESC']],
                    include: [{ model: SubsistemaInstancia }] 
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


// PUT: Actualizar un consumible
export async function PUT(request, { params }) {
    const { id } = await params;
    const body = await request.json();
    const t = await sequelize.transaction();

    try {
        // 1. Buscar el consumible existente
        const consumible = await Consumible.findByPk(id, { transaction: t });
        if (!consumible) throw new Error('Consumible no encontrado');

        // 2. Actualizar datos generales (Tabla Consumible)
        await consumible.update({
            nombre: body.nombre,
            descripcion: body.descripcion,
            categoria: body.categoria, // Ojo: cambiar categoría es riesgoso si ya tiene hijo creado
            stockMinimo: body.stockMinimo,
            unidadMedida: body.unidadMedida,
            // ... otros campos generales
            // Nota: stockAlmacen y precioPromedio usualmente no se editan directamente aquí, sino por movimientos
            precioPromedio: body.precioPromedio,
            stockAlmacen: body.stockAlmacen
        }, { transaction: t });

        // 3. Actualizar datos específicos (Hijos)
        // body.datosTecnicos debe traer los campos específicos
        const datosTecnicos = body.datosTecnicos || {};

        // Detectar tipo y actualizar el modelo hijo correspondiente
        // Aquí asumimos que no cambias de "Filtro" a "Batería" en la edición, solo actualizas valores.

        if (body.tipoSpecifico === 'Filtro') {
            // Upsert o Update del hijo
            // Buscamos si ya existe el registro hijo
            const filtro = await Filtro.findOne({ where: { consumibleId: id }, transaction: t });
            if (filtro) {
                await filtro.update({
                    marcaId: datosTecnicos.marcaId,
                    codigo: datosTecnicos.codigo,
                    grupoEquivalenciaId: datosTecnicos.grupoEquivalenciaId
                }, { transaction: t });
            } else {
                // Si por alguna razón no existía (error de datos previos), lo creamos
                await Filtro.create({ ...datosTecnicos, consumibleId: id }, { transaction: t });
            }
        }

        // ... Repetir bloques IF para Aceite, Bateria, etc.
        // Ejemplo Aceite:
        if (body.tipoSpecifico === 'Aceite') {
            const aceite = await Aceite.findOne({ where: { consumibleId: id }, transaction: t });
            if (aceite) {
                await aceite.update({
                    viscosidad: datosTecnicos.viscosidad,
                    tipoBase: datosTecnicos.tipoBase,
                    marcaId: datosTecnicos.marcaId
                }, { transaction: t });
            }
        }

        await t.commit();
        return NextResponse.json({ success: true, message: 'Consumible actualizado' });

    } catch (error) {
        await t.rollback();
        console.error(error);
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