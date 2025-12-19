import { NextResponse } from 'next/server';
import sequelize from '@/sequelize';
import { Op } from 'sequelize';
import {
    Consumible,
    // Importa tus modelos específicos según tu estructura exacta
    Filtro,
    Correa,
    Aceite,
    GrupoEquivalencia
} from '@/models';

// GET: Buscar Consumibles (soporta ?search=... y ?tipo=...)
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const tipo = searchParams.get('tipo'); // Opcional, para filtrar solo Filtros
    const limit = parseInt(searchParams.get('limit')) || 50;

    try {
        let whereCondition = {};

        if (search) {
            whereCondition = {
                [Op.or]: [
                    { nombre: { [Op.iLike]: `%${search}%` } },
                    { codigo: { [Op.iLike]: `%${search}%` } },
                    { descripcion: { [Op.iLike]: `%${search}%` } } // Busca en keywords/equivalencias
                ]
            };
        }

        // Si tienes una columna 'tipoConsumible' en la tabla padre, úsala
        if (tipo) {
            whereCondition.tipoConsumible = tipo;
        }

        const consumibles = await Consumible.findAll({
            where: whereCondition,
            limit: limit,
            order: [['nombre', 'ASC']]
        });

        return NextResponse.json({ success: true, data: consumibles });

    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// POST: Crear Consumible + Datos Técnicos + Equivalencias
export async function POST(request) {
    const t = await sequelize.transaction();

    try {
        const body = await request.json();
        const {
            nombre,
            codigo,
            marca,
            stockActual = 0,
            stockMinimo = 0,
            datosTecnicos // Objeto { tipo: 'Filtro', datos: {...}, equivalenciaExistenteId: 123 }
        } = body;

        // 1. Crear el Registro Padre (Consumible SKU)
        const nuevoConsumible = await Consumible.create({
            nombre,
            codigo,
            marca,
            stockActual,
            stockMinimo,
            tipoConsumible: datosTecnicos?.tipo || 'Generico'
        }, { transaction: t });

        // 2. Lógica Específica FILTRO
        if (datosTecnicos?.tipo === 'Filtro') {
            
            let grupoId = null;

            // ¿El usuario seleccionó un hermano?
            if (datosTecnicos.equivalenciaExistenteId) {
                
                // Buscamos al hermano para ver si ya tiene grupo
                const filtroHermano = await Filtro.findOne({ 
                    where: { consumibleId: datosTecnicos.equivalenciaExistenteId }, // OJO: Verifica si tu ID es de consumible o de filtro. 
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
                            descripcion: `Grupo Auto-generado` 
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
                consumibleId: nuevoConsumible.id,
                tipoFiltro: datosTecnicos.datos.tipoFiltro,
                grupoEquivalenciaId: grupoId // <--- Aquí se cierra el círculo
            }, { transaction: t });
        }
        else if (datosTecnicos?.tipo === 'Correa') {
            await Correa.create({
                consumibleId: nuevoConsumible.id,
                perfil: datosTecnicos.datos.perfil,
                canales: datosTecnicos.datos.canales,
                longitud: datosTecnicos.datos.longitud
            }, { transaction: t });
        }
        else if (datosTecnicos?.tipo === 'Aceite') {
            await Aceite.create({ // O tu modelo genérico de Aceite
                consumibleId: nuevoConsumible.id,
                viscosidad: datosTecnicos.datos.viscosidad,
                base: datosTecnicos.datos.base,
                aplicacion: datosTecnicos.datos.aplicacion
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