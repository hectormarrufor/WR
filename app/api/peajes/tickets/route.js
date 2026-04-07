import { NextResponse } from 'next/server';
import sequelize from '@/sequelize';
import { TicketPeaje, Peaje, GastoVariable, Empleado, Flete } from '@/models';

// ==========================================
// RUTA GET (Historial de tickets)
// ==========================================
export async function GET() {
    try {
        const tickets = await TicketPeaje.findAll({
            include: [
                { model: Peaje, as: 'peaje', attributes: ['id', 'nombre'] },
                { model: Empleado, as: 'chofer', attributes: ['id', 'nombre', 'apellido', 'imagen'] },
                // 🔥 Reincorporamos Flete con sus campos reales 🔥
                { model: Flete, as: 'flete', attributes: ['id', 'nroFlete', 'descripcion'] }
            ],
            order: [['fecha', 'DESC'], ['createdAt', 'DESC']]
        });
        
        const baseUrl = process.env.NEXT_PUBLIC_BLOB_BASE_URL || '';

        const ticketsProcesados = tickets.map(t => {
            const ticket = t.toJSON();
            
            if (ticket.chofer && ticket.chofer.imagen) {
                if (!ticket.chofer.imagen.startsWith('http')) {
                    ticket.chofer.imagen = `${baseUrl}${ticket.chofer.imagen}`;
                }
            }
            
            return ticket;
        });

        return NextResponse.json({ success: true, data: ticketsProcesados });
    } catch (error) {
        console.error("Error obteniendo tickets de peaje:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// ==========================================
// RUTA POST (Crear ticket y gasto)
// ==========================================
export async function POST(request) {
    const t = await sequelize.transaction();

    try {
        const body = await request.json();

        // 1. Validaciones
        if (!body.peajeId || !body.choferId || !body.monto || !body.fecha) {
            throw new Error("Faltan campos obligatorios (Peaje, Chofer, Monto o Fecha)");
        }

        // 2. Crear el Gasto Financiero (Tesorería)
        const nuevoGasto = await GastoVariable.create({
            fechaGasto: body.fecha,
            monto: parseFloat(body.monto),
            moneda: 'USD',
            estado: 'Pendiente', 
            tipoOrigen: 'Peajes',
            descripcion: `Pago de peaje - Ref: ${body.referencia || 'S/N'}`,
            referenciaExterna: body.referencia || null,
            empleadoId: body.choferId,
            fleteId: body.fleteId || null 
        }, { transaction: t });

        // 3. Crear el Registro Operativo (Ticket físico)
        const nuevoTicket = await TicketPeaje.create({
            fecha: body.fecha,
            monto: parseFloat(body.monto),
            referencia: body.referencia || null,
            ejes: body.ejes ? parseInt(body.ejes, 10) : null, // 🔥 NUEVO CAMPO ATRAPADO
            fotoTicket: body.fotoTicket || null,
            peajeId: body.peajeId,
            choferId: body.choferId,
            fleteId: body.fleteId || null,
            gastoVariableId: nuevoGasto.id
        }, { transaction: t });

        await t.commit();

        return NextResponse.json({
            success: true,
            message: 'Ticket de peaje registrado y anexado a gastos correctamente.',
            data: nuevoTicket
        }, { status: 201 });

    } catch (error) {
        await t.rollback();
        console.error("Error registrando ticket de peaje:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}