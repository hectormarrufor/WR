import { NextResponse } from 'next/server';
import {
    sequelize, Activo, VehiculoInstancia, Vehiculo, Subsistema,
    SubsistemaInstancia, ConsumibleInstalado, ConsumibleSerializado,
    EntradaInventario, Kilometraje, Horometro, SalidaInventario, Consumible, Recauchado // <--- IMPORTANTE: Importar Recauchado
} from '@/models';
import { notificarAdmins } from '@/app/api/notificar/route';

export async function POST(request) {
    const t = await sequelize.transaction();

    try {
        const body = await request.json();

        console.log("Datos recibidos para crear activo:", body);

        // --- 1. VALIDACIONES PREVIAS ---
        const existePlaca = await VehiculoInstancia.findOne({ where: { placa: body.placa }, transaction: t });
        if (existePlaca) throw new Error(`La placa ${body.placa} ya está registrada.`);

        const existeCodigo = await Activo.findOne({ where: { codigoInterno: body.codigoInterno }, transaction: t });
        if (existeCodigo) throw new Error(`El código ${body.codigoInterno} ya existe.`);

        // --- 2. RECUPERAR LA PLANTILLA ---
        const modelo = await Vehiculo.findByPk(body.modeloVehiculoId, {
            include: [{ model: Subsistema, as: 'subsistemas' }],
            transaction: t
        });

        if (!modelo) throw new Error("El modelo de vehículo seleccionado no existe.");

        // --- 3. CREAR INSTANCIA VEHÍCULO ---
        const nuevoVehiculo = await VehiculoInstancia.create({
            placa: body.placa,
            color: body.color,
            serialChasis: body.serialChasis || body.serialCarroceria,
            serialMotor: body.serialMotor,
            kilometrajeActual: body.kilometrajeActual || 0,
            vehiculoId: body.modeloVehiculoId
        }, { transaction: t });

        // --- 4. CREAR ACTIVO ---
        const nuevoActivo = await Activo.create({
            codigoInterno: body.codigoInterno,
            tipoActivo: 'Vehiculo',
            estado: body.estado || 'Operativo',
            ubicacionActual: body.ubicacionActual,
            imagen: body.imagen,
            fechaAdquisicion: body.fechaAdquisicion || new Date(),
            vehiculoInstanciaId: nuevoVehiculo.id,
            remolqueInstanciaId: null,
            maquinaInstanciaId: null
        }, { transaction: t });

        // =====================================================================
        // 4.1. REGISTRAR HISTORIAL CERO (PUNTO DE PARTIDA)
        // =====================================================================

        // Registrar Kilometraje Inicial
        if (body.kilometrajeActual !== undefined && body.kilometrajeActual !== null) {
            await Kilometraje.create({
                activoId: nuevoActivo.id,
                valor: parseFloat(body.kilometrajeActual),
                fecha: body.fechaAdquisicion || new Date(),
                origen: 'creacion_activo', // Para saber que fue el valor inicial
                observacion: 'Kilometraje base al registrar el activo',
                usuarioId: 1 // TODO: Usar usuario real
            }, { transaction: t });
        }

        // Registrar Horómetro Inicial (si aplica)
        if (body.horometroActual !== undefined && body.horometroActual !== null) {
            await Horometro.create({
                activoId: nuevoActivo.id,
                valor: parseFloat(body.horometroActual),
                fecha: body.fechaAdquisicion || new Date(),
                origen: 'creacion_activo',
                observacion: 'Horómetro base al registrar el activo',
                usuarioId: 1
            }, { transaction: t });
        }

        // --- 5. INSTANCIAR SUBSISTEMAS ---
        const mapaSubsistemas = {};
        if (modelo.subsistemas && modelo.subsistemas.length > 0) {
            for (const subPlantilla of modelo.subsistemas) {
                const subFisico = await SubsistemaInstancia.create({
                    nombre: subPlantilla.nombre + " " + body.placa,
                    activoId: nuevoActivo.id,
                    subsistemaId: subPlantilla.id,
                    estado: 'ok',
                    observaciones: 'Inicializado en creación de activo'
                }, { transaction: t });

                mapaSubsistemas[subPlantilla.id] = subFisico.id;
            }
        }

        // --- 6. PROCESAR INSTALACIONES ---
        if (body.instalacionesIniciales && body.instalacionesIniciales.length > 0) {

            for (const item of body.instalacionesIniciales) {
                const subsistemaInstanciaId = mapaSubsistemas[item.subsistemaId];
                if (!subsistemaInstanciaId) continue;

                let serialIdFinal = null;

                // =========================================================
                // CASO A: SERIALIZADO (Cauchos, Baterías)
                // =========================================================
                if (item.serial) {

                    let serialExistente = await ConsumibleSerializado.findOne({
                        where: { serial: item.serial, consumibleId: item.consumibleId },
                        transaction: t
                    });

                    if (serialExistente) {
                        // -------------------------------------------------------------
                        // CORRECCIÓN 1: SI YA EXISTE (Viene de Almacén)
                        // Cambiamos estado a 'asignado' y marcamos la fecha
                        // -------------------------------------------------------------
                        serialIdFinal = serialExistente.id;
                        await serialExistente.update({
                            estado: 'asignado',     // <--- ANTES DECÍA 'instalado' (ERROR)
                            fechaAsignacion: new Date()
                        }, { transaction: t });

                    } else {
                        // -------------------------------------------------------------
                        // CORRECCIÓN 2: SI ES NUEVO (Carga Inicial)
                        // Nace directamente como 'asignado'
                        // -------------------------------------------------------------
                        const nuevoSerial = await ConsumibleSerializado.create({
                            consumibleId: item.consumibleId,
                            serial: item.serial,
                            estado: 'asignado',      // <--- ANTES DECÍA 'instalado' (ERROR)
                            fechaCompra: item.fechaCompra || new Date(),
                            fechaVencimientoGarantia: item.fechaVencimientoGarantia || null,
                            fechaAsignacion: new Date(),
                            recauchado: item.esRecauchado || false
                        }, { transaction: t });

                        serialIdFinal = nuevoSerial.id;

                        // --- GUARDAR HISTORIAL RECAUCHADO (Si aplica) ---
                        if (item.historialRecauchado && item.historialRecauchado.length > 0) {
                            const recauchadosParaGuardar = item.historialRecauchado.map(rec => ({
                                consumibleSerializadoId: nuevoSerial.id,
                                fecha: rec.fecha,
                                costo: parseFloat(rec.costo || 0),
                                tallerId: rec.tallerId || null,
                                observacion: 'Carga Inicial Histórica'
                                // Si tienes campo tallerNombre en BD, agrégalo aquí: tallerNombre: rec.tallerNombre
                            }));

                            await Recauchado.bulkCreate(recauchadosParaGuardar, { transaction: t });
                        }

                        // REGISTRO DE ENTRADA CONTABLE (Hallazgo/Dotación)
                        await EntradaInventario.create({
                            consumibleId: item.consumibleId,
                            cantidad: 1,
                            serialId: nuevoSerial.id,
                            tipo: 'carga_inicial',
                            observacion: `Dotación inicial Activo ${body.codigoInterno}`,
                            fecha: item.fechaCompra || new Date(),
                            usuarioId: 1 // TODO: Usar ID real del usuario
                        }, { transaction: t });
                    }
                }

                // =========================================================
                // CASO B: FUNGIBLE (Aceite, Filtros)
                // =========================================================
                else {
                    const esOrigenExterno = item.origen === 'externo';

                    if (esOrigenExterno) {
                        // DOTACIÓN INICIAL (No resta stock)
                        await EntradaInventario.create({
                            consumibleId: item.consumibleId,
                            cantidad: item.cantidad,
                            tipo: 'carga_inicial',
                            observacion: `Dotación inicial (externo) en Activo ${body.codigoInterno}`,
                            fecha: new Date(),
                            usuarioId: 1
                        }, { transaction: t });
                    } else {
                        // SALIDA DE ALMACÉN (Resta stock)
                        await SalidaInventario.create({
                            consumibleId: item.consumibleId,
                            cantidad: item.cantidad,
                            tipo: 'consumo',
                            motivo: `Instalación inicial en Activo ${body.codigoInterno}`,
                            fecha: new Date(),
                            usuarioId: 1
                        }, { transaction: t });

                        const consumible = await Consumible.findByPk(item.consumibleId, { transaction: t });
                        if (consumible) {
                            await consumible.decrement('stockAlmacen', { by: item.cantidad, transaction: t });
                        }
                    }
                }

                // =========================================================
                // VINCULACIÓN FINAL (INSTALACIÓN)
                // =========================================================
                await ConsumibleInstalado.create({
                    subsistemaInstanciaId: subsistemaInstanciaId,
                    consumibleId: item.consumibleId,
                    recomendacionId: item.recomendacionId || null,
                    cantidad: item.cantidad,
                    serialId: serialIdFinal,
                    serialActual: item.serial || null,
                    fechaInstalacion: new Date(),
                    estado: 'instalado'
                }, { transaction: t });
            }
        }

        await t.commit();

        await notificarAdmins({
            title: 'Nuevo Activo Registrado',
            body: `${body.usuario} ha registrado un nuevo activo: ${nuevoActivo.codigoInterno}`,
            url: `/superuser/flota/activos/${nuevoActivo.id}`,
        });

        return NextResponse.json({
            success: true,
            message: 'Activo creado con éxito',
            data: { id: nuevoActivo.id, codigo: nuevoActivo.codigoInterno }
        }, { status: 201 });

    } catch (error) {
        await t.rollback();
        console.error("Error creando activo:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}