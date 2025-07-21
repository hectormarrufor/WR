// Ruta: app/api/recursoshumanos/guardias/route.js

import { NextResponse } from 'next/server';
import { Op } from 'sequelize';
import { RegistroGuardia } from '../../../models';
import sequelize from '../../../sequelize';



export async function POST(req) {
    try {
        const {
            empleadoId,
            fechaInicioGuardia,
            fechaFinGuardia,
            tipoGuardia,
            estadoGuardia = 'Planificada' // Valor por defecto si no se envía
        } = await req.json();

        // 1. Validación de datos de entrada
        if (!empleadoId || !fechaInicioGuardia || !fechaFinGuardia || !tipoGuardia) {
            return NextResponse.json({ message: 'Faltan campos requeridos (empleadoId, fechaInicio, fechaFin, tipoGuardia)' }, { status: 400 });
        }
        
        // 2. Validación CRÍTICA: Evitar guardias superpuestas (solapamiento)
        const guardiaExistente = await RegistroGuardia.findOne({
            where: {
                empleadoId: empleadoId,
                [Op.or]: [
                    { // La nueva guardia empieza durante una guardia existente
                        fechaInicioGuardia: {
                            [Op.between]: [fechaInicioGuardia, fechaFinGuardia]
                        }
                    },
                    { // La nueva guardia termina durante una guardia existente
                        fechaFinGuardia: {
                            [Op.between]: [fechaInicioGuardia, fechaFinGuardia]
                        }
                    },
                    { // La nueva guardia envuelve completamente a una existente
                        [Op.and]: [
                           { fechaInicioGuardia: { [Op.gte]: fechaInicioGuardia } },
                           { fechaFinGuardia: { [Op.lte]: fechaFinGuardia } }
                        ]
                    }
                ]
            }
        });

        if (guardiaExistente) {
            return NextResponse.json(
                { 
                    message: `Conflicto: El empleado ya tiene una guardia asignada que se solapa con el rango de fechas proporcionado.`,
                    guardiaEnConflicto: guardiaExistente
                },
                { status: 409 } // 409 Conflict es el código de estado adecuado
            );
        }

        // 3. Creación del registro en la base de datos
        const nuevaGuardia = await RegistroGuardia.create({
            empleadoId,
            fechaInicioGuardia,
            fechaFinGuardia,
            tipoGuardia,
            estadoGuardia
        });

        // 4. Respuesta exitosa
        return NextResponse.json(nuevaGuardia, { status: 201 });

    } catch (error) {
        console.error("Error al crear la guardia:", error);
        return NextResponse.json(
            { message: "Error interno del servidor", error: error.message },
            { status: 500 }
        );
    }
}