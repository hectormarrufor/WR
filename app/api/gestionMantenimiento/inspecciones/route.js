import { NextResponse } from "next/server";
import db from "@/models";
import { notificarCabezas } from '@/app/api/notificar/route';

export async function POST(request) {
    const t = await db.sequelize.transaction();
    try {
        const body = await request.json();
        const { activoId, usuarioId, kilometraje, horometro, origen, observacionGeneral, hallazgos } = body;

        const activo = await db.Activo.findByPk(activoId, {
            include: [
                {
                    model: db.VehiculoInstancia,
                    as: 'vehiculoInstancia',
                    include: [{ model: db.Vehiculo, as: 'plantilla' }]
                },
                {
                    model: db.MaquinaInstancia,
                    as: 'maquinaInstancia',
                    include: [{ model: db.Maquina, as: 'plantilla' }]
                },
                {
                    model: db.RemolqueInstancia,
                    as: 'remolqueInstancia',
                    include: [{ model: db.Remolque, as: 'plantilla' }]
                },
            ],
            transaction: t
        });

        if (!activo) throw new Error("Activo no encontrado");

        const plantillaId = activo.vehiculoInstancia?.vehiculoId || activo.maquinaInstancia?.maquinaId || activo.remolqueInstancia?.remolqueId;
        const tipoPlantilla = activo.vehiculoInstancia ? 'vehiculoId' : activo.maquinaInstancia ? 'maquinaId' : 'remolqueId';

        const nuevaInspeccion = await db.Inspeccion.create({
            fecha: new Date(), kilometrajeRegistrado: kilometraje || null, horometroRegistrado: horometro || null,
            observacionGeneral: observacionGeneral || 'Actualización de contadores', origen: origen || 'Rutina',
            activoId, usuarioId
        }, { transaction: t });

        let tieneFallaCriticaActual = false;
        let tieneAdvertenciaActual = false;

        if (hallazgos && Array.isArray(hallazgos)) {
            for (const h of hallazgos) {
                if (h.impacto === 'No Operativo') tieneFallaCriticaActual = true;
                if (h.impacto === 'Advertencia') tieneAdvertenciaActual = true;

                let subInstanciaIdFinal = h.subsistemaInstanciaId;
                let piezaInstaladaIdFinal = h.consumibleInstaladoId;

                // A. Subsistema Nuevo
                if (!subInstanciaIdFinal && h.nombreSubsistemaNuevo) {
                    const [subPlantilla] = await db.Subsistema.findOrCreate({
                        where: { nombre: h.nombreSubsistemaNuevo, [tipoPlantilla]: plantillaId },
                        defaults: { categoria: h.categoriaSubsistemaNuevo || 'otros' },
                        transaction: t
                    });

                    const [subInstancia] = await db.SubsistemaInstancia.findOrCreate({
                        where: { activoId: activo.id, subsistemaId: subPlantilla.id },
                        defaults: { nombre: h.nombreSubsistemaNuevo },
                        transaction: t
                    });
                    subInstanciaIdFinal = subInstancia.id;
                }

                // B. Resolución de Pieza y Catálogo
                if (!piezaInstaladaIdFinal && (h.consumibleIdGlobal || h.nombrePiezaNueva) && subInstanciaIdFinal) {
                    const instanciaActual = await db.SubsistemaInstancia.findByPk(subInstanciaIdFinal, { transaction: t });

                    let fichaTecnicaId = h.consumibleIdGlobal;
                    let clasificacionFinal = h.clasificacionPiezaNueva;
                    let categoriaFinal = h.categoriaPiezaNueva;
                    let nombreCriterio = h.nombrePiezaNueva;

                    if (fichaTecnicaId) {
                        const itemGlobal = await db.Consumible.findByPk(fichaTecnicaId, { transaction: t });
                        if (itemGlobal) {
                            clasificacionFinal = itemGlobal.tipo === 'serializado' ? 'Serializado' : 'Fungible';
                            categoriaFinal = itemGlobal.categoria;
                            nombreCriterio = itemGlobal.nombre;
                        }
                    } else {
                        const [fichaTecnica] = await db.Consumible.findOrCreate({
                            where: { nombre: h.nombrePiezaNueva },
                            defaults: {
                                tipo: h.clasificacionPiezaNueva.toLowerCase(),
                                categoria: h.categoriaPiezaNueva.toLowerCase(),
                                tipoSpecifico: h.categoriaPiezaNueva !== 'Repuesto General' ? h.categoriaPiezaNueva : 'General',
                                stockAlmacen: 0,
                                stockAsignado: h.cantidadSlots || 1,
                                stockMinimo: 0,
                                unidadMedida: h.categoriaPiezaNueva === 'Aceite' ? 'litros' : 'unidades',
                                precioPromedio: 0,
                                datosTecnicos: {
                                    marca: h.marcaPieza || null,
                                    codigo: h.codigoPieza || null,
                                    modelo: h.modeloPieza || null,
                                    medida: h.categoriaPiezaNueva === 'Neumatico' ? h.medidaPieza : null,
                                    viscosidad: h.categoriaPiezaNueva === 'Aceite' ? h.medidaPieza : null,
                                    amperaje: h.amperajePieza || null
                                }
                            },
                            transaction: t
                        });
                        fichaTecnicaId = fichaTecnica.id;
                    }

                    const [recomendado] = await db.ConsumibleRecomendado.findOrCreate({
                        where: { subsistemaId: instanciaActual.subsistemaId, consumibleId: fichaTecnicaId },
                        defaults: {
                            cantidad: h.cantidadSlots || 1,
                            valorCriterio: nombreCriterio,
                            categoria: categoriaFinal.toLowerCase()
                        },
                        transaction: t
                    });

                    const cantidadAInstalar = h.cantidadSlots || 1;
                    const piezasAveriadasIds = [];

                    // 🔥 LÓGICA DE INSTALACIÓN ADAPTADA PARA "FALTANTES"
                    if (clasificacionFinal === 'Serializado') {
                        const serialesFormulario = h.serialesNuevos || [];
                        const indicesDañados = h.serialesFallaIndices || [0];

                        for (let i = 0; i < cantidadAInstalar; i++) {
                            let nuevoSerialId = null;
                            let estadoInstalacion = 'instalado';
                            let ubicacionInstalacion = 'Registrado sano en Inspección';
                            let esDañado = indicesDañados.includes(i);

                            if (h.esFaltante) {
                                estadoInstalacion = 'faltante';
                                ubicacionInstalacion = 'Pieza Faltante / Extraviada';
                                esDañado = true; // Todo faltante es automáticamente un hallazgo
                            } else {
                                let serialAsignado = serialesFormulario[i] ? serialesFormulario[i].trim() : '';
                                if (!serialAsignado) serialAsignado = `S/N-${Date.now().toString().slice(-5)}-${i + 1}`;

                                const nuevoSerial = await db.ConsumibleSerializado.create({
                                    serial: serialAsignado,
                                    consumibleId: fichaTecnicaId
                                }, { transaction: t });
                                nuevoSerialId = nuevoSerial.id;

                                if (esDañado) ubicacionInstalacion = 'Detectado dañado en Inspección';
                            }

                            const nuevaInstalacion = await db.ConsumibleInstalado.create({
                                subsistemaInstanciaId: subInstanciaIdFinal,
                                recomendacionId: recomendado.id,
                                consumibleId: fichaTecnicaId,
                                estado: estadoInstalacion,
                                ubicacion: ubicacionInstalacion,
                                serialId: nuevoSerialId // Será null si es faltante
                            }, { transaction: t });

                            if (esDañado) piezasAveriadasIds.push(nuevaInstalacion.id);
                        }
                    } else {
                        // ES FUNGIBLE
                        const estadoInstalacion = h.esFaltante ? 'faltante' : 'instalado';
                        const ubicacionInstalacion = h.esFaltante ? 'Pieza Faltante / Extraviada' : 'Identificado en Inspección';

                        const nuevaInstalacion = await db.ConsumibleInstalado.create({
                            subsistemaInstanciaId: subInstanciaIdFinal,
                            recomendacionId: recomendado.id,
                            consumibleId: fichaTecnicaId,
                            estado: estadoInstalacion,
                            ubicacion: ubicacionInstalacion,
                            cantidad: cantidadAInstalar
                        }, { transaction: t });

                        const fallasFungibles = h.esFaltante ? cantidadAInstalar : (h.cantidadFallaFungible || 1);
                        for (let i = 0; i < fallasFungibles; i++) {
                            piezasAveriadasIds.push(nuevaInstalacion.id);
                        }
                    }

                    for (const piezaDañadaId of piezasAveriadasIds) {
                        await db.Hallazgo.create({
                            descripcion: h.descripcion,
                            impacto: h.impacto,
                            estado: 'Pendiente',
                            inspeccionId: nuevaInspeccion.id,
                            subsistemaInstanciaId: subInstanciaIdFinal,
                            consumibleInstaladoId: piezaDañadaId
                        }, { transaction: t });
                    }

                    piezaInstaladaIdFinal = null;
                    h.yaProcesadoMultiples = true; 
                }

                // C. Hallazgo Estándar (Sin pieza)
                if (!h.yaProcesadoMultiples) {
                    await db.Hallazgo.create({
                        descripcion: h.descripcion,
                        impacto: h.impacto,
                        estado: 'Pendiente',
                        inspeccionId: nuevaInspeccion.id,
                        subsistemaInstanciaId: subInstanciaIdFinal,
                        consumibleInstaladoId: piezaInstaladaIdFinal
                    }, { transaction: t });
                }
            }
        }

        if (activo.vehiculoInstancia && kilometraje) {
            await activo.vehiculoInstancia.update({ kilometrajeActual: kilometraje }, { transaction: t });
            await db.Kilometraje.create({ activoId, valor: kilometraje, fecha_registro: new Date(), origen: 'Inspeccion' }, { transaction: t });
        }
        if (activo.maquinaInstancia && horometro) {
            await activo.maquinaInstancia.update({ horometroActual: horometro }, { transaction: t });
            await db.Horometro.create({ activoId, valor: horometro, fecha_registro: new Date(), origen: 'Inspeccion' }, { transaction: t });
        }

        let estadoFinal = activo.estado;
        if (estadoFinal !== 'Desincorporado') {
            const ordenesAbiertas = await db.OrdenMantenimiento.count({
                where: { activoId: activo.id, estado: { [db.Sequelize.Op.in]: ['Diagnostico', 'Esperando Stock', 'Por Ejecutar', 'En Ejecucion'] } },
                transaction: t
            });

            const subsistemas = await db.SubsistemaInstancia.findAll({ where: { activoId: activo.id }, transaction: t });
            const tienePiezaCritica = subsistemas.some(s => ['roto', 'critico', 'no operativo'].includes(s.estado?.toLowerCase()));
            const tienePiezaLeve = subsistemas.some(s => ['advertencia', 'regular', 'desgaste'].includes(s.estado?.toLowerCase()));

            const inspeccionesDelActivo = await db.Inspeccion.findAll({ where: { activoId: activo.id }, attributes: ['id'], transaction: t });
            const inspeccionIds = inspeccionesDelActivo.map(i => i.id);
            const hallazgosPendientes = await db.Hallazgo.findAll({ where: { inspeccionId: inspeccionIds, estado: 'Pendiente' }, transaction: t });

            const tieneHallazgoCritico = hallazgosPendientes.some(h => h.impacto === 'No Operativo');
            const tieneHallazgoLeve = hallazgosPendientes.some(h => h.impacto === 'Advertencia');

            if (ordenesAbiertas > 0) estadoFinal = 'En Mantenimiento';
            else if (tienePiezaCritica || tieneHallazgoCritico) estadoFinal = 'No Operativo';
            else if (activo.horasAnuales === undefined || Number(activo.horasAnuales) <= 0) estadoFinal = 'Inactivo';
            else if (tienePiezaLeve || tieneHallazgoLeve) estadoFinal = 'Advertencia';
            else estadoFinal = 'Operativo';
        }

        if (estadoFinal !== activo.estado) {
            await activo.update({ estado: estadoFinal }, { transaction: t });
        }

        await t.commit();

        if (tieneFallaCriticaActual || tieneAdvertenciaActual) {
            const nombreEquipo = activo.vehiculoInstancia ? activo.vehiculoInstancia.plantilla.tipoVehiculo : activo.remolqueInstancia ? activo.remolqueInstancia.plantilla.tipoRemolque : activo.maquinaInstancia.plantilla.tipo;
            const placa = activo.vehiculoInstancia ? activo.vehiculoInstancia.placa : activo.remolqueInstancia ? activo.remolqueInstancia.placa : activo.maquinaInstancia?.placa || '';

            await notificarCabezas({
                title: tieneFallaCriticaActual ? `🚨 PARADA DE EQUIPO: ${nombreEquipo} (${placa})` : `⚠️ Advertencia en Equipo: ${nombreEquipo} (${placa})`,
                body: tieneFallaCriticaActual ? `Se reportó una falla CRÍTICA. El equipo ha pasado a NO OPERATIVO.` : `Se ha reportado una falla leve que requiere revisión en taller.`,
                url: `/superuser/flota/activos/${activo.id}`,
                tag: tieneFallaCriticaActual ? 'falla-critica' : 'falla-leve'
            });
        }

        return NextResponse.json({ success: true, message: 'Inspección procesada con éxito' });

    } catch (error) {
        if (t && !t.finished) await t.rollback();
        console.error("Error en POST inspecciones:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}