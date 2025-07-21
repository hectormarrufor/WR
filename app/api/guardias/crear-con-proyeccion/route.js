// Ruta: app/api/recursoshumanos/guardias/crear-con-proyeccion/route.js

import { NextResponse } from 'next/server';

import { Empleado, Puesto, RegistroGuardia } from '../../../../models';
import sequelize from '../../../../sequelize';

// Define la lógica de los horarios de forma centralizada
const HORARIOS = {
    'Guardia 7x7': { diasTrabajo: 7, diasDescanso: 7 },
    'Guardia 3x3': { diasTrabajo: 3, diasDescanso: 3 },
    // Puedes añadir más tipos de guardia aquí
    'Oficina': { diasTrabajo: 0, diasDescanso: 0 }, // Para ignorar personal de oficina
    'Otro': { diasTrabajo: 0, diasDescanso: 0 },
};

export async function POST(req) {
    const { empleadoId, fechaInicioGuardia, proyectar } = await req.json();

    if (!empleadoId || !fechaInicioGuardia) {
        return NextResponse.json({ message: 'El ID del empleado y la fecha de inicio son requeridos' }, { status: 400 });
    }

    // Una transacción asegura que todas las operaciones de la base de datos se completen o ninguna lo haga.
    const t = await sequelize.transaction();

    try {
        const empleado = await Empleado.findByPk(empleadoId, {
            include: { model: Puesto, as: 'puestos' },
            transaction: t
        });

        if (!empleado) {
            await t.rollback();
            return NextResponse.json({ message: 'Empleado no encontrado' }, { status: 404 });
        }

        const puestoCampo = empleado.puestos.find(p => p.esCampo);
        const tipoHorario = puestoCampo?.tipoHorario;

        if (!tipoHorario || !HORARIOS[tipoHorario] || HORARIOS[tipoHorario].diasTrabajo === 0) {
            await t.rollback();
            return NextResponse.json({ message: 'El empleado no tiene un puesto de campo con un horario de guardia válido (ej. 7x7, 3x3)' }, { status: 400 });
        }

        const horario = HORARIOS[tipoHorario];
        const { diasTrabajo, diasDescanso } = horario;
        let fechaActual = new Date(fechaInicioGuardia + 'T00:00:00');

        // Borrar guardias futuras planificadas para este empleado para evitar solapamientos
        await RegistroGuardia.destroy({
            where: {
                empleadoId: empleado.id,
                estadoGuardia: 'Planificada',
                fechaInicioGuardia: {
                    [sequelize.Op.gte]: fechaActual
                }
            },
            transaction: t
        });
        
        const guardiasACrear = [];
        // Proyectar ~3 meses. Para 7x7 (14 días por ciclo), 6 iteraciones son ~84 días.
        const iteraciones = proyectar ? 6 : 1; 

        for (let i = 0; i < iteraciones; i++) {
            const fechaFin = new Date(fechaActual);
            fechaFin.setDate(fechaFin.getDate() + diasTrabajo - 1);

            guardiasACrear.push({
                empleadoId: empleado.id,
                fechaInicioGuardia: new Date(fechaActual),
                fechaFinGuardia: fechaFin,
                tipoGuardia: tipoHorario,
                estadoGuardia: 'Planificada',
            });

            // Preparamos la fecha de inicio para el siguiente ciclo de trabajo
            fechaActual.setDate(fechaActual.getDate() + diasTrabajo + diasDescanso);
        }
        
        await RegistroGuardia.bulkCreate(guardiasACrear, { transaction: t });

        await t.commit(); // Si todo salió bien, confirma los cambios en la BD
        
        return NextResponse.json({ message: 'Guardias creadas y proyectadas correctamente' }, { status: 201 });

    } catch (error) {
        await t.rollback(); // Si algo falla, revierte todos los cambios
        console.error('Error al crear guardias:', error);
        return NextResponse.json({ message: 'Error interno del servidor', error: error.message }, { status: 500 });
    }
}