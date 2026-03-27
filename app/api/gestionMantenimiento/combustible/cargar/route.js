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
                    attributes: ['id', 'codigoInterno', 'tipoActivo'], // Quitamos 'nombre'
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

        // Formatear los datos para que el frontend reciba algo limpio
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


export async function POST(request) {
    const t = await sequelize.transaction();

    try {
        const body = await request.json();
        const { activoId, origen, consumibleOrigenId, litros, costoTotal, kilometrajeAlMomento, fullTanque, registradoPorId } = body;

        const activo = await Activo.findByPk(activoId, { transaction: t });
        if (!activo) throw new Error('El equipo seleccionado no existe.');

        const litrosDespachados = parseFloat(litros);

        // 🔥 VALIDACIÓN: ESPACIO DISPONIBLE EN EL TANQUE DEL EQUIPO 🔥
        const capacidadActivo = parseFloat(activo.capacidadTanque || 0);
        const nivelActualActivo = parseFloat(activo.nivelCombustible || 0);
        
        if (capacidadActivo <= 0) {
            throw new Error('El equipo no tiene capacidad de tanque registrada. Fíjela primero.');
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
        
        const cargaAnterior = await CargaCombustible.findOne({
            where: { activoId, fullTanque: true },
            order: [['fecha', 'DESC']],
            transaction: t
        });

        if (cargaAnterior && parseFloat(kilometrajeAlMomento) > parseFloat(cargaAnterior.kilometrajeAlMomento)) {
            kilometrosRecorridos = parseFloat(kilometrajeAlMomento) - parseFloat(cargaAnterior.kilometrajeAlMomento);
            rendimientoCalculado = parseFloat((kilometrosRecorridos / litrosDespachados).toFixed(2));
        }

        const nuevoKilometraje = await Kilometraje.create({
            activoId,
            valor: parseFloat(kilometrajeAlMomento),
            fecha_registro: new Date()
        }, { transaction: t });

        const nuevaCarga = await CargaCombustible.create({
            activoId,
            fecha: new Date(),
            origen,
            consumibleOrigenId: origen === 'interno' ? consumibleOrigenId : null,
            litros: litrosDespachados,
            costoTotal: origen === 'externo' ? parseFloat(costoTotal) : null,
            kilometrajeAlMomento: parseFloat(kilometrajeAlMomento),
            kilometrosRecorridos,
            rendimientoCalculado,
            fullTanque,
            kilometrajeId: nuevoKilometraje.id,
            registradoPorId: registradoPorId || null 
        }, { transaction: t });

        // 🔥 ACTUALIZAMOS EL NIVEL DE COMBUSTIBLE DEL EQUIPO 🔥
        if (fullTanque) {
            activo.nivelCombustible = capacidadActivo; // Si lo llenó a tope, asumimos el 100%
        } else {
            activo.nivelCombustible = nivelActualActivo + litrosDespachados;
        }
        await activo.save({ transaction: t });

        await t.commit();
        
        return NextResponse.json({ success: true, message: 'Despacho registrado correctamente.' }, { status: 201 });

    } catch (error) {
        await t.rollback();
        console.error("Error procesando carga de combustible:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}