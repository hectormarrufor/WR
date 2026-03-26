import { NextResponse } from "next/server";
import db, { Equipo, Maquina, Remolque, Vehiculo } from "@/models";
import { notificarCabezas } from '@/app/api/notificar/route';
import { Requisicion, RequisicionDetalle, Consumible, OrdenMantenimiento, User, Hallazgo, Empleado } from '@/models';

export async function GET(req) {
    try {
        // 1. Buscamos las Requisiciones (Base)
        const requisicionesRaw = await db.Requisicion.findAll({
            order: [['createdAt', 'DESC']],
            include: [
                {
                    model: db.User,
                    as: 'solicitante',
                    attributes: ['user'],
                    include: [{ model: db.Empleado, as: 'empleado', attributes: ['nombre', 'apellido'] }]
                },
                {
                    model: db.RequisicionDetalle,
                    as: 'detalles',
                    include: [{ model: db.Consumible, as: 'consumible' }]
                },
                {
                    model: db.Cotizacion,
                    as: 'cotizaciones',
                    include: [
                        { model: db.Proveedor, as: 'proveedor', attributes: ['nombre'] },
                        { model: db.CotizacionDetalle, as: 'detalles' } // Fundamental para cruzar precios
                    ]
                }
            ]
        });

        // 2. Extraemos todos los IDs de Hallazgos que no sean nulos
        const hallazgoIds = [...new Set(requisicionesRaw.map(r => r.hallazgoId).filter(id => id))];

        // 3. Consulta SEPARADA para los Hallazgos (Ruta corta = No hay minificación)
        const hallazgosData = await db.Hallazgo.findAll({
            where: { id: hallazgoIds },
            include: [{
                model: db.Inspeccion,
                as: 'inspeccion',
                include: [{
                    model: db.Activo,
                    as: 'activo',
                    include: [
                        { association: 'vehiculoInstancia', include: [{ association: 'plantilla' }] },
                        { association: 'remolqueInstancia', include: [{ association: 'plantilla' }] },
                        { association: 'maquinaInstancia', include: [{ association: 'plantilla' }] }
                    ]
                }]
            }]
        });

        // Creamos un mapa para búsqueda rápida O(1)
        const hallazgosMap = new Map(hallazgosData.map(h => [h.id, h.toJSON()]));

        // 4. Unimos la data
        const dataFinal = requisicionesRaw.map(req => {
            const r = req.toJSON();
            if (r.hallazgoId) {
                r.hallazgoOrigen = hallazgosMap.get(r.hallazgoId);
            }
            return r;
        });

        return NextResponse.json({ success: true, data: dataFinal });
    } catch (error) {
        console.error("Error en GET Requisiciones:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}


export async function POST(request) {
    const t = await db.sequelize.transaction();
    try {
        const body = await request.json();
        const { hallazgoId, consumibleId, cantidadSolicitada, prioridad, justificacion, solicitadoPorId } = body;

        // 1. Generar Código (Ej: REQ-2026-0042)
        const year = new Date().getFullYear();
        const count = await db.Requisicion.count({ transaction: t });
        const codigo = `REQ-${year}-${String(count + 1).padStart(4, '0')}`;

        // 2. Crear Cabecera
        const nuevaRequisicion = await db.Requisicion.create({
            codigo,
            prioridad: prioridad || 'Media',
            justificacion,
            estado: 'Pendiente',
            solicitadoPorId,
            hallazgoId // 🔥 El puente necesario para la trazabilidad pre-ODT
        }, { transaction: t });

        // 3. Crear Detalle
        await db.RequisicionDetalle.create({
            requisicionId: nuevaRequisicion.id,
            consumibleId,
            cantidadSolicitada,
            estado: 'Pendiente'
        }, { transaction: t });

        // 4. Cambiar el estado del Hallazgo
        if (hallazgoId) {
            await db.Hallazgo.update(
                { estado: 'Esperando Repuesto' },
                { where: { id: hallazgoId }, transaction: t }
            );
        }

        await t.commit();

        // 5. Consultar la data armada para el PDF
        const reqCompleta = await db.Requisicion.findByPk(nuevaRequisicion.id, {
            include: [
                {
                    model: db.User,
                    as: 'solicitante',
                    attributes: ['user'], // 🔥 Corrección: El modelo User solo tiene la columna 'user'
                    include: [
                        {
                            model: db.Empleado,
                            as: 'empleado',
                            attributes: ['nombre', 'apellido'] // 🔥 Aquí sí traemos el nombre real
                        }
                    ]
                },
                {
                    model: db.RequisicionDetalle,
                    as: 'detalles',
                    include: [{ model: db.Consumible, as: 'consumible', attributes: ['nombre', 'unidadMedida', 'categoria'] }]
                }
            ]
        });

        // 6. Notificar a las cabezas
        await notificarCabezas({
            title: `🛒 Requisición de Compras: ${codigo}`,
            body: `Prioridad ${prioridad}. Se solicitan ${cantidadSolicitada} und(s) para atender el hallazgo #${hallazgoId}.`,
            url: `/superuser/compras/requisiciones/${nuevaRequisicion.id}`,
            tag: 'nueva-requisicion'
        });

        return NextResponse.json({ success: true, data: reqCompleta });

    } catch (error) {
        if (t && !t.finished) await t.rollback();
        console.error("Error en POST Requisicion:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}