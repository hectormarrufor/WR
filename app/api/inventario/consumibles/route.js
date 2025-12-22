import { NextResponse } from 'next/server';
import { Op } from 'sequelize';
import sequelize from '@/sequelize'; // <--- IMPORTANTE: Necesario para el cast
import {
    Consumible,
    Filtro,
    Aceite,
    Bateria,
    Neumatico,
    Correa,
    Sensor,
    GrupoEquivalencia
} from '@/models';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    
    // 1. Obtener parámetros de paginación y filtros
    const search = searchParams.get('search') || '';
    const tipoFilter = searchParams.get('tipo'); // Ej: 'Filtro', 'Aceite'
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'DESC';
    
    const offset = (page - 1) * limit;

    try {
        // 2. Construir la condición WHERE
        let whereCondition = {};

        // Búsqueda por texto (Solo en 'nombre')
        if (search) {
            whereCondition = {
                nombre: { [Op.iLike]: `%${search}%` }
            };
        }

        // Filtro por Categoría (SOLUCIÓN AL ERROR DE ENUM)
        if (tipoFilter) {
            // Definimos el patrón de búsqueda
            let pattern = '';
            if (tipoFilter.toLowerCase() === 'filtro') {
                pattern = 'filtro%'; // Todo lo que empiece con filtro
            } else {
                pattern = `%${tipoFilter}%`; // Cualquier coincidencia
            }

            // Creamos la lógica de CASTING para Postgres
            const categoryCondition = sequelize.where(
                sequelize.cast(sequelize.col('Consumible.categoria'), 'text'),
                { [Op.iLike]: pattern }
            );

            // Integramos esto al whereCondition existente usando AND
            if (!whereCondition[Op.and]) {
                whereCondition[Op.and] = [];
            }
            whereCondition[Op.and].push(categoryCondition);
        }

        // 3. Ejecutar la consulta con Paginación e Includes
        const { count, rows } = await Consumible.findAndCountAll({
            where: whereCondition,
            limit: limit,
            offset: offset,
            order: [[sortBy, sortOrder]],
            distinct: true, // Importante para que el count sea correcto con includes
            include: [
                // Incluimos todos los hijos posibles
                { model: Filtro },
                { model: Aceite },
                { model: Bateria },
                { model: Neumatico },
                { model: Correa },
                { model: Sensor }
            ]
        });

        // 4. Calcular total de páginas
        const totalPages = Math.ceil(count / limit);

        // 5. Retornar estructura
        return NextResponse.json({
            items: rows,       // El array de datos
            total: count,      // Total de registros
            totalPages: totalPages,
            currentPage: page
        });

    } catch (error) {
        console.error("Error API Consumibles:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
// POST: Crear Consumible + Datos Técnicos + Equivalencias
export async function POST(request) {
    const t = await sequelize.transaction();

    try {
        const body = await request.json();
        const {
            nombre,
            tipo, // 'fungible' o 'serializado'
            categoria, // 'filtro de aceite', 'filtro de aire', etc.
            stockAlmacen,
            stockAsignado = 0,
            stockMinimo,
            precioPromedio,
            unidadMedida,
            datosTecnicos // Objeto { tipo: 'Filtro', datos: {...}, equivalenciaExistenteId: 123 }
        } = body;

        // 1. Crear el Registro Padre (Consumible SKU)
        const nuevoConsumible = await Consumible.create({
            nombre,
            tipo,
            categoria,
            stockAlmacen,
            stockAsignado,
            stockMinimo,
            precioPromedio,
            unidadMedida,
        }, { transaction: t });

        // 2. Lógica Específica FILTRO
        if (categoria.startsWith('filtro')) {
            
            let grupoId = null;

            const { equivalenciaSeleccionada } = datosTecnicos;

            // ¿El usuario seleccionó un hermano?
            if (equivalenciaSeleccionada && equivalenciaSeleccionada.id) {
                
                // Buscamos al hermano para ver si ya tiene grupo
                const filtroHermano = await Filtro.findOne({ 
                    where: { id: equivalenciaSeleccionada.id }, // OJO: Verifica si tu ID es de consumible o de filtro. 
                    // Si tu modal devuelve ID de Consumible, usa 'consumibleId'.
                    transaction: t 
                });

                if (filtroHermano) {
                    // ESCENARIO 2: El hermano ya tiene grupo. Nos unimos.
                    if (filtroHermano.grupoEquivalenciaId) {
                        grupoId = filtroHermano.grupoEquivalenciaId;
                    } 
                    // ESCENARIO 3: El hermano es huérfano. Creamos grupo y lo adoptamos.
                    else {
                        const nuevoGrupo = await GrupoEquivalencia.create({ 
                            nombre: `Grupo para el filtro ${filtroHermano.marca} ${filtroHermano.codigo}` 
                        }, { transaction: t });
                        
                        grupoId = nuevoGrupo.id;

                        // Actualizamos al hermano
                        await filtroHermano.update({ 
                            grupoEquivalenciaId: grupoId 
                        }, { transaction: t });
                    }
                }
            }
            // ESCENARIO 1: No hay equivalencia (grupoId se queda en null)

            // Creamos el Filtro vinculado al grupo (o null)
            await Filtro.create({
                marca: datosTecnicos.marca,
                tipo: datosTecnicos.tipo,
                codigo: datosTecnicos.codigo,
                posicion: datosTecnicos.posicion,
                imagen: datosTecnicos.imagen || null,
                consumibleId: nuevoConsumible.id,
                grupoEquivalenciaId: grupoId // <--- Aquí se cierra el círculo
            }, { transaction: t });
        }
        else if (categoria === 'correa') {
            await Correa.create({
                consumibleId: nuevoConsumible.id,
                marca: datosTecnicos.marca,
                codigo: datosTecnicos.codigo,
            }, { transaction: t });
        }
        else if (categoria === 'aceite') {
            await Aceite.create({ // O tu modelo genérico de Aceite
                consumibleId: nuevoConsumible.id,
                viscosidad: datosTecnicos.viscosidad,
                tipo: datosTecnicos.tipo,
                aplicacion: datosTecnicos.aplicacion
            }, { transaction: t });
        }
        else if (categoria === 'neumatico') {
            // Lógica para Neumático
            await Neumatico.create({
                consumibleId: nuevoConsumible.id,
                marca: datosTecnicos.marca,
                modelo: datosTecnicos.modelo,
                medida: datosTecnicos.medida
            }, { transaction: t });
        }
        else if (categoria === 'bateria') {
            // Lógica para Batería
            await Bateria.create({
                consumibleId: nuevoConsumible.id,
                marca: datosTecnicos.marca,
                codigo: datosTecnicos.codigo,
                capacidad: datosTecnicos.capacidad,
                amperaje: datosTecnicos.amperaje,
                voltaje: datosTecnicos.voltaje
            }, { transaction: t });
        }
        else if (categoria === 'sensor') {
            // Lógica para Sensor
            await Sensor.create({
                consumibleId: nuevoConsumible.id,
                marca: datosTecnicos.marca,
                codigo: datosTecnicos.codigo,
                nombre: datosTecnicos.nombre
            }, { transaction: t });
        }

        await t.commit();
        return NextResponse.json({ success: true, data: nuevoConsumible }, { status: 201 });

    } catch (error) {
        await t.rollback();
        console.error("Error creando consumible:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}