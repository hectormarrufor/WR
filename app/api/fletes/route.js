// app/api/fletes/route.js
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

    // 🛠️ Limpieza de datos JSON stringificados desde el frontend
    const parseJSON = (field) => {
        if (typeof field === 'string') {
            try { return JSON.parse(field); } catch (e) { return null; }
        }
        return field;
    };

    body.waypoints = parseJSON(body.waypoints);
    body.tramos = parseJSON(body.tramos);
    body.breakdown = parseJSON(body.breakdown);

    // 🔥 CORRECCIÓN: Extracción de variables anidadas y saneamiento de strings vacíos a null
    // El frontend agrupa los recursos en 'chutos' y 'remolques', pero el modelo
    // Flete de Sequelize exige 'choferId' y 'activoPrincipalId' en la raíz.
    if (body.chutos && body.chutos.length > 0) {
        const chutoPrincipal = body.chutos[0];
        body.activoPrincipalId = chutoPrincipal.activoId || null;
        body.choferId = chutoPrincipal.choferId || null;
        body.ayudanteId = chutoPrincipal.ayudanteId || null;
    }
    
    if (body.remolques && body.remolques.length > 0) {
        const remolquePrincipal = body.remolques[0];
        body.remolqueId = remolquePrincipal.activoId || null;
    }

    const nuevoFlete = await Flete.create(body);
    
    return NextResponse.json(nuevoFlete, { status: 201 });
  } catch (error) {
    console.error("Error POST Flete:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}