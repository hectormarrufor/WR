// app/api/tareas/route.js
import { NextResponse } from 'next/server';
import db from '@/models';
import { Op } from 'sequelize';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const empleadoId = searchParams.get('empleadoId');
        const esPresidencia = searchParams.get('esPresidencia') === 'true';

        if (!empleadoId) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

        let whereCondition = {};

        if (esPresidencia) {
            // Presidencia ve: Las que creó, las asignadas a él, Y las generales
            whereCondition = {
                [Op.or]: [
                    { creadoPorId: empleadoId },
                    { asignadoAId: empleadoId },
                    { asignadoAId: null } // <--- Tareas Generales
                ]
            };
        } else {
            // Empleado normal ve: Las asignadas a él Y las generales
            whereCondition = {
                [Op.or]: [
                    { asignadoAId: empleadoId },
                    { asignadoAId: null } // <--- Tareas Generales
                ]
            };
        }

        const tareas = await db.Tarea.findAll({
            where: whereCondition,
            include: [
                { model: db.Empleado, as: 'creador', attributes: ['id', 'nombre', 'apellido'] },
                { model: db.Empleado, as: 'responsable', attributes: ['id', 'nombre', 'apellido'] }
            ],
            order: [['createdAt', 'DESC']]
        });

        return NextResponse.json(tareas);

    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        // asignadoAId ahora puede venir null o "general"
        let { titulo, descripcion, prioridad, fechaVencimiento, creadoPorId, asignadoAId } = body;

        // Si asignadoAId es 'general' o string vacío, lo forzamos a null
        if (asignadoAId === 'general' || asignadoAId === '') {
            asignadoAId = null;
        }

        const nuevaTarea = await db.Tarea.create({
            titulo, descripcion, prioridad, fechaVencimiento, creadoPorId,
            asignadoAId: asignadoAId, // Puede ser ID o null
            estado: 'Pendiente'
        });

        return NextResponse.json(nuevaTarea);
    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json({ error: 'Error creando tarea' }, { status: 500 });
    }
}