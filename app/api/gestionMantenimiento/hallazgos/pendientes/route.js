import { NextResponse } from "next/server";
import db from "@/models";
import { Op } from "sequelize";

export async function GET() {
    try {
        const hallazgos = await db.Hallazgo.findAll({
            where: {
                estado: { [Op.notIn]: ['Cerrado', 'Reparado'] } // Quitamos 'Repuesto en Procura' para que sigan saliendo en la lista con su flag
            },
            order: [['createdAt', 'DESC']],
            include: [
                {
                    model: db.Requisicion,
                    as: 'requisiciones', // 🔥 INCLUIMOS LA REQUISICIÓN PARA EL FLAG
                    attributes: ['id', 'codigo', 'estado']
                },
                {
                    model: db.Inspeccion,
                    as: 'inspeccion',
                    include: [
                        {
                            model: db.User,
                            as: 'reportadoPor',
                            attributes: ['user'],
                            include: [{ model: db.Empleado, as: 'empleado', attributes: ['nombre', 'apellido'] }]
                        },
                        {
                            model: db.Activo,
                            as: 'activo',
                            include: [
                                { association: 'vehiculoInstancia', include: [{ association: 'plantilla' }] },
                                { association: 'remolqueInstancia', include: [{ association: 'plantilla' }] },
                                { association: 'maquinaInstancia', include: [{ association: 'plantilla' }] }
                            ]
                        }
                    ]
                }
            ]
        });

        const dataLimpia = hallazgos.map(h => {
            const item = h.toJSON();
            const activo = item.inspeccion?.activo;
            if (activo) {
                const instancias = [activo.vehiculoInstancia, activo.remolqueInstancia, activo.maquinaInstancia];
                instancias.forEach(ins => {
                    if (ins?.plantilla) {
                        const p = ins.plantilla;
                        ins.plantilla = { ...p, marca: p.marca || p.ma, modelo: p.modelo || p.mo, tipo: p.tipoVehiculo || p.tipoRemolque || p.tipo || p.ti };
                    }
                });
            }
            return item;
        });

        return NextResponse.json({ success: true, data: dataLimpia });
    } catch (error) {
        console.error("Error obteniendo hallazgos:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}