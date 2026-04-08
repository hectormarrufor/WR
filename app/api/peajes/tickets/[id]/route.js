import { NextResponse } from 'next/server';
import sequelize from '@/sequelize';
import { TicketPeaje, GastoVariable } from '@/models';

// ==========================================
// RUTA PUT (Editar ticket y gasto vinculado)
// ==========================================
export async function PUT(request, { params }) {
    const t = await sequelize.transaction();

    try {
        const { id } = await params;
        const body = await request.json();

        // 1. Validaciones de campos críticos
        if (!body.peajeId || !body.choferId || !body.monto || !body.fecha || !body.tasaBcv || !body.montoUsd) {
            throw new Error("Faltan campos obligatorios para la actualización.");
        }

        // 2. Buscar el ticket existente
        const ticket = await TicketPeaje.findByPk(id, { transaction: t });
        if (!ticket) {
            throw new Error("El ticket que intentas editar no existe.");
        }

        // 3. Actualizar el Gasto Financiero vinculado (Tesorería)
        // Mantenemos la lógica de que en GastoVariable la moneda es 'USD'
        if (ticket.gastoVariableId) {
            await GastoVariable.update({
                fechaGasto: body.fecha,
                monto: parseFloat(body.montoUsd), // Monto en USD
                moneda: 'USD',
                descripcion: `Pago de peaje (Editado) - Ref: ${body.referencia || 'S/N'} (Tasa: ${body.tasaBcv} BS)`,
                referenciaExterna: body.referencia || null,
                empleadoId: body.choferId,
                fleteId: body.fleteId || null 
            }, { 
                where: { id: ticket.gastoVariableId },
                transaction: t 
            });
        }

        // 4. Actualizar el Registro Operativo (Ticket)
        await ticket.update({
            fecha: body.fecha,
            monto: parseFloat(body.monto),        // BS
            tasaBcv: parseFloat(body.tasaBcv),    // Tasa
            montoUsd: parseFloat(body.montoUsd),  // USD
            referencia: body.referencia || null,
            ejes: body.ejes ? parseInt(body.ejes, 10) : null,
            fotoTicket: body.fotoTicket || null,
            peajeId: body.peajeId,
            choferId: body.choferId,
            fleteId: body.fleteId || null
        }, { transaction: t });

        await t.commit();

        return NextResponse.json({
            success: true,
            message: 'Ticket y gasto financiero actualizados correctamente.',
            data: ticket
        });

    } catch (error) {
        await t.rollback();
        console.error("Error editando ticket de peaje:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// ==========================================
// RUTA DELETE (Anular ticket y gasto)
// ==========================================
export async function DELETE(request, { params }) {
    const t = await sequelize.transaction();
    
    try {
        const { id } = await params;
        
        const ticket = await TicketPeaje.findByPk(id, { transaction: t });
        
        if (!ticket) {
            throw new Error("El ticket que intentas eliminar no existe.");
        }

        // 1. Eliminación en cascada manual del gasto financiero
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