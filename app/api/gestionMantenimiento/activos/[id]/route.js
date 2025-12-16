import { NextResponse } from 'next/server';
import sequelize from '@/sequelize';
import { del } from '@vercel/blob'; // Solo se usa en DELETE
import { 
    Activo, 
    VehiculoInstancia, 
    RemolqueInstancia, 
    MaquinaInstancia,
    SubsistemaInstancia,
    OrdenMantenimiento,
    Inspeccion,
    Vehiculo, Remolque, Maquina
} from '@/models';

// ----------------------------------------------------------------------
// GET: Obtener Expediente Completo
// ----------------------------------------------------------------------
export async function GET(request, { params }) {
    const { id } = params;

    try {
        const activo = await Activo.findByPk(id, {
            include: [
                {
                    model: VehiculoInstancia,
                    as: 'detalleVehiculo',
                    include: [{ model: Vehiculo, as: 'plantilla' }]
                },
                {
                    model: RemolqueInstancia,
                    as: 'detalleRemolque',
                    include: [{ model: Remolque, as: 'plantilla' }]
                },
                {
                    model: MaquinaInstancia,
                    as: 'detalleMaquina',
                    include: [{ model: Maquina, as: 'plantilla' }]
                },
                {
                    model: SubsistemaInstancia,
                    as: 'subsistemas'
                },
                {
                    model: OrdenMantenimiento,
                    as: 'ordenesMantenimiento',
                    limit: 5,
                    order: [['createdAt', 'DESC']]
                },
                {
                    model: Inspeccion,
                    as: 'inspecciones',
                    limit: 5,
                    order: [['createdAt', 'DESC']]
                }
            ]
        });

        if (!activo) {
            return NextResponse.json({ success: false, message: 'Activo no encontrado' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: activo });

    } catch (error) {
        console.error("Error fetching activo:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// ----------------------------------------------------------------------
// PUT: Actualizar (Sin borrar imagen anterior en Vercel Blob)
// ----------------------------------------------------------------------
export async function PUT(request, { params }) {
    const { id } = params;
    const t = await sequelize.transaction();

    try {
        const activo = await Activo.findByPk(id, { transaction: t });
        if (!activo) throw new Error('Activo no encontrado');

        const body = await request.json();
        const { 
            codigoInterno, estado, ubicacionActual, imagen,
            placa, serialCarroceria, serialMotor, color, kilometrajeActual, horometroActual 
        } = body;

        // 1. Actualizar Activo Padre
        // Simplemente actualizamos el string de la URL si viene uno nuevo
        await activo.update({
            codigoInterno: codigoInterno || activo.codigoInterno,
            estado: estado || activo.estado,
            ubicacionActual: ubicacionActual || activo.ubicacionActual,
            imagen: imagen !== undefined ? imagen : activo.imagen 
        }, { transaction: t });

        // 2. Actualizar Instancia Hija
        if (activo.tipoActivo === 'Vehiculo' && activo.vehiculoInstanciaId) {
            await VehiculoInstancia.update({
                placa, serialCarroceria, serialMotor, color, kilometrajeActual, horometroActual
            }, { where: { id: activo.vehiculoInstanciaId }, transaction: t });
        }
        else if (activo.tipoActivo === 'Remolque' && activo.remolqueInstanciaId) {
            await RemolqueInstancia.update({
                placa, color
            }, { where: { id: activo.remolqueInstanciaId }, transaction: t });
        }
        else if (activo.tipoActivo === 'Maquina' && activo.maquinaInstanciaId) {
            await MaquinaInstancia.update({
                serialMotor, horometroActual
            }, { where: { id: activo.maquinaInstanciaId }, transaction: t });
        }

        await t.commit();
        return NextResponse.json({ success: true, message: 'Activo actualizado', data: activo });

    } catch (error) {
        await t.rollback();
        console.error("Error actualizando activo:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// ----------------------------------------------------------------------
// DELETE: Eliminar Activo (Aquí SÍ borramos la imagen)
// ----------------------------------------------------------------------
export async function DELETE(request, { params }) {
    const { id } = params;
    const t = await sequelize.transaction();

    try {
        const activo = await Activo.findByPk(id, { transaction: t });
        if (!activo) throw new Error('Activo no encontrado');

        // 1. Eliminar imagen de Vercel Blob (Limpieza)
        if (activo.imagen) {
            try {
                await del(activo.imagen);
            } catch (e) {
                console.warn("Advertencia: No se pudo borrar imagen del blob:", e.message);
                // Continuamos con el borrado de BD aunque falle el blob
            }
        }

        // 2. Eliminar Instancia Hija
        if (activo.tipoActivo === 'Vehiculo') {
            await VehiculoInstancia.destroy({ where: { id: activo.vehiculoInstanciaId }, transaction: t });
        } else if (activo.tipoActivo === 'Remolque') {
            await RemolqueInstancia.destroy({ where: { id: activo.remolqueInstanciaId }, transaction: t });
        } else if (activo.tipoActivo === 'Maquina') {
            await MaquinaInstancia.destroy({ where: { id: activo.maquinaInstanciaId }, transaction: t });
        }

        // 3. Eliminar el Activo Padre
        await activo.destroy({ transaction: t });

        await t.commit();
        return NextResponse.json({ success: true, message: 'Activo eliminado correctamente' });

    } catch (error) {
        await t.rollback();
        console.error("Error eliminando activo:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}