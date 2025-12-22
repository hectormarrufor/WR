import db from "@/models";
import { NextResponse } from "next/server";
import { Filtro, GrupoEquivalencia, Consumible } from '@/models';
import { Op } from 'sequelize';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    
    // Parámetros de búsqueda
    const tipo = searchParams.get('tipo'); // aceite, aire, etc.
    const search = searchParams.get('search') || '';
    const categoriaSelect = searchParams.get('categoria'); // Filtro del Select del modal

    try {
        let whereCondition = {};

        // 1. Filtrado por tipo de filtro (Enums: aceite, aire, combustible, cabina)
        // Priorizamos el filtro del Select del modal, si no, usamos el 'tipo' general
        const tipoFinal = (categoriaSelect || tipo || '').toLowerCase();
        if (['aceite', 'aire', 'combustible', 'cabina'].includes(tipoFinal)) {
            whereCondition.tipo = tipoFinal;
        }

        // 2. Búsqueda por texto (Marca o Código)
        if (search) {
            whereCondition[Op.or] = [
                { marca: { [Op.iLike]: `%${search}%` } },
                { codigo: { [Op.iLike]: `%${search}%` } }
            ];
        }

        // 3. Obtener los items
        const filtros = await Filtro.findAll({
            where: whereCondition,
            include: [
                { model: GrupoEquivalencia, as: 'grupoEquivalencia' },
                { model: Consumible } // Útil para traer el nombre general si es necesario
            ],
            order: [['marca', 'ASC'], ['codigo', 'ASC']]
        });

        // 4. Preparar metadata para los Selects del modal
        // Estos son los valores que el modal espera para llenar los filtros superiores
        const metadata = {
            items: filtros,
            categorias: [
                { value: 'aceite', label: 'Aceite' },
                { value: 'aire', label: 'Aire' },
                { value: 'combustible', label: 'Combustible' },
                { value: 'cabina', label: 'Cabina' }
            ],
            estados: [
                { value: 'con_grupo', label: 'Con Equivalencias' },
                { value: 'sin_grupo', label: 'Sin Equivalencias' }
            ]
        };

        return NextResponse.json(metadata);

    } catch (error) {
        console.error("Error API Filtros:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const data = await request.json();
        const { posicion, stock, stockMinimo, costoPromedio, ...rest } = data;

        const result = await db.sequelize.transaction(async (t) => {
            let nuevoFiltro;

            if (data.tipo === "combustible") {
                nuevoFiltro = await db.Filtro.create(data, { transaction: t });
            } else {
                nuevoFiltro = await db.Filtro.create(rest, { transaction: t });
            }

            const nuevoConsumible = await db.Consumible.create({
                nombre: nuevoFiltro.nombre,
                tipo: "fungible",
                categoria: data.tipo === "aceite" ? "filtro de aceite" :
                          data.tipo === "aire" ? "filtro de aire" :
                          data.tipo === "combustible" ? "filtro de combustible" :
                          data.tipo === "cabina" ? "filtro de cabina" : null,
                stockAlmacen: nuevoFiltro.descripcion,
                filtroId: nuevoFiltro.id,
            }, { transaction: t });

            return nuevoFiltro;
        });

        return NextResponse.json(result, { status: 201 });

    } catch (error) {
        console.error("Error creating filtro de aceite:", error);
        return NextResponse.json(
            { message: "Error al crear el filtro de aceite", error: error.message },
            { status: 500 }
        );
    }
}