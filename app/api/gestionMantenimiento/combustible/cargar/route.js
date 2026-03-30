import { NextResponse } from 'next/server';
import sequelize from '@/sequelize';
import { 
    CargaCombustible, 
    Activo, 
    Consumible, 
    Kilometraje,
    VehiculoInstancia,
    Vehiculo,
    RemolqueInstancia,
    Remolque,
    MaquinaInstancia,
    Maquina,
    SalidaInventario
} from '@/models';

// ----------------------------------------------------------------------
// GET: Obtener historial de todas las cargas de combustible
// ----------------------------------------------------------------------
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

// ----------------------------------------------------------------------
// POST: Registrar un nuevo despacho de combustible
// ----------------------------------------------------------------------
export async function POST(request) {
    const t = await sequelize.transaction();

    try {
        const body = await request.json();
        const { 
            activoId, origen, consumibleOrigenId, litros, costoTotal, 
            kilometrajeAlMomento, fullTanque, registradoPorId, 
            usarAforoVara, centimetrosVara, nivelAforadoAntesDeSurtir 
        } = body;

        const activo = await Activo.findByPk(activoId, { transaction: t });
        if (!activo) throw new Error('El equipo seleccionado no existe.');

        const litrosDespachados = parseFloat(litros);

        // 🔥 VALIDACIÓN: ESPACIO DISPONIBLE EN EL TANQUE DEL EQUIPO 🔥
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

        // 🔥 DESCUENTO DE INVENTARIO INTERNO 🔥
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

        // 🔥 CÁLCULO DE RENDIMIENTO (BIFURCACIÓN MATEMÁTICA Y AFORO) 🔥
        let kilometrosRecorridos = null;
        let rendimientoCalculado = null;
        let esTanqueFull = fullTanque; // Variable dinámica
        
        const cargaAnterior = await CargaCombustible.findOne({
            where: { activoId, fullTanque: true },
            order: [['fecha', 'DESC']],
            transaction: t
        });

        if (cargaAnterior && parseFloat(kilometrajeAlMomento) > parseFloat(cargaAnterior.kilometrajeAlMomento)) {
            kilometrosRecorridos = parseFloat(kilometrajeAlMomento) - parseFloat(cargaAnterior.kilometrajeAlMomento);
            
            if (usarAforoVara && nivelAforadoAntesDeSurtir !== null) {
                // 🔹 ESCENARIO A: AFORO POR VARA
                const consumoReal = nivelActualActivo - parseFloat(nivelAforadoAntesDeSurtir);
                
                if (consumoReal > 0) {
                    if (activo.maquinaId || activo.remolqueId) {
                        rendimientoCalculado = parseFloat((consumoReal / kilometrosRecorridos).toFixed(2)); // L/Hr
                    } else {
                        rendimientoCalculado = parseFloat((kilometrosRecorridos / consumoReal).toFixed(2)); // Km/L
                    }
                }
                esTanqueFull = true; // El aforo cierra el ciclo de medición, lo tratamos como "Full" para la próxima vez
            } 
            else if (fullTanque && cargaAnterior.fullTanque) {
                // 🔹 ESCENARIO B: TANQUEO FULL A FULL (Tradicional)
                if (activo.maquinaId || activo.remolqueId) {
                    rendimientoCalculado = parseFloat((litrosDespachados / kilometrosRecorridos).toFixed(2)); // L/Hr
                } else {
                    rendimientoCalculado = parseFloat((kilometrosRecorridos / litrosDespachados).toFixed(2)); // Km/L
                }
            }
        } else if (usarAforoVara) {
            // Si es la primera vez pero usa vara, establecemos que cerró ciclo
            esTanqueFull = true;
        }

        const nuevoKilometraje = await Kilometraje.create({
            activoId,
            valor: parseFloat(kilometrajeAlMomento),
            fecha_registro: new Date()
        }, { transaction: t });

        // 🔥 GUARDADO DEL REGISTRO HISTÓRICO 🔥
        await CargaCombustible.create({
            activoId,
            fecha: new Date(),
            origen,
            consumibleOrigenId: origen === 'interno' ? consumibleOrigenId : null,
            litros: litrosDespachados,
            costoTotal: origen === 'externo' ? parseFloat(costoTotal) : null,
            kilometrajeAlMomento: parseFloat(kilometrajeAlMomento),
            kilometrosRecorridos,
            rendimientoCalculado,
            fullTanque: esTanqueFull,
            kilometrajeId: nuevoKilometraje.id,
            registradoPorId: registradoPorId || null,
            // Guardamos la evidencia de la vara para auditoría futura
            centimetrosVara: usarAforoVara ? parseFloat(centimetrosVara) : null,
            litrosAforados: usarAforoVara ? parseFloat(nivelAforadoAntesDeSurtir) : null
        }, { transaction: t });

        // 🔥 ACTUALIZAMOS EL NIVEL DE COMBUSTIBLE EN EL CAMIÓN 🔥
        if (usarAforoVara && nivelAforadoAntesDeSurtir !== null) {
            // Corregimos la realidad del tanque con la vara + lo despachado
            activo.nivelCombustible = parseFloat(nivelAforadoAntesDeSurtir) + litrosDespachados;
        } else if (fullTanque) {
            activo.nivelCombustible = capacidadActivo; 
        } else {
            activo.nivelCombustible = nivelActualActivo + litrosDespachados;
        }

        // Seguridad para no pasarnos del límite por errores de tipeo
        if (activo.nivelCombustible > capacidadActivo) activo.nivelCombustible = capacidadActivo;

        await activo.save({ transaction: t });
        await t.commit();
        
        return NextResponse.json({ success: true, message: 'Despacho registrado correctamente.' }, { status: 201 });

    } catch (error) {
        await t.rollback();
        console.error("Error procesando carga de combustible:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// ----------------------------------------------------------------------
// DELETE: Eliminar un registro y revertir inventario
// ----------------------------------------------------------------------
export async function DELETE(request, { params }) {
    const t = await sequelize.transaction();

    try {
        const { id } = await params;

        const carga = await CargaCombustible.findByPk(id, { transaction: t });
        
        if (!carga) {
            throw new Error('El registro de combustible no existe.');
        }

        // Reversión de Inventario Interno
        if (carga.origen === 'interno' && carga.consumibleOrigenId) {
            const tanque = await Consumible.findByPk(carga.consumibleOrigenId, { transaction: t });
            
            if (tanque) {
                tanque.stockAlmacen = parseFloat(tanque.stockAlmacen) + parseFloat(carga.litros);
                await tanque.save({ transaction: t });

                const salidaAEliminar = await SalidaInventario.findOne({
                    where: {
                        consumibleId: carga.consumibleOrigenId,
                        activoId: carga.activoId,
                        cantidad: carga.litros
                    },
                    order: [['createdAt', 'DESC']],
                    transaction: t
                });

                if (salidaAEliminar) {
                    await salidaAEliminar.destroy({ transaction: t });
                }
            }
        }

        // 🔥 REVERSIÓN DEL NIVEL DE COMBUSTIBLE EN EL ACTIVO 🔥
        const activo = await Activo.findByPk(carga.activoId, { transaction: t });
        if (activo) {
            const nivelActual = parseFloat(activo.nivelCombustible || 0);
            activo.nivelCombustible = Math.max(0, nivelActual - parseFloat(carga.litros));
            await activo.save({ transaction: t });
        }

        if (carga.kilometrajeId) {
            await Kilometraje.destroy({ 
                where: { id: carga.kilometrajeId }, 
                transaction: t 
            });
        }

        await carga.destroy({ transaction: t });

        await t.commit();
        
        return NextResponse.json({ 
            success: true, 
            message: 'Despacho eliminado. Salida de inventario anulada y gasoil restituido.' 
        });

    } catch (error) {
        await t.rollback();
        console.error("Error eliminando carga de combustible:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}