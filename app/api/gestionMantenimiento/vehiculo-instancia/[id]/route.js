import { NextResponse } from 'next/server';
import sequelize from '@/sequelize';
import { 
    VehiculoInstancia, 
    Vehiculo, 
    SubsistemaInstancia, 
    Subsistema, 
    ConsumibleUsado, 
    ConsumibleRecomendado,
    Consumible,
    ConsumibleSerializado
} from '@/models';

export async function GET(request, { params }) {
    const { id } = params;

    try {
        // 1. Buscamos la instancia con toda su estructura jerárquica
        const instancia = await VehiculoInstancia.findByPk(id, {
            include: [
                {
                    model: Vehiculo, // Datos de la plantilla (Marca, Modelo, Foto)
                    as: 'vehiculo' 
                },
                {
                    model: SubsistemaInstancia, // Los sistemas físicos (Motor, Frenos)
                    as: 'subsistemasInstancia', // Asegúrate de tener este alias en models/index.js
                    include: [
                        {
                            model: ConsumibleUsado, // Lo que tiene puesto actualmente
                            as: 'consumiblesInstalados', // Alias definido en tus relaciones
                            required: false, // Left Join (traer subsistema aunque no tenga nada puesto)
                            include: [
                                { model: Consumible, as: 'consumible' }, // Detalles del item genérico
                                { model: ConsumibleSerializado, as: 'serializado' } // Detalles del item único (si aplica)
                            ]
                        },
                        {
                            model: Subsistema, // La definición teórica de este subsistema
                            as: 'subsistema', // FK: subsistemaInstancia.subsistemaId -> Subsistema.id
                            include: [
                                {
                                    model: ConsumibleRecomendado, // La lista de compras sugerida
                                    as: 'consumiblesRecomendados',
                                    include: [{ model: Consumible, as: 'consumible' }]
                                }
                            ]
                        }
                    ]
                }
            ]
        });

        if (!instancia) {
            return NextResponse.json({ success: false, message: 'Vehículo no encontrado' }, { status: 404 });
        }

        // 2. PROCESAMIENTO DE DATOS (El Cruce)
        // La base de datos nos devuelve estructuras anidadas complejas. 
        // Vamos a simplificarlas para que el Frontend reciba una lista de tareas clara.

        const reporteEstado = instancia.subsistemasInstancia.map(subInstancia => {
            const plantilla = subInstancia.subsistema;
            const instalados = subInstancia.consumiblesInstalados || [];
            const recomendados = plantilla ? plantilla.consumiblesRecomendados : [];

            // Estrategia: Iteramos sobre los RECOMENDADOS para ver si están cubiertos.
            // Esto nos dice qué falta.
            const estadoComponentes = recomendados.map(rec => {
                // Buscamos si hay algo instalado que coincida con este recomendado
                // OJO: Aquí podrías añadir lógica de equivalencias si el instalado no es idéntico al recomendado ID
                const matchInstalado = instalados.find(inst => inst.consumibleId === rec.consumibleId);

                return {
                    tipo: 'Requerido',
                    nombre: rec.consumible.nombre,
                    consumibleId: rec.consumibleId,
                    cantidadRequerida: rec.cantidadRecomendada,
                    cantidadInstalada: matchInstalado ? matchInstalado.cantidad : 0,
                    estaInstalado: !!matchInstalado,
                    detalleInstalado: matchInstalado ? {
                        idUso: matchInstalado.id,
                        fechaInstalacion: matchInstalado.fechaInstalacion,
                        vidaUtilInicial: matchInstalado.vidaUtilInicial,
                        serial: matchInstalado.serializado ? matchInstalado.serializado.serial : null,
                        marca: matchInstalado.serializado ? matchInstalado.serializado.marca : null
                    } : null,
                    // Datos para mostrar estado de stock en el botón de "Instalar"
                    stockDisponible: rec.consumible.stockActual 
                };
            });

            // También debemos buscar consumibles "Extra" o "No Recomendados" 
            // que estén instalados (adaptaciones, errores, etc.)
            const extras = instalados.filter(inst => 
                !recomendados.some(rec => rec.consumibleId === inst.consumibleId)
            ).map(inst => ({
                tipo: 'Adicional',
                nombre: inst.consumible.nombre,
                consumibleId: inst.consumibleId,
                cantidadInstalada: inst.cantidad,
                estaInstalado: true,
                detalleInstalado: {
                    idUso: inst.id,
                    fechaInstalacion: inst.fechaInstalacion,
                    serial: inst.serializado ? inst.serializado.serial : null
                }
            }));

            return {
                subsistemaInstanciaId: subInstancia.id,
                nombreSubsistema: plantilla ? plantilla.nombre : 'Subsistema Desconocido',
                estadoGeneral: subInstancia.estado, // Operativo, Falla, etc.
                componentes: [...estadoComponentes, ...extras]
            };
        });

        // 3. Respuesta Limpia
        return NextResponse.json({
            success: true,
            data: {
                id: instancia.id,
                datosVehiculo: {
                    placa: instancia.placa,
                    modelo: instancia.vehiculo.modelo,
                    marca: instancia.vehiculo.marcaId, // O el nombre si incluyes Marca
                    imagen: instancia.vehiculo.imagen,
                    kilometraje: instancia.kilometrajeActual,
                    status: instancia.estado
                },
                reporteMantenimiento: reporteEstado
            }
        });

    } catch (error) {
        console.error("Error obteniendo estado vehiculo:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}