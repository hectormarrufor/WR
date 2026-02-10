// app/api/tareas/route.js
import { NextResponse } from 'next/server';
import db from '@/models';
import { Op } from 'sequelize';
import { notificarAdminsYUnUsuario } from '../notificar/route';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const esPresidencia = searchParams.get('esPresidencia') === 'true';


        if (!userId) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

        let whereCondition = {};

        if (esPresidencia) {
            // Presidencia ve: Las que creó, las asignadas a él, Y las generales
            whereCondition = {
                [Op.or]: [
                    { creadoPorId: userId },
                    { asignadoAId: userId },
                    { asignadoAId: null } // <--- Tareas Generales
                ]
            };
        } else {
            // Empleado normal ve: Las asignadas a él Y las generales
            whereCondition = {
                [Op.or]: [
                    { asignadoAId: userId },
                    { asignadoAId: null } // <--- Tareas Generales
                ]
            };
        }

        const tareas = await db.Tarea.findAll({
            where: whereCondition,
            include: [
                { model: db.User, as: 'creador', include: [{ model: db.Empleado, as: 'empleado' }] },
                { model: db.User, as: 'responsable', include: [{ model: db.Empleado, as: 'empleado' }] }
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
        let { titulo, descripcion, prioridad, fechaVencimiento, creadoPorId, asignadoAId } = body;

        // Si asignadoAId es 'general' o string vacío, lo forzamos a null
        if (asignadoAId === 'general' || asignadoAId === '') {
            asignadoAId = null;
        }

        const transaction = await db.sequelize.transaction();
        try {
            const usuario = asignadoAId ? await db.User.findByPk(asignadoAId, { transaction }) : null;
            if (usuario) {
                await usuario.reload({
                    include: [{ model: db.Empleado, as: 'empleado', atributes: ['nombre', 'apellido'] }],
                    transaction
                });
            }
            

            if (asignadoAId && !usuario) {
            await transaction.rollback();
            return NextResponse.json({ error: 'usuario asignado no encontrado' }, { status: 404 });
            }

            const nuevaTarea = await db.Tarea.create({
            titulo, descripcion, prioridad, fechaVencimiento, creadoPorId,
            asignadoAId,
            estado: 'Pendiente'
            }, { transaction });

            if (asignadoAId) {
            await notificarAdminsYUnUsuario(asignadoAId, {
                title: 'Nueva Tarea Asignada',
                body: `tarea asignada a ${usuario.empleado.nombre} ${usuario.empleado.apellido}: ${titulo}. Por favor, revisa el panel de tareas.`,
                url: `/superuser`
            });
            } else {
            await notificarAdmins({
                title: 'Nueva Tarea General',
                body: `Se ha creado una nueva tarea: "${titulo}". Por favor, revisa tu panel de tareas.`,
                url: `/superuser`
            });
            }

            await transaction.commit();
            return NextResponse.json(nuevaTarea);
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json({ error: 'Error creando tarea' }, { status: 500 });
    }
}