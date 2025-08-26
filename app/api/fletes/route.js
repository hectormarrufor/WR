import { Flete } from '@/models';
import { NextResponse } from 'next/server';
import { Op } from 'sequelize';

// GET: listar fletes del mes actual
export async function GET() {
  const inicioMes = new Date();
  inicioMes.setDate(1);
  const finMes = new Date();
  finMes.setMonth(inicioMes.getMonth() + 1);
  finMes.setDate(0);

  const fletes = await Flete.findAll({
    where: {
      fecha: {
        [Op.between]: [inicioMes, finMes]
      }
    }
  });

  return NextResponse.json(fletes);
}

// POST: registrar nuevo flete
export async function POST(req) {
  const body = await req.json();
  const nuevo = await Flete.create(body);
  return NextResponse.json(nuevo);
}