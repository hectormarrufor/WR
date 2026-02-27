import { NextResponse } from 'next/server';
import { 

// filepath: c:\Users\Hector Marrufo\Documents\App Web DADICA hector marrufo\WR\app\api\gestionMantenimiento\activos\remolques\route.js
    sequelize, Activo, RemolqueInstancia, Remolque, Subsistema, 
    SubsistemaInstancia, ConsumibleInstalado, ConsumibleSerializado, 
    EntradaInventario, Kilometraje, SalidaInventario, Consumible, Recauchado 
} from '@/models';

export async function POST(request) {
    const t = await sequelize.transaction();

    try {
        const body = await request.json();
        
        console.log("Datos recibidos para crear remolque:", body);
        
        // --- 1. VALIDACIONES PREVIAS ---
        const existePlaca = await RemolqueInstancia.findOne({ where: { placa: body.placa }, transaction: t });
        if (existePlaca) throw new Error(`La placa ${body.placa} ya está registrada en otro remolque.`);
        
        const existeCodigo = await Activo.findOne({ where: { codigoInterno: body.codigoInterno }, transaction: t });
        if (existeCodigo) throw new Error(`El código ${body.codigoInterno} ya existe.`);

        // --- 2. RECUPERAR LA PLANTILLA (MODELO DE REMOLQUE) ---
        // Se asume que en el body viene 'modeloVehiculoId' seleccionando el ID de la tabla Remolques (definida en Remolque.js)
        const modelo = await Remolque.findByPk(body.modeloVehiculoId, {
            include: [{ model: Subsistema, as: 'subsistemas' }],
            transaction: t
        });

        if (!modelo) throw new Error("El modelo de remolque seleccionado no existe.");

        // --- 3. CREAR INSTANCIA DE REMOLQUE ---
        // Creamos la instancia física basada en el modelo
        const nuevaInstancia = await RemolqueInstancia.create({
            placa: body.placa,
            marca: modelo.marca,
            modelo: modelo.modelo,
            serialMotor: body.serialMotor || null,
            color: body.color,
            anioFabricacion: body.anioFabricacion || modelo.anio, // Puede ser específico o heredar del modelo
            remolqueId: body.modeloVehiculoId, // FK a la tabla Remolques
            serialChasis: body.serialChasis || body.serialCarroceria,
        }, { transaction: t });

        // --- 4. CREAR ACTIVO ---
        const nuevoActivo = await Activo.create({
            codigoInterno: body.codigoInterno,
            tipoActivo: 'Remolque', // <--- TIPO ESPECÍFICO
            estado: body.estado || 'Operativo',
            ubicacionActual: body.ubicacionActual,
            imagen: body.imagen, // Puede venir la URL de la imagen específica
            fechaAdquisicion: body.fechaAdquisicion || new Date(),
            vehiculoInstanciaId: null,      // Null para remolques
            remolqueInstanciaId: nuevaInstancia.id || null, // Vinculación correcta
            maquinaInstanciaId: null,
            capacidadTonelajeMax: body.capacidadCarga || null, // Campo específico para remolques
            tara: body.tara !== undefined && body.tara !== '' ? parseFloat(body.tara) : null, // <-- NUEVO CAMPO TARaS
        }, { transaction: t });

        // =====================================================================
        // 4.1. REGISTRAR HISTORIAL CERO 
        // =====================================================================
        
        // Registrar Kilometraje Inicial (Hubodómetro)
        if (body.kilometrajeActual !== undefined && body.kilometrajeActual !== null) {
            await Kilometraje.create({
                activoId: nuevoActivo.id,
                valor: parseFloat(body.kilometrajeActual),
                fecha: body.fechaAdquisicion || new Date(),
                origen: 'creacion_activo',
                observacion: 'Kilometraje base (Hubodómetro) al registrar el remolque',
                usuarioId: 1 // TODO: Usar usuario real
            }, { transaction: t });
        }

        // Nota: Los remolques generalmente no llevan Horómetro de motor, se omite esa parte.

        // --- 5. INSTANCIAR SUBSISTEMAS ---
        // (Ejes, Suspensión, Frenos, Sistema Eléctrico, etc.)
        const mapaSubsistemas = {}; 
        if (modelo.subsistemas && modelo.subsistemas.length > 0) {
            for (const subPlantilla of modelo.subsistemas) {
                const subFisico = await SubsistemaInstancia.create({
                    nombre: subPlantilla.nombre + " " + body.placa,
                    activoId: nuevoActivo.id,
                    subsistemaId: subPlantilla.id,
                    estado: 'ok',
                    observaciones: 'Inicializado en creación de remolque'
                }, { transaction: t });
                
                mapaSubsistemas[subPlantilla.id] = subFisico.id;
            }
        }

        // --- 6. PROCESAR INSTALACIONES INICIALES (NEUMÁTICOS, ETC.) ---
        // La lógica es idéntica a Vehículos, ya que los remolques usan los mismos consumibles (Cauchos, grasas, etc.)
        if (body.instalacionesIniciales && body.instalacionesIniciales.length > 0) {
            
            for (const item of body.instalacionesIniciales) {
                const subsistemaInstanciaId = mapaSubsistemas[item.subsistemaId];
                if (!subsistemaInstanciaId) continue;

                let serialIdFinal = null;

               // =========================================================
                // CASO A: SERIALIZADO (Principalmente Cauchos en remolques)
                // =========================================================
                if (item.serial) { 
                    
                    let serialExistente = await ConsumibleSerializado.findOne({
                        where: { serial: item.serial, consumibleId: item.consumibleId },
                        transaction: t
                    });

                    if (serialExistente) {
                        serialIdFinal = serialExistente.id;
                        await serialExistente.update({ 
                            estado: 'asignado',
                            fechaAsignacion: new Date() 
                        }, { transaction: t });

                    } else {
                        const nuevoSerial = await ConsumibleSerializado.create({
                            consumibleId: item.consumibleId,
                            serial: item.serial,
                            estado: 'asignado',
                            fechaCompra: item.fechaCompra || new Date(),
                            fechaVencimientoGarantia: item.fechaVencimientoGarantia || null,
                            fechaAsignacion: new Date(),
                            recauchado: item.esRecauchado || false
                        }, { transaction: t });

                        serialIdFinal = nuevoSerial.id;

                        // Historial de Recauchado
                        if (item.historialRecauchado && item.historialRecauchado.length > 0) {
                            const recauchadosParaGuardar = item.historialRecauchado.map(rec => ({
                                consumibleSerializadoId: nuevoSerial.id,
                                fecha: rec.fecha,
                                costo: parseFloat(rec.costo || 0),
                                tallerId: rec.tallerId || null,
                                observacion: 'Carga Inicial Histórica en Remolque'
                            }));
                            
                            await Recauchado.bulkCreate(recauchadosParaGuardar, { transaction: t });
                        }

                        // Entrada Contable
                        await EntradaInventario.create({
                            consumibleId: item.consumibleId,
                            cantidad: 1,
                            serialId: nuevoSerial.id,
                            tipo: 'carga_inicial',
                            observacion: `Dotación inicial Remolque ${body.codigoInterno}`,
                            fecha: item.fechaCompra || new Date(),
                            usuarioId: 1 
                        }, { transaction: t });
                    }
                } 
                
                // =========================================================
                // CASO B: FUNGIBLE (Grasas, bombillos, cintas reflectivas)
                // =========================================================
                else {
                    const esOrigenExterno = item.origen === 'externo';

                    if (esOrigenExterno) {
                        await EntradaInventario.create({
                            consumibleId: item.consumibleId,
                            cantidad: item.cantidad,
                            tipo: 'carga_inicial',
                            observacion: `Dotación inicial (externo) en Remolque ${body.codigoInterno}`,
                            fecha: new Date(),
                            usuarioId: 1 
                        }, { transaction: t });
                    } else {
                        await SalidaInventario.create({
                            consumibleId: item.consumibleId,
                            cantidad: item.cantidad,
                            tipo: 'consumo',
                            motivo: `Instalación inicial en Remolque ${body.codigoInterno}`,
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
                // VINCULACIÓN FINAL
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

        return NextResponse.json({ 
            success: true, 
            message: 'Remolque creado con éxito',
            data: { id: nuevoActivo.id, codigo: nuevoActivo.codigoInterno } 
        }, { status: 201 });

    } catch (error) {
        await t.rollback();
        console.error("Error creando remolque:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}