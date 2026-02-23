import { NextResponse } from 'next/server';
import sequelize from '@/sequelize';
import { del } from '@vercel/blob'; // <--- Importación vital para borrar imágenes
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
    CargaCombustible
} from '@/models';



// ----------------------------------------------------------------------
// GET: Obtener Detalle (Con todas las relaciones explicadas anteriormente)
// ----------------------------------------------------------------------
export async function GET(request, { params }) {
    const { id } = await params; // Next.js 15 requiere await

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
                    order: [['fecha_registro', 'ASC']] // ASC para el orden cronológico del gráfico
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
// PUT: Actualizar (Lógica original respetada + Transacciones)
// ----------------------------------------------------------------------
export async function PUT(request, { params }) {
    const { id } = await params; 
    
    const t = await sequelize.transaction();

    try {
        const activo = await Activo.findByPk(id, { transaction: t });

        if (!activo) {
            await t.rollback();
            return NextResponse.json({ success: false, message: 'Activo no encontrado' }, { status: 404 });
        }

        const body = await request.json();

        // 1. Extraemos TODOS los campos (Viejos + NUEVOS FINANCIEROS Y MATRIZ)
        const {
            codigoInterno, estado, ubicacionActual, imagen,
            placa, serialChasis, serialMotor, color, kilometrajeActual, horometroActual,
            // --- NUEVOS CAMPOS DEL FORMULARIO ---
            matrizCostoId, valorReposicion, vidaUtilAnios, valorSalvamento, horasAnuales,
            velocidadPromedioTeorica, costoMantenimientoTeorico, costoPosesionTeorico, costoPosesionHora,
            tara
        } = body;

        // 2. Actualizar Activo Padre (Incluyendo Financieros)
        await activo.update({
            codigoInterno: codigoInterno || activo.codigoInterno,
            estado: estado || activo.estado,
            ubicacionActual: ubicacionActual || activo.ubicacionActual,
            imagen: imagen !== undefined ? imagen : activo.imagen,
            tara: tara !== undefined && tara !== '' ? parseFloat(tara) : null, // <-- NUEVO CAMPO TARa
            
            // --- ACTUALIZACIÓN FINANCIERA ---
            matrizCostoId: matrizCostoId ? parseInt(matrizCostoId) : activo.matrizCostoId,
            valorReposicion: valorReposicion !== undefined ? parseFloat(valorReposicion) : activo.valorReposicion,
            vidaUtilAnios: vidaUtilAnios !== undefined ? parseInt(vidaUtilAnios) : activo.vidaUtilAnios,
            valorSalvamento: valorSalvamento !== undefined ? parseFloat(valorSalvamento) : activo.valorSalvamento,
            horasAnuales: horasAnuales !== undefined ? parseInt(horasAnuales) : activo.horasAnuales,
            
            // --- MÉTRICAS DE CÁLCULO PARA FLETECREATOR ---
            velocidadPromedioTeorica: velocidadPromedioTeorica !== undefined ? parseInt(velocidadPromedioTeorica) : activo.velocidadPromedioTeorica,
            costoMantenimientoTeorico: costoMantenimientoTeorico !== undefined ? parseFloat(costoMantenimientoTeorico) : activo.costoMantenimientoTeorico,
            costoPosesionTeorico: costoPosesionTeorico !== undefined ? parseFloat(costoPosesionTeorico) : activo.costoPosesionTeorico,
            costoPosesionHora: costoPosesionHora !== undefined ? parseFloat(costoPosesionHora) : activo.costoPosesionHora

        }, { transaction: t });

        // 3. Actualizar Instancia Hija según tipo
// 3. Actualizar Instancia Hija según tipo
        if (activo.tipoActivo === 'Vehiculo' && activo.vehiculoInstanciaId) {
            await VehiculoInstancia.update({
                placa, serialChasis, serialMotor, color, 
                kilometrajeActual: kilometrajeActual !== undefined ? parseFloat(kilometrajeActual) : undefined,
                horometroActual: horometroActual !== undefined ? parseFloat(horometroActual) : undefined
            }, { where: { id: activo.vehiculoInstanciaId }, transaction: t }); // <-- CORREGIDO AQUÍ
        }
        else if (activo.tipoActivo === 'Remolque' && activo.remolqueInstanciaId) {
            await RemolqueInstancia.update({
                placa, color
            }, { where: { id: activo.remolqueInstanciaId }, transaction: t }); // <-- CORREGIDO AQUÍ
        }
        else if (activo.tipoActivo === 'Maquina' && activo.maquinaInstanciaId) {
            await MaquinaInstancia.update({
                serialMotor, 
                horometroActual: horometroActual !== undefined ? parseFloat(horometroActual) : undefined
            }, { where: { id: activo.maquinaInstanciaId }, transaction: t }); // <-- CORREGIDO AQUÍ
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
// DELETE: Eliminar Activo (Con borrado de imagen en Vercel Blob)
// ----------------------------------------------------------------------
export async function DELETE(request, { params }) {
    const { id } = await params; // Next.js 15 requiere await
    const t = await sequelize.transaction();

    try {
        const activo = await Activo.findByPk(id, { transaction: t });
        if (!activo) throw new Error('Activo no encontrado');

        // 1. Eliminar imagen de Vercel Blob (Limpieza)
        // NOTA: 'del' requiere la URL completa. Si en BD guardas solo el nombre,
        // concatenamos la URL base. Si guardas la URL completa, usa activo.imagen directo.
        if (activo.imagen) {
            try {
                // Construimos la URL completa si lo que tienes guardado es solo el nombre del archivo
                const blobUrl = activo.imagen.startsWith('http')
                    ? activo.imagen
                    : `${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/${activo.imagen}`;

                await del(blobUrl);
                console.log(`[Blob] Imagen eliminada: ${blobUrl}`);
            } catch (e) {
                console.warn("Advertencia: No se pudo borrar imagen del blob (posiblemente ya no exista):", e.message);
                // No hacemos throw aquí para permitir que se borre el registro de la BD aunque falle el blob
            }
        }

        // 2. Eliminar Instancia Hija (Borrado manual explícito para seguridad)
        if (activo.tipoActivo === 'Vehiculo' && activo.vehiculoInstanciaId) {
            await VehiculoInstancia.destroy({ where: { id: activo.vehiculoInstanciaId }, transaction: t });
        } else if (activo.tipoActivo === 'Remolque' && activo.remolqueInstanciaId) {
            await RemolqueInstancia.destroy({ where: { id: activo.remolqueInstanciaId }, transaction: t });
        } else if (activo.tipoActivo === 'Maquina' && activo.maquinaInstanciaId) {
            await MaquinaInstancia.destroy({ where: { id: activo.maquinaInstanciaId }, transaction: t });
        }

        // 3. Eliminar el Activo Padre
        await activo.destroy({ transaction: t });

        await t.commit();
        return NextResponse.json({ success: true, message: 'Activo y sus archivos eliminados correctamente' });

    } catch (error) {
        await t.rollback();
        console.error("Error eliminando activo:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}