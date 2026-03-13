import { NextResponse } from 'next/server';
import { Requisicion, RequisicionDetalle, Consumible, OrdenMantenimiento, User } from '@/models';

export async function GET(req) {
    try {
        const requisiciones = await Requisicion.findAll({
            order: [['createdAt', 'DESC']], // Las más nuevas primero
            include: [
                {
                    model: User,
                    as: 'solicitante',
                    attributes: ['nombre', 'apellido']
                },
                {
                    model: OrdenMantenimiento,
                    as: 'ordenOrigen',
                    attributes: ['codigo']
                },
                {
                    model: RequisicionDetalle,
                    as: 'detalles',
                    include: [
                        {
                            model: Consumible,
                            as: 'consumible',
                            attributes: ['nombre', 'unidadMedida']
                        }
                    ]
                }
            ]
        });

        return NextResponse.json({ success: true, data: requisiciones });
    } catch (error) {
        console.error("Error obteniendo requisiciones:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}