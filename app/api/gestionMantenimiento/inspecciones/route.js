import { NextResponse } from "next/server";
import db from "@/models";
import { notificarCabezas } from '@/app/api/notificar/route';

export async function POST(request) {
    const t = await db.sequelize.transaction();
    try {
        const body = await request.json();
        const { activoId, usuarioId, kilometraje, horometro, origen, observacionGeneral, hallazgos } = body;

        // Recuperamos el activo para saber a qué plantilla maestra pertenece
        const activo = await db.Activo.findByPk(activoId, {
            include: [
                {
                    model: db.VehiculoInstancia,
                    as: 'vehiculoInstancia',
                    include: [{ model: db.Vehiculo, as: 'plantilla' }] // 🔥 Faltaba esto
                },
                {
                    model: db.MaquinaInstancia,
                    as: 'maquinaInstancia',
                    include: [{ model: db.Maquina, as: 'plantilla' }] // 🔥 Faltaba esto
                },
                {
                    model: db.RemolqueInstancia,
                    as: 'remolqueInstancia',
                    include: [{ model: db.Remolque, as: 'plantilla' }] // 🔥 Faltaba esto
                },
            ],
            transaction: t
        });

        if (!activo) throw new Error("Activo no encontrado");

        // Identificamos el ID y tipo de la Plantilla Global (Mack, CAT, etc.)
        const plantillaId = activo.vehiculoInstancia?.vehiculoId || activo.maquinaInstancia?.maquinaId || activo.remolqueInstancia?.remolqueId;
        const tipoPlantilla = activo.vehiculoInstancia ? 'vehiculoId' : activo.maquinaInstancia ? 'maquinaId' : 'remolqueId';

        // 1. Crear Inspección base
        const nuevaInspeccion = await db.Inspeccion.create({
            fecha: new Date(), kilometrajeRegistrado: kilometraje || null, horometroRegistrado: horometro || null,
            observacionGeneral: observacionGeneral || 'Actualización de contadores', origen: origen || 'Rutina',
            activoId, usuarioId
        }, { transaction: t });

        let tieneFallaCriticaActual = false;
        let tieneAdvertenciaActual = false;

        // 2. CREACIÓN INTELIGENTE DE HALLAZGOS Y ANATOMÍA
        if (hallazgos && Array.isArray(hallazgos)) {
            for (const h of hallazgos) {
                if (h.impacto === 'No Operativo') tieneFallaCriticaActual = true;
                if (h.impacto === 'Advertencia') tieneAdvertenciaActual = true;

                let subInstanciaIdFinal = h.subsistemaInstanciaId;
                let piezaInstaladaIdFinal = h.consumibleInstaladoId;

                // A. ¿Escribió un Subsistema Nuevo? -> Lo creamos en Plantilla y en Instancia
                if (!subInstanciaIdFinal && h.nombreSubsistemaNuevo) {
                    const [subPlantilla] = await db.Subsistema.findOrCreate({
                        where: { nombre: h.nombreSubsistemaNuevo, [tipoPlantilla]: plantillaId },

                        // 🔥 AQUÍ LEEMOS LA CATEGORÍA QUE ELIGIÓ EL USUARIO. 
                        // Si por alguna razón llega vacío, usamos 'otros' como salvavidas.
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

                // B. ¿Escribió una Pieza Nueva y tenemos un Subsistema válido?
                if (!piezaInstaladaIdFinal && h.nombrePiezaNueva && subInstanciaIdFinal) {
                    const instanciaActual = await db.SubsistemaInstancia.findByPk(subInstanciaIdFinal, { transaction: t });

                    // 1. CREAMOS EL REPUESTO EN EL INVENTARIO (Patrimonio de la empresa)
                    // 1. CREAMOS EL REPUESTO EN EL INVENTARIO
                    const [fichaTecnica] = await db.Consumible.findOrCreate({
                        where: { nombre: h.nombrePiezaNueva },
                        defaults: {
                            tipo: h.clasificacionPiezaNueva.toLowerCase(),
                            categoria: h.categoriaPiezaNueva.toLowerCase(),
                            tipoSpecifico: h.categoriaPiezaNueva !== 'Repuesto General' ? h.categoriaPiezaNueva : 'General',
                            stockAlmacen: 0,
                            stockAsignado: h.cantidadSlots || 1,
                            stockMinimo: 0,
                            // Si es aceite, le ponemos litros por defecto, si no, unidades
                            unidadMedida: h.categoriaPiezaNueva === 'Aceite' ? 'litros' : 'unidades',
                            precioPromedio: 0,

                            // 🔥 MAPEO DINÁMICO DE DATOS TÉCNICOS
                            datosTecnicos: {
                                marca: h.marcaPieza || null,
                                codigo: h.codigoPieza || null,
                                modelo: h.modeloPieza || null,
                                medida: h.categoriaPiezaNueva === 'Neumatico' ? h.medidaPieza : null,
                                viscosidad: h.categoriaPiezaNueva === 'Aceite' ? h.medidaPieza : null, // Reutilizamos el input de medida para la viscosidad
                                amperaje: h.amperajePieza || null
                            }
                        },
                        transaction: t
                    });

                    // 2. Crear el Slot Recomendado en la plantilla
                    const [recomendado] = await db.ConsumibleRecomendado.findOrCreate({
                        // 🔥 CORRECCIÓN 1: Usamos 'consumibleId' en lugar de 'fichaTecnicaId'
                        where: { subsistemaId: instanciaActual.subsistemaId, consumibleId: fichaTecnica.id },
                        defaults: {
                            cantidad: h.cantidadSlots || 1,
                            valorCriterio: h.nombrePiezaNueva,
                            // 🔥 PREVENCIÓN: Tu modelo exige que 'categoria' no sea nulo
                            categoria: h.categoriaPiezaNueva.toLowerCase()
                        },
                        transaction: t
                    });

                    const cantidadAInstalar = h.cantidadSlots || 1;
                    const piezasAveriadasIds = [];

                    // LÓGICA DE INSTALACIÓN (Serializados vs Fungibles)
                    if (h.clasificacionPiezaNueva === 'Serializado') {
                        const serialesFormulario = h.serialesNuevos || [];
                        const indicesDañados = h.serialesFallaIndices || [0];

                        for (let i = 0; i < cantidadAInstalar; i++) {
                            const esDañado = indicesDañados.includes(i);

                            let nuevoSerialId = null;

                            // 1. SI ES SERIALIZADO: Creamos el Serial FÍSICO primero
                            if (h.clasificacionPiezaNueva === 'Serializado') {
                                let serialAsignado = serialesFormulario[i] ? serialesFormulario[i].trim() : '';
                                if (!serialAsignado) serialAsignado = `S/N-${Date.now().toString().slice(-5)}-${i + 1}`;

                                // Usamos el nombre del modelo que vimos en tus asociaciones
                                const nuevoSerial = await db.ConsumibleSerializado.create({
                                    serial: serialAsignado,
                                    consumibleId: fichaTecnica.id // Vinculamos el serial al catálogo
                                }, { transaction: t });

                                nuevoSerialId = nuevoSerial.id;
                            }

                            // 2. CREAMOS LA INSTALACIÓN (Fungible o Serializada)
                            const nuevaInstalacion = await db.ConsumibleInstalado.create({
                                subsistemaInstanciaId: subInstanciaIdFinal,
                                recomendacionId: recomendado.id,
                                consumibleId: fichaTecnica.id,

                                // 🔥 SOLUCIÓN AL ENUM: Si lo descubrimos en el camión, está 'instalado'
                                estado: 'instalado',

                                ubicacion: esDañado ? 'Detectado dañado en Inspección' : 'Registrado sano en Inspección',

                                // 🔥 SOLUCIÓN A LA LLAVE FORÁNEA: Pasamos el ID del serial recién creado (si aplica)
                                serialId: nuevoSerialId
                            }, { transaction: t });

                            if (esDañado) piezasAveriadasIds.push(nuevaInstalacion.id);
                        }
                    } else {
                        // ES FUNGIBLE (Ej: 6 Bujías)
                        // Generalmente, los fungibles se manejan en 1 solo registro de instalación con un campo de cantidad
                        // o se asume la cantidad de la recomendación. Aquí creamos la instalación base.
                        const nuevaInstalacion = await db.ConsumibleInstalado.create({
                            subsistemaInstanciaId: subInstanciaIdFinal,
                            recomendacionId: recomendado.id,
                            consumibleId: fichaTecnica.id,
                            estado: 'instalado', // 🔥 SOLUCIÓN AL ENUM
                            ubicacion: 'Identificado en Inspección',
                            cantidad: h.cantidadSlots // Si tu modelo maneja lotes
                        }, { transaction: t });

                        // Empujamos el ID de la instalación fungible (multiplicado por la cantidad que falló)
                        const fallasFungibles = h.cantidadFallaFungible || 1;
                        for (let i = 0; i < fallasFungibles; i++) {
                            piezasAveriadasIds.push(nuevaInstalacion.id);
                        }
                    }

                    // 3. 🔥 DESGLOSE DE HALLAZGOS (MAGIA PURA)
                    // En lugar de crear 1 hallazgo, creamos 1 hallazgo POR CADA pieza averiada
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

                    // Limpiamos las variables originales para que el flujo maestro no duplique el hallazgo
                    piezaInstaladaIdFinal = null;
                    h.yaProcesadoMultiples = true; // Bandera para omitir la inserción final estándar
                }

                // C. CREACIÓN DEL HALLAZGO ESTÁNDAR (Si no era pieza nueva, o no se procesó en lote arriba)
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

        // 3. ACTUALIZACIÓN DE CONTADORES
        if (activo.vehiculoInstancia && kilometraje) {
            await activo.vehiculoInstancia.update({ kilometrajeActual: kilometraje }, { transaction: t });
            await db.Kilometraje.create({ activoId, valor: kilometraje, fecha_registro: new Date(), origen: 'Inspeccion' }, { transaction: t });
        }
        if (activo.maquinaInstancia && horometro) {
            await activo.maquinaInstancia.update({ horometroActual: horometro }, { transaction: t });
            await db.Horometro.create({ activoId, valor: horometro, fecha_registro: new Date(), origen: 'Inspeccion' }, { transaction: t });
        }

        // 4. LÓGICA DEL SEMÁFORO DE SALUD (Se mantiene exactamente igual que tu código)
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

        // 5. DISPARAR NOTIFICACIONES PUSH (Se mantiene igual)
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