import { Flete, Cliente, Empleado, Activo } from '@/models';
import { NextResponse } from 'next/server';
import { Op } from 'sequelize';

// GET: listar fletes del mes actual
export async function GET() {
  try {
    const inicioMes = new Date();
    inicioMes.setDate(1);
    const finMes = new Date();
    finMes.setMonth(inicioMes.getMonth() + 1);
    finMes.setDate(0);

    const fletes = await Flete.findAll({
      where: {
        fechaSalida: { // Corrección: Era fechaSalida, no fecha
          [Op.between]: [inicioMes, finMes]
        }
      },
      include: [
        { model: Cliente },
        { model: Empleado, as: 'chofer' },
        { model: Activo, as: 'vehiculo' }
      ],
      order: [['fechaSalida', 'DESC']]
    });

    return NextResponse.json(fletes);
  } catch (error) {
    console.error("Error GET Fletes:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: registrar nuevo flete
export async function POST(req) {
  try {
    const body = await req.json();

    // 🛠️ Limpieza de datos: El frontend envía los JSON como strings. 
    // Sequelize prefiere que sean objetos reales para guardarlos en columnas JSON nativas.
    if (typeof body.tramos === 'string') {
        try { body.tramos = JSON.parse(body.tramos); } catch (e) { body.tramos = []; }
    }
    if (typeof body.waypoints === 'string') {
        try { body.waypoints = JSON.parse(body.waypoints); } catch (e) { body.waypoints = []; }
    }
    if (typeof body.breakdown === 'string') {
        try { body.breakdown = JSON.parse(body.breakdown); } catch (e) { body.breakdown = null; }
    }

    const nuevoFlete = await Flete.create(body);
    
    return NextResponse.json(nuevoFlete, { status: 201 });
  } catch (error) {
    console.error("Error POST Flete:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}