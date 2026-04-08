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
                { model: Flete, as: 'flete', attributes: ['id', 'nroFlete', 'descripcion'] }
            ],
            order: [['fecha', 'DESC'], ['hora', 'DESC']]
        });
        
        const baseUrl = process.env.NEXT_PUBLIC_BLOB_BASE_URL || '';

        const ticketsProcesados = tickets.map(t => {
            const ticket = t.toJSON();
            
            if (ticket.chofer && ticket.chofer.imagen) {
                if (!ticket.chofer.imagen.startsWith('http')) {
                    ticket.chofer.imagen = `${baseUrl}/${ticket.chofer.imagen}`;
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

        // Validación de hora incluida
        if (!body.peajeId || !body.choferId || !body.monto || !body.fecha || !body.hora || !body.tasaBcv) {
            throw new Error("Faltan campos obligatorios incluyendo la hora.");
        }

        // 2. Crear el Gasto Financiero (Tesorería)
        const nuevoGasto = await GastoVariable.create({
            fechaGasto: body.fecha,
            montoBs: parseFloat(body.monto),
            montoUsd: parseFloat(body.montoUsd),
            tasaBcv: parseFloat(body.tasaBcv),
            estado: 'Pagado', 
            tipoOrigen: 'Peajes',
            descripcion: `Pago de peaje (${body.hora}) - Ref: ${body.referencia || 'S/N'} (Tasa: ${body.tasaBcv} BS)`,
            referenciaExterna: body.referencia || null,
            fleteId: body.fleteId || null 
        }, { transaction: t });

        const nuevoTicket = await TicketPeaje.create({
            fecha: body.fecha,
            hora: body.hora, // 🔥 PERSISTENCIA DE HORA
            monto: parseFloat(body.monto),
            tasaBcv: parseFloat(body.tasaBcv),
            montoUsd: parseFloat(body.montoUsd),
            referencia: body.referencia || null,
            ejes: body.ejes ? parseInt(body.ejes, 10) : null,
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