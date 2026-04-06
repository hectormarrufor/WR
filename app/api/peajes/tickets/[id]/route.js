import { NextResponse } from 'next/server';
import sequelize from '@/sequelize';
import { TicketPeaje, GastoVariable } from '@/models';

export async function DELETE(request, { params }) {
    const t = await sequelize.transaction();
    
    try {
        const { id } = await params;
        
        const ticket = await TicketPeaje.findByPk(id, { transaction: t });
        
        if (!ticket) {
            throw new Error("El ticket que intentas eliminar no existe.");
        }

        // 1. Si el ticket generó un gasto financiero, lo eliminamos en cascada manualmente
        if (ticket.gastoVariableId) {
            await GastoVariable.destroy({ 
                where: { id: ticket.gastoVariableId }, 
                transaction: t 
            });
        }

        // 2. Eliminamos el ticket operativo
        await ticket.destroy({ transaction: t });

        await t.commit();
        
        return NextResponse.json({ 
            success: true, 
            message: 'Ticket y gasto financiero anulados correctamente.' 
        });

    } catch (error) {
        await t.rollback();
        console.error("Error eliminando ticket de peaje:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}