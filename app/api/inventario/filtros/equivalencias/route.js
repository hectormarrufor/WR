import { NextResponse } from 'next/server';
import { Filtro, Consumible } from '@/models';
import { Op } from 'sequelize';

// api/inventario/filtros/equivalencias/route.js

export async function GET(request) {
    // ... obtener consumibleId ...
    const { searchParams } = new URL(request.url);
    const consumibleId = searchParams.get('consumibleId');
    if (!consumibleId) {
        return NextResponse.json({ success: false, error: "consumibleId es requerido" }, { status: 400 });
    }
    // Buscar el filtro asociado al consumibleId


    const filtroOrigen = await Filtro.findOne({ where: { consumibleId } });
    
    if (!filtroOrigen || !filtroOrigen.grupoEquivalenciaId) {
        // No es filtro o no tiene grupo (no tiene equivalencias)
        return NextResponse.json({ success: true, data: [] });
    }

    // Buscar TODOS los miembros del mismo grupo
    const filtrosHermanos = await Filtro.findAll({
        where: {
            grupoEquivalenciaId: filtroOrigen.grupoEquivalenciaId,
            id: { [Op.ne]: filtroOrigen.id } // Excluir al mismo filtro que consultamos
        },
        include: [{ 
            model: Consumible, // Traemos la info del padre (Nombre, Stock, Marca)
            as: 'consumible' 
        }]
    });

    // Mapeamos para devolver solo la info útil del consumible
    const data = filtrosHermanos.map(f => f.consumible);

    return NextResponse.json({ success: true, data });
}