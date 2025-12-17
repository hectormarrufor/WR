import { NextResponse } from 'next/server';
import { Filtro, Consumible, EquivalenciaFiltro } from '@/models';
import { Op } from 'sequelize';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const consumibleId = searchParams.get('consumibleId');

    if (!consumibleId) {
        return NextResponse.json({ success: false, error: 'Falta consumibleId' }, { status: 400 });
    }

    try {
        // 1. Buscamos el Filtro asociado a este Consumible
        const filtroOrigen = await Filtro.findOne({ where: { consumibleId } });

        if (!filtroOrigen) {
            // No es un filtro o no existe, devolvemos array vacío
            return NextResponse.json({ success: true, data: [] });
        }

        // 2. Buscamos en la tabla de equivalencias
        // OJO: La relación puede estar en ambas direcciones (filtroA -> filtroB O filtroB -> filtroA)
        // Asumiendo que tu tabla EquivalenciaFiltro tiene filtroAId y filtroBId
        
        const equivalencias = await EquivalenciaFiltro.findAll({
            where: {
                [Op.or]: [
                    { filtroAId: filtroOrigen.id },
                    { filtroBId: filtroOrigen.id }
                ]
            }
        });

        // 3. Extraemos los IDs de los filtros "hermanos"
        const idsFiltrosHermanos = equivalencias.map(eq => 
            eq.filtroAId === filtroOrigen.id ? eq.filtroBId : eq.filtroAId
        );

        if (idsFiltrosHermanos.length === 0) {
            return NextResponse.json({ success: true, data: [] });
        }

        // 4. Buscamos los Consumibles padres de esos filtros hermanos
        // Para devolver la info completa (ID, Nombre) al frontend
        const consumiblesHermanos = await Consumible.findAll({
            include: [{
                model: Filtro,
                where: { id: idsFiltrosHermanos }, // Filtramos por los IDs de filtros encontrados
                required: true
            }]
        });

        return NextResponse.json({ success: true, data: consumiblesHermanos });

    } catch (error) {
        console.error("Error buscando equivalencias:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}