import { NextResponse } from 'next/server';
import sequelize from '@/sequelize';
import { 
    CargaCombustible, Activo, Consumible, Kilometraje,
    VehiculoInstancia, Vehiculo, RemolqueInstancia, Remolque,
    MaquinaInstancia, Maquina, SalidaInventario
} from '@/models';

// GET se mantiene intacto...
export async function GET() {
    try {
        const cargas = await CargaCombustible.findAll({
            include: [
                {
                    model: Activo,
                    as: 'activo',
                    attributes: ['id', 'codigoInterno', 'tipoActivo'], 
                    include: [
                        {
                            model: VehiculoInstancia,
                            as: 'vehiculoInstancia',
                            include: [{ model: Vehiculo, as: 'plantilla' }]
                        },
                        {
                            model: MaquinaInstancia,
                            as: 'maquinaInstancia',
                            include: [{ model: Maquina, as: 'plantilla' }]
                        },
                        {
                            model: RemolqueInstancia,
                            as: 'remolqueInstancia',
                            include: [{ model: Remolque, as: 'plantilla' }]
                        }
                    ]
                }
            ],
            order: [['fecha', 'DESC']]
        });

        const dataFormateada = cargas.map(carga => {
            const cargaJSON = carga.toJSON();
            let descripcionEquipo = 'Equipo Genérico';
            let placaEquipo = 'S/N';

            if (cargaJSON.activo) {
                if (cargaJSON.activo.vehiculoInstancia) {
                    descripcionEquipo = `${cargaJSON.activo.vehiculoInstancia.plantilla?.marca} ${cargaJSON.activo.vehiculoInstancia.plantilla?.modelo}`;
                    placaEquipo = cargaJSON.activo.vehiculoInstancia.placa;
                } else if (cargaJSON.activo.remolqueInstancia) {
                    descripcionEquipo = `${cargaJSON.activo.remolqueInstancia.plantilla?.marca} ${cargaJSON.activo.remolqueInstancia.plantilla?.modelo}`;
                    placaEquipo = cargaJSON.activo.remolqueInstancia.placa;
                } else if (cargaJSON.activo.maquinaInstancia) {
                    descripcionEquipo = `${cargaJSON.activo.maquinaInstancia.plantilla?.marca} ${cargaJSON.activo.maquinaInstancia.plantilla?.modelo}`;
                    placaEquipo = cargaJSON.activo.maquinaInstancia.serialMotor || 'S/N';
                }
            }

            return {
                ...cargaJSON,
                activo: {
                    ...cargaJSON.activo,
                    descripcion: descripcionEquipo,
                    identificadorExtra: placaEquipo
                }
            };
        });

        return NextResponse.json({ success: true, data: dataFormateada });
    } catch (error) {
        console.error("Error obteniendo historial de combustible:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// POST: Registrar despacho de combustible (CON APRENDIZAJE SEPARADO)
export async function POST(request) {
    const t = await sequelize.transaction();

    try {
        const body = await request.json();
        const { 
            activoId, origen, consumibleOrigenId, litros, costoTotal, 
            kilometrajeAlMomento, fullTanque, registradoPorId, 
            usarAforoVara, centimetrosVara, nivelAforadoAntesDeSurtir,
            guardarNuevoPuntoAforo, propagarPuntoModelo // NUEVAS VARIABLES
        } = body;

        const activo = await Activo.findByPk(activoId, { 
            include: [
                { model: VehiculoInstancia, as: 'vehiculoInstancia' },
                { model: MaquinaInstancia, as: 'maquinaInstancia' },
                { model: RemolqueInstancia, as: 'remolqueInstancia' }
            ],
            transaction: t 
        });
        
        if (!activo) throw new Error('El equipo seleccionado no existe.');

        const litrosDespachados = parseFloat(litros);
        const capacidadActivo = parseFloat(activo.capacidadTanque || 0);
        const nivelActualActivo = parseFloat(activo.nivelCombustible || 0);
        
        if (capacidadActivo <= 0) {
            throw new Error('El equipo no tiene capacidad de tanque registrada. Fíjela primero en su perfil.');
        }

        const espacioDisponibleActivo = capacidadActivo - nivelActualActivo;
        
        if (litrosDespachados > espacioDisponibleActivo) {
            throw new Error(`El despacho (${litrosDespachados}L) supera el espacio libre en el tanque del equipo (${espacioDisponibleActivo.toFixed(2)}L libres).`);
        }

        let costoAlMomentoSalida = 0; 

        if (origen === 'interno') {
            const tanque = await Consumible.findByPk(consumibleOrigenId, { transaction: t });
            
            if (!tanque) throw new Error('El tanque de origen no fue encontrado.');
            if (parseFloat(tanque.stockAlmacen) < litrosDespachados) {
                throw new Error(`Stock insuficiente. El tanque solo tiene ${tanque.stockAlmacen} L disponibles.`);
            }

            tanque.stockAlmacen = parseFloat(tanque.stockAlmacen) - litrosDespachados;
            costoAlMomentoSalida = tanque.precioPromedio; 
            await tanque.save({ transaction: t });

            await SalidaInventario.create({
                consumibleId: consumibleOrigenId,
                activoId: activoId,
                cantidad: litrosDespachados,
                costoAlMomento: costoAlMomentoSalida,
                justificacion: `Despacho de combustible registrado por operario.`,
                fecha: new Date()
            }, { transaction: t });
        }

        let kilometrosRecorridos = null;
        let rendimientoCalculado = null;
        let esTanqueFull = fullTanque; 
        
        const cargaAnterior = await CargaCombustible.findOne({
            where: { activoId, fullTanque: true },
            order: [['fecha', 'DESC']],
            transaction: t
        });

        if (cargaAnterior && parseFloat(kilometrajeAlMomento) > parseFloat(cargaAnterior.kilometrajeAlMomento)) {
            kilometrosRecorridos = parseFloat(kilometrajeAlMomento) - parseFloat(cargaAnterior.kilometrajeAlMomento);
            
            if (usarAforoVara && nivelAforadoAntesDeSurtir !== null) {
                const consumoReal = nivelActualActivo - parseFloat(nivelAforadoAntesDeSurtir);
                if (consumoReal > 0) {
                    if (activo.maquinaInstancia || activo.remolqueInstancia) rendimientoCalculado = parseFloat((consumoReal / kilometrosRecorridos).toFixed(2)); 
                    else rendimientoCalculado = parseFloat((kilometrosRecorridos / consumoReal).toFixed(2)); 
                }
                esTanqueFull = true; 
            } 
            else if (fullTanque && cargaAnterior.fullTanque) {
                if (activo.maquinaInstancia || activo.remolqueInstancia) rendimientoCalculado = parseFloat((litrosDespachados / kilometrosRecorridos).toFixed(2)); 
                else rendimientoCalculado = parseFloat((kilometrosRecorridos / litrosDespachados).toFixed(2)); 
            }
        } else if (usarAforoVara) {
            esTanqueFull = true;
        }

        // ✨ MACHINE LEARNING MANUAL MEJORADO Y SEGURO ✨
        if (guardarNuevoPuntoAforo && centimetrosVara && nivelAforadoAntesDeSurtir !== null) {
            
            // Función auxiliar para insertar/actualizar el punto en un JSONB
            const inyectarPuntoAforo = (configActualJSON) => {
                let config = configActualJSON ? JSON.parse(JSON.stringify(configActualJSON)) : { tablaAforo: [] };
                if (!config.tablaAforo) config.tablaAforo = [];
                
                const qtyTanques = parseInt(config.dimensiones?.cantidadTanques) || 1;
                const litrosPorUnidad = parseFloat(nivelAforadoAntesDeSurtir) / qtyTanques;
                const index = config.tablaAforo.findIndex(p => p.cm === parseFloat(centimetrosVara));
                
                if (index >= 0) config.tablaAforo[index].litros = litrosPorUnidad;
                else config.tablaAforo.push({ cm: parseFloat(centimetrosVara), litros: litrosPorUnidad });
                
                return config;
            };

            // 1. SIEMPRE APRENDE EL ACTIVO ACTUAL (Sea Aftermarket o no)
            activo.configuracionTanque = inyectarPuntoAforo(activo.configuracionTanque);
            activo.changed('configuracionTanque', true);
            await activo.save({ transaction: t });

            // 2. SI EL DESPACHADOR LO CONFIRMA COMO ORIGINAL, PROPAGAMOS AL MODELO MAESTRO
            if (propagarPuntoModelo) {
                let modeloDestino = null;
                let idPlantilla = null;
                let includeModel = null;
                let includeAs = null;
                let fkName = null;

                if (activo.vehiculoInstancia?.vehiculoId) {
                    modeloDestino = Vehiculo; idPlantilla = activo.vehiculoInstancia.vehiculoId; 
                    includeModel = VehiculoInstancia; includeAs = 'vehiculoInstancia'; fkName = 'vehiculoId';
                } else if (activo.remolqueInstancia?.remolqueId) {
                    modeloDestino = Remolque; idPlantilla = activo.remolqueInstancia.remolqueId;
                    includeModel = RemolqueInstancia; includeAs = 'remolqueInstancia'; fkName = 'remolqueId';
                } else if (activo.maquinaInstancia?.maquinaId) {
                    modeloDestino = Maquina; idPlantilla = activo.maquinaInstancia.maquinaId;
                    includeModel = MaquinaInstancia; includeAs = 'maquinaInstancia'; fkName = 'maquinaId';
                }

                if (modeloDestino && idPlantilla) {
                    const plantilla = await modeloDestino.findByPk(idPlantilla, { transaction: t });
                    if (plantilla) {
                        // Actualizar la plantilla
                        plantilla.configuracionTanque = inyectarPuntoAforo(plantilla.configuracionTanque);
                        plantilla.changed('configuracionTanque', true);
                        await plantilla.save({ transaction: t });

                        // Propagar a hermanos que usen la plantilla
                        const hermanos = await Activo.findAll({
                            include: [{ model: includeModel, as: includeAs, where: { [fkName]: idPlantilla }, required: true }],
                            transaction: t
                        });

                        for (const hermano of hermanos) {
                            if (hermano.id !== activo.id) {
                                hermano.configuracionTanque = inyectarPuntoAforo(hermano.configuracionTanque);
                                hermano.changed('configuracionTanque', true);
                                await hermano.save({ transaction: t });
                            }
                        }
                    }
                }
            }
        }

        const nuevoKilometraje = await Kilometraje.create({ activoId, valor: parseFloat(kilometrajeAlMomento), fecha_registro: new Date() }, { transaction: t });

        await CargaCombustible.create({
            activoId, fecha: new Date(), origen,
            consumibleOrigenId: origen === 'interno' ? consumibleOrigenId : null,
            litros: litrosDespachados, costoTotal: origen === 'externo' ? parseFloat(costoTotal) : null,
            kilometrajeAlMomento: parseFloat(kilometrajeAlMomento), kilometrosRecorridos, rendimientoCalculado,
            fullTanque: esTanqueFull, kilometrajeId: nuevoKilometraje.id, registradoPorId: registradoPorId || null,
            centimetrosVara: usarAforoVara ? parseFloat(centimetrosVara) : null,
            litrosAforados: usarAforoVara ? parseFloat(nivelAforadoAntesDeSurtir) : null
        }, { transaction: t });

        if (usarAforoVara && nivelAforadoAntesDeSurtir !== null) activo.nivelCombustible = parseFloat(nivelAforadoAntesDeSurtir) + litrosDespachados;
        else if (fullTanque) activo.nivelCombustible = capacidadActivo; 
        else activo.nivelCombustible = nivelActualActivo + litrosDespachados;

        if (activo.nivelCombustible > capacidadActivo) activo.nivelCombustible = capacidadActivo;

        // Doble validación de guardado por si no entró al Machine Learning
        await activo.save({ transaction: t });
        await t.commit();
        
        return NextResponse.json({ success: true, message: 'Despacho registrado y curva de aforo actualizada.' }, { status: 201 });

    } catch (error) {
        await t.rollback();
        console.error("Error procesando carga de combustible:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// DELETE: Eliminar un registro y revertir inventario (Se mantiene intacto...)
export async function DELETE(request, { params }) {
    const t = await sequelize.transaction();

    try {
        const { id } = await params;
        const carga = await CargaCombustible.findByPk(id, { transaction: t });
        
        if (!carga) throw new Error('El registro de combustible no existe.');

        if (carga.origen === 'interno' && carga.consumibleOrigenId) {
            const tanque = await Consumible.findByPk(carga.consumibleOrigenId, { transaction: t });
            
            if (tanque) {
                tanque.stockAlmacen = parseFloat(tanque.stockAlmacen) + parseFloat(carga.litros);
                await tanque.save({ transaction: t });

                const salidaAEliminar = await SalidaInventario.findOne({
                    where: { consumibleId: carga.consumibleOrigenId, activoId: carga.activoId, cantidad: carga.litros },
                    order: [['createdAt', 'DESC']],
                    transaction: t
                });

                if (salidaAEliminar) await salidaAEliminar.destroy({ transaction: t });
            }
        }

        const activo = await Activo.findByPk(carga.activoId, { transaction: t });
        if (activo) {
            const nivelActual = parseFloat(activo.nivelCombustible || 0);
            activo.nivelCombustible = Math.max(0, nivelActual - parseFloat(carga.litros));
            await activo.save({ transaction: t });
        }

        if (carga.kilometrajeId) {
            await Kilometraje.destroy({ where: { id: carga.kilometrajeId }, transaction: t });
        }

        await carga.destroy({ transaction: t });
        await t.commit();
        
        return NextResponse.json({ success: true, message: 'Despacho eliminado. Salida de inventario anulada y gasoil restituido.' });

    } catch (error) {
        await t.rollback();
        console.error("Error eliminando carga de combustible:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}