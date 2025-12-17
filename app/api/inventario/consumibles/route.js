import { NextResponse } from 'next/server';
import sequelize from '@/sequelize';
import { Op } from 'sequelize';
import { 
    Consumible, 
    // Importa tus modelos específicos según tu estructura exacta
    Filtro, 
    Correa, 
    AceiteMotor, 
    EquivalenciaFiltro 
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

        // 2. Crear el Registro Específico (Herencia)
        if (datosTecnicos?.tipo === 'Filtro') {
            const nuevoFiltro = await Filtro.create({
                consumibleId: nuevoConsumible.id,
                tipoFiltro: datosTecnicos.datos.tipoFiltro
            }, { transaction: t });

            // 3. Crear Equivalencia si aplica
            if (datosTecnicos.equivalenciaExistenteId) {
                // Buscamos el filtro "hermano" asociado al consumible seleccionado
                const filtroHermano = await Filtro.findOne({ 
                    where: { consumibleId: datosTecnicos.equivalenciaExistenteId },
                    transaction: t
                });

                if (filtroHermano) {
                    await EquivalenciaFiltro.create({
                        filtroAId: filtroHermano.id,
                        filtroBId: nuevoFiltro.id
                    }, { transaction: t });
                }
            }
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
            await AceiteMotor.create({ // O tu modelo genérico de Aceite
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