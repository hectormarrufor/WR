import { NextResponse } from 'next/server';
import {
    sequelize, Activo, RemolqueInstancia, Remolque, Subsistema,
    SubsistemaInstancia, ConsumibleInstalado, ConsumibleSerializado,
    EntradaInventario, Kilometraje, SalidaInventario, Consumible, Recauchado
} from '@/models';
import { recalcularOverheadGlobal } from '@/app/ApiFunctions/recalcularOverhead';

import { NextResponse } from 'next/server';
import sequelize from '@/sequelize';
import {
    RemolqueInstancia, Activo, Remolque, Subsistema, Kilometraje,
    SubsistemaInstancia, ConsumibleSerializado, Recauchado, EntradaInventario,
    SalidaInventario, Consumible, ConsumibleInstalado
} from '@/models';
import { notificarAdmins } from '@/app/api/notificar/route';

// NOTA: Asegúrate de importar e invocar tu función recalcularOverheadGlobal(t) como la tienes en tu backend original.

import { NextResponse } from 'next/server';
import sequelize from '@/sequelize';
import {
    RemolqueInstancia, Activo, Remolque, Subsistema, Kilometraje,
    SubsistemaInstancia, ConsumibleSerializado, Recauchado, EntradaInventario,
    SalidaInventario, Consumible, ConsumibleInstalado
} from '@/models';

export async function POST(request) {
    const t = await sequelize.transaction();

    try {
        const body = await request.json();

        const existePlaca = await RemolqueInstancia.findOne({ where: { placa: body.placa }, transaction: t });
        if (existePlaca && body.placa) throw new Error(`La placa ${body.placa} ya está registrada en otro remolque.`);

        const existeCodigo = await Activo.findOne({ where: { codigoInterno: body.codigoInterno }, transaction: t });
        if (existeCodigo) throw new Error(`El código ${body.codigoInterno} ya existe.`);

        const modelo = await Remolque.findByPk(body.modeloVehiculoId, {
            include: [{ model: Subsistema, as: 'subsistemas' }],
            transaction: t
        });

        if (!modelo) throw new Error("El modelo de remolque seleccionado no existe.");

        const nuevaInstancia = await RemolqueInstancia.create({
            placa: body.placa,
            marca: modelo.marca,
            modelo: modelo.modelo,
            serialMotor: body.serialMotor || null,
            color: body.color,
            anioFabricacion: body.anioFabricacion || modelo.anio,
            remolqueId: body.modeloVehiculoId,
            serialChasis: body.serialChasis || body.serialCarroceria,
        }, { transaction: t });

        // 🔥 LOGICA DE HERENCIA Y PROPAGACIÓN DE TANQUE 🔥
        let capacidadFinal = 0;
        let configuracionFinal = null;

        if (body.tipoTanque === 'original') {
            if (body.capacidadTanqueLocal && body.configuracionTanqueLocal) {
                capacidadFinal = body.capacidadTanqueLocal;
                configuracionFinal = body.configuracionTanqueLocal;

                modelo.capacidadTanque = capacidadFinal;
                modelo.configuracionTanque = configuracionFinal;
                modelo.changed('configuracionTanque', true);
                await modelo.save({ transaction: t });
            } else {
                capacidadFinal = modelo.capacidadTanque || 0;
                configuracionFinal = modelo.configuracionTanque || null;
            }
        } else if (body.tipoTanque === 'aftermarket') {
            if (body.capacidadTanqueLocal && body.configuracionTanqueLocal) {
                capacidadFinal = body.capacidadTanqueLocal;
                configuracionFinal = body.configuracionTanqueLocal;
            }
        }

        // 🔥 ACTIVO PADRE 🔥
        const nuevoActivo = await Activo.create({
            codigoInterno: body.codigoInterno,
            tipoActivo: 'Remolque',
            estado: body.estado || 'Operativo',
            ubicacionActual: body.ubicacionActual,
            imagen: body.imagen,
            fechaAdquisicion: body.fechaAdquisicion || new Date(),
            vehiculoInstanciaId: null,
            remolqueInstanciaId: nuevaInstancia.id || null,
            maquinaInstanciaId: null,
            capacidadTonelajeMax: body.capacidadTonelajeMax || body.capacidadCarga || null,
            tara: body.tara !== undefined && body.tara !== '' ? parseFloat(body.tara) : null,

            // 💉 INYECCIÓN DE LA GEOMETRÍA FINAL
            capacidadTanque: capacidadFinal,
            configuracionTanque: configuracionFinal,
            nivelCombustible: 0,

            anio: body.anio ? parseInt(body.anio) : (body.anioFabricacion ? parseInt(body.anioFabricacion) : new Date().getFullYear()),
            matrizCostoId: body.matrizCostoId ? parseInt(body.matrizCostoId) : null,
            valorReposicion: body.valorReposicion ? parseFloat(body.valorReposicion) : null,
            vidaUtilAnios: body.vidaUtilAnios ? parseInt(body.vidaUtilAnios) : null,
            valorSalvamento: body.valorSalvamento !== undefined ? parseFloat(body.valorSalvamento) : null,
            horasAnuales: body.horasAnuales ? parseInt(body.horasAnuales) : 2000,

            costoMantenimientoTeorico: body.costoMantenimientoTeorico !== undefined ? parseFloat(body.costoMantenimientoTeorico) : 0,
            costoPosesionTeorico: body.costoPosesionTeorico !== undefined ? parseFloat(body.costoPosesionTeorico) : 0,
            costoPosesionHora: body.costoPosesionHora !== undefined ? parseFloat(body.costoPosesionHora) : 0,
        }, { transaction: t });

        if (body.kilometrajeActual !== undefined && body.kilometrajeActual !== null) {
            await Kilometraje.create({
                activoId: nuevoActivo.id,
                valor: parseFloat(body.kilometrajeActual),
                fecha: body.fechaAdquisicion || new Date(),
                origen: 'creacion_activo',
                observacion: 'Kilometraje base (Hubodómetro) al registrar el remolque',
                usuarioId: 1
            }, { transaction: t });
        }

        // ... MANTÉN TODO TU BUCLE DE INSTALACIÓN DE COMPONENTES AQUÍ TAL CUAL LO TIENES ...
        const mapaSubsistemas = {};
        if (modelo.subsistemas && modelo.subsistemas.length > 0) {
            for (const subPlantilla of modelo.subsistemas) {
                const subFisico = await SubsistemaInstancia.create({
                    nombre: subPlantilla.nombre + " " + body.placa,
                    activoId: nuevoActivo.id, subsistemaId: subPlantilla.id,
                    estado: 'ok', observaciones: 'Inicializado en creación de remolque'
                }, { transaction: t });
                mapaSubsistemas[subPlantilla.id] = subFisico.id;
            }
        }

        if (body.instalacionesIniciales && body.instalacionesIniciales.length > 0) {
            for (const item of body.instalacionesIniciales) {
                const subsistemaInstanciaId = mapaSubsistemas[item.subsistemaId];
                if (!subsistemaInstanciaId) continue;
                let serialIdFinal = null;

                if (item.serial) {
                    let serialExistente = await ConsumibleSerializado.findOne({
                        where: { serial: item.serial, consumibleId: item.consumibleId },
                        transaction: t
                    });

                    if (serialExistente) {
                        serialIdFinal = serialExistente.id;
                        await serialExistente.update({ estado: 'asignado', fechaAsignacion: new Date() }, { transaction: t });
                    } else {
                        const nuevoSerial = await ConsumibleSerializado.create({
                            consumibleId: item.consumibleId, serial: item.serial, estado: 'asignado',
                            fechaCompra: item.fechaCompra || new Date(), fechaVencimientoGarantia: item.fechaVencimientoGarantia || null,
                            fechaAsignacion: new Date(), recauchado: item.esRecauchado || false
                        }, { transaction: t });
                        serialIdFinal = nuevoSerial.id;

                        if (item.historialRecauchado && item.historialRecauchado.length > 0) {
                            const recauchadosParaGuardar = item.historialRecauchado.map(rec => ({
                                consumibleSerializadoId: nuevoSerial.id, fecha: rec.fecha, costo: parseFloat(rec.costo || 0),
                                tallerId: rec.tallerId || null, observacion: 'Carga Inicial Histórica en Remolque'
                            }));
                            await Recauchado.bulkCreate(recauchadosParaGuardar, { transaction: t });
                        }

                        await EntradaInventario.create({
                            consumibleId: item.consumibleId, cantidad: 1, serialId: nuevoSerial.id,
                            tipo: 'carga_inicial', observacion: `Dotación inicial Remolque ${body.codigoInterno}`,
                            fecha: item.fechaCompra || new Date(), usuarioId: 1
                        }, { transaction: t });
                    }
                } else {
                    const esOrigenExterno = item.origen === 'externo';
                    if (esOrigenExterno) {
                        await EntradaInventario.create({
                            consumibleId: item.consumibleId, cantidad: item.cantidad, tipo: 'carga_inicial',
                            observacion: `Dotación inicial (externo) en Remolque ${body.codigoInterno}`, fecha: new Date(), usuarioId: 1
                        }, { transaction: t });
                    } else {
                        await SalidaInventario.create({
                            consumibleId: item.consumibleId, cantidad: item.cantidad, tipo: 'consumo',
                            motivo: `Instalación inicial en Remolque ${body.codigoInterno}`, fecha: new Date(), usuarioId: 1
                        }, { transaction: t });
                        const consumible = await Consumible.findByPk(item.consumibleId, { transaction: t });
                        if (consumible) await consumible.decrement('stockAlmacen', { by: item.cantidad, transaction: t });
                    }
                }

                await ConsumibleInstalado.create({
                    subsistemaInstanciaId: subsistemaInstanciaId, consumibleId: item.consumibleId,
                    recomendacionId: item.recomendacionId || null, cantidad: item.cantidad,
                    serialId: serialIdFinal, serialActual: item.serial || null,
                    fechaInstalacion: new Date(), estado: 'instalado'
                }, { transaction: t });
            }
        }

        const cambiosOverhead = await recalcularOverheadGlobal(t);

        await t.commit();

        // 🔥 NOTIFICACIÓN 🔥
        await notificarAdmins({
            title: 'Nuevo Activo Registrado',
            body: `${body.usuario} ha registrado un nuevo activo: ${nuevoActivo.codigoInterno}`,
            url: `/superuser/flota/activos/${nuevoActivo.id}`,
        });

        return NextResponse.json({
            success: true,
            message: 'Remolque creado con éxito',
            data: { id: nuevoActivo.id, codigo: nuevoActivo.codigoInterno },
            cambiosOverhead
        }, { status: 201 });

    } catch (error) {
        await t.rollback();
        console.error("Error creando remolque:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}