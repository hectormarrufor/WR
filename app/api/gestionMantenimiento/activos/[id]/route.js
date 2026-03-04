import { NextResponse } from 'next/server';
import sequelize from '@/sequelize';
import { del } from '@vercel/blob'; 
import {
    Activo, VehiculoInstancia, RemolqueInstancia, MaquinaInstancia,
    Vehiculo, Remolque, Maquina,
    SubsistemaInstancia, Subsistema, OrdenMantenimiento, Inspeccion,
    ConsumibleSerializado,
    ConsumibleRecomendado,
    ConsumibleInstalado,
    Consumible,
    Kilometraje,
    Horometro,
    CargaCombustible,
    MatrizCosto,
    Flete,
    DetalleMatrizCosto,
    ODT
} from '@/models';

// ----------------------------------------------------------------------
// GET: Obtener Detalle 
// ----------------------------------------------------------------------
export async function GET(request, { params }) {
    const { id } = await params; 

    try {
        const activo = await Activo.findByPk(id, {
            include: [
                {
                    model: VehiculoInstancia,
                    as: 'vehiculoInstancia',
                    include: [{ model: Vehiculo, as: 'plantilla' }],
                },
                {
                    model: Kilometraje,
                    as: 'registrosKilometraje',
                    limit: 15,
                    order: [['fecha_registro', 'ASC']] 
                },
                {
                    model: Horometro,
                    as: 'registrosHorometro',
                    limit: 15,
                    order: [['fecha_registro', 'ASC']]
                },
                {
                    model: CargaCombustible,
                    as: 'cargasCombustible',
                    limit: 10,
                    order: [['fecha', 'ASC']]
                },
                {
                    model: RemolqueInstancia,
                    as: 'remolqueInstancia',
                    include: [{ model: Remolque, as: 'plantilla' }]
                },
                {
                    model: MaquinaInstancia,
                    as: 'maquinaInstancia',
                    include: [{ model: Maquina, as: 'plantilla' }]
                },
                {
                    model: SubsistemaInstancia,
                    as: 'subsistemasInstancia',
                    include: [{
                        model: Subsistema, as: 'subsistemaPlantilla',
                        include: [{ model: ConsumibleRecomendado, as: 'listaRecomendada' }]
                    },
                    {
                        model: ConsumibleInstalado, as: 'instalaciones',
                        include: [{ model: Consumible, as: 'fichaTecnica' },
                        { model: ConsumibleSerializado, as: 'serialFisico' },
                        ]
                    },
                    ]
                },
                {
                    model: OrdenMantenimiento,
                    as: 'mantenimientos',
                    limit: 5,
                    order: [['createdAt', 'DESC']],
                    required: false
                },
                {
                    model: Inspeccion,
                    as: 'inspecciones',
                    limit: 5,
                    order: [['fecha', 'DESC']],
                    required: false
                },
                {
                    model: MatrizCosto,
                    as: 'matrizCosto',
                    include: [{model: DetalleMatrizCosto, as: 'detalles'}]
                },
                { model: Flete, as: 'fletesComoVehiculo' },
                { model: Flete, as: 'fletesComoRemolque' },
                { model: ODT, as: 'odtsComoPrincipal' },
                { model: ODT, as: 'odtsComoRemolque' },
                { model: ODT, as: 'odtsComoMaquinaria' },
            ],
        });

        if (!activo) {
            return NextResponse.json({ success: false, message: 'Activo no encontrado' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: activo });

    } catch (error) {
        console.error('Error fetching activo:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

// ----------------------------------------------------------------------
// PUT: Actualizar 
// ----------------------------------------------------------------------
export async function PUT(request, { params }) {

    console.log("Iniciando proceso de actualización de activo desde la put general...");
    const { id } = await params;
    const t = await sequelize.transaction();

    try {
        const activo = await Activo.findByPk(id, { transaction: t });

        if (!activo) {
            await t.rollback();
            return NextResponse.json({ success: false, message: 'Activo no encontrado' }, { status: 404 });
        }

        const body = await request.json();

        const {
            codigoInterno, estado, ubicacionActual, imagen,
            placa, serialChasis, serialMotor, color, kilometrajeActual, horometroActual,
            matrizCostoId, valorReposicion, vidaUtilAnios, valorSalvamento, horasAnuales,
            costoMantenimientoTeorico, costoPosesionTeorico, costoPosesionHora,
            tara, anioFabricacion
        } = body;

        // 🔥 Actualizar Activo Padre (ESTRICTAMENTE COSTOS) 🔥
        await activo.update({
            codigoInterno: codigoInterno || activo.codigoInterno,
            estado: estado || activo.estado,
            ubicacionActual: ubicacionActual || activo.ubicacionActual,
            imagen: imagen !== undefined ? imagen : activo.imagen,
            anio: anioFabricacion !== undefined ? parseInt(anioFabricacion) : activo.anio,
            tara: tara !== undefined && tara !== '' ? parseFloat(tara) : null, 
            capacidadTonelajeMax: body.capacidadCarga !== undefined && body.capacidadCarga !== '' ? parseFloat(body.capacidadCarga) : activo.capacidadTonelajeMax, 

            matrizCostoId: matrizCostoId ? parseInt(matrizCostoId) : activo.matrizCostoId,
            valorReposicion: valorReposicion !== undefined ? parseFloat(valorReposicion) : activo.valorReposicion,
            vidaUtilAnios: vidaUtilAnios !== undefined ? parseInt(vidaUtilAnios) : activo.vidaUtilAnios,
            valorSalvamento: valorSalvamento !== undefined ? parseFloat(valorSalvamento) : activo.valorSalvamento,
            horasAnuales: horasAnuales !== undefined ? parseInt(horasAnuales) : activo.horasAnuales,

            costoMantenimientoTeorico: costoMantenimientoTeorico !== undefined ? parseFloat(costoMantenimientoTeorico) : activo.costoMantenimientoTeorico,
            costoPosesionTeorico: costoPosesionTeorico !== undefined ? parseFloat(costoPosesionTeorico) : activo.costoPosesionTeorico,
            costoPosesionHora: costoPosesionHora !== undefined ? parseFloat(costoPosesionHora) : activo.costoPosesionHora

        }, { transaction: t });

        if (activo.tipoActivo === 'Vehiculo' && activo.vehiculoInstanciaId) {
            await VehiculoInstancia.update({
                placa, serialChasis, serialMotor, color,
                kilometrajeActual: kilometrajeActual !== undefined ? parseFloat(kilometrajeActual) : undefined,
                horometroActual: horometroActual !== undefined ? parseFloat(horometroActual) : undefined
            }, { where: { id: activo.vehiculoInstanciaId }, transaction: t }); 
        }
        else if (activo.tipoActivo === 'Remolque' && activo.remolqueInstanciaId) {
            await RemolqueInstancia.update({
                placa, color, serialChasis, serialMotor,
            }, { where: { id: activo.remolqueInstanciaId }, transaction: t }); 
        }
        else if (activo.tipoActivo === 'Maquina' && activo.maquinaInstanciaId) {
            await MaquinaInstancia.update({
                serialMotor,
                horometroActual: horometroActual !== undefined ? parseFloat(horometroActual) : undefined
            }, { where: { id: activo.maquinaInstanciaId }, transaction: t }); 
        }

        await t.commit();
        return NextResponse.json({ success: true, message: 'Activo actualizado correctamente', data: activo });

    } catch (error) {
        await t.rollback();
        console.error("Error actualizando activo:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// ----------------------------------------------------------------------
// DELETE: Eliminar Activo
// ----------------------------------------------------------------------
export async function DELETE(request, { params }) {
    const { id } = await params; 
    const t = await sequelize.transaction();

    try {
        const activo = await Activo.findByPk(id, { transaction: t });
        if (!activo) throw new Error('Activo no encontrado');

        if (activo.imagen) {
            try {
                const blobUrl = activo.imagen.startsWith('http')
                    ? activo.imagen
                    : `${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/${activo.imagen}`;

                await del(blobUrl);
                console.log(`[Blob] Imagen eliminada: ${blobUrl}`);
            } catch (e) {
                console.warn("Advertencia: No se pudo borrar imagen del blob:", e.message);
            }
        }

        if (activo.tipoActivo === 'Vehiculo' && activo.vehiculoInstanciaId) {
            await VehiculoInstancia.destroy({ where: { id: activo.vehiculoInstanciaId }, transaction: t });
        } else if (activo.tipoActivo === 'Remolque' && activo.remolqueInstanciaId) {
            await RemolqueInstancia.destroy({ where: { id: activo.remolqueInstanciaId }, transaction: t });
        } else if (activo.tipoActivo === 'Maquina' && activo.maquinaInstanciaId) {
            await MaquinaInstancia.destroy({ where: { id: activo.maquinaInstanciaId }, transaction: t });
        }

        await activo.destroy({ transaction: t });
        await t.commit();
        return NextResponse.json({ success: true, message: 'Activo y sus archivos eliminados correctamente' });

    } catch (error) {
        await t.rollback();
        console.error("Error eliminando activo:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}