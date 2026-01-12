import { NextResponse } from 'next/server';
import { 
    sequelize, CargaCombustible, Kilometraje, Horometro, 
    Activo, VehiculoInstancia, Consumible, SalidaInventario 
} from '@/models';
import { Op } from 'sequelize';


export async function GET(request) {
   try {
        const { searchParams } = new URL(request.url);
        const tipo = searchParams.get('tipo'); // 'consumo' (default) o 'abastecimiento'

        if (tipo === 'abastecimiento') {
            // --- LOGICA PARA VER COMPRAS DE GASOIL ---
            const entradas = await EntradaInventario.findAll({
                include: [{
                    model: Consumible,
                    as: 'consumible',
                    where: { categoria: { [Op.iLike]: '%combustible%' } }, // Filtro clave
                    attributes: ['id', 'nombre']
                }],
                where: { tipo: 'compra' }, // Solo compras, no devoluciones ni ajustes
                order: [['fecha', 'DESC']],
                limit: 100
            });

            const data = entradas.map(e => ({
                id: e.id,
                fecha: e.fecha,
                proveedor: e.origen, // En EntradaInventario guardamos proveedor en 'origen'
                tanque: e.consumible?.nombre || 'Desconocido',
                litros: e.cantidad,
                costoTotal: (e.cantidad * e.costoUnitario) || 0,
                ordenCompra: e.ordenCompra || '-'
            }));

            return NextResponse.json({ success: true, data });
        }

        // CASO 1: HISTORIAL DE CONSUMO (Lo que gastan los vehículos)
        // Traemos CargaCombustible + Activo + Vehiculo
        const cargas = await CargaCombustible.findAll({
            include: [
                {
                    model: Activo,
                    // as: 'activo', // Asegúrate de que el alias coincida con tu modelo (normalmente es 'Activo' o 'activo')
                    attributes: ['id', 'codigoInterno', 'imagen'],
                    include: [
                        {
                            model: VehiculoInstancia,
                            as: 'vehiculoInstancia',
                            attributes: ['placa', 'id'] // Traemos la placa
                        }
                    ]
                }
            ],
            order: [['fecha', 'DESC']], // Lo más reciente primero
            limit: 500 // Límite de seguridad para no explotar la tabla
        });

        console.log("Cargas obtenidas:", cargas);

        // Formateamos la data para que el Front la entienda fácil
        const dataFormateada = cargas.map(c => ({
            id: c.id,
            fecha: c.fecha,
            litros: c.litros,
            costo: c.costoTotal || 0,
            km: c.kilometrajeAlMomento,
            rendimiento: c.rendimientoCalculado,
            origen: c.origen, // 'interno' o 'externo'
            
            // Datos aplanados del Activo
            codigo: c.Activo?.codigoInterno || 'N/A',
            placa: c.Activo?.vehiculoInstancia?.placa || 'Sin Placa',
            imagen: c.Activo?.imagen
        }));

        return NextResponse.json({ success: true, data: dataFormateada });

    } catch (error) {
        console.error("Error obteniendo historial combustible:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    const t = await sequelize.transaction();

    try {
        const body = await request.json();
        
        // body esperada:
        // {
        //   activoId: 1,
        //   litros: 50,
        //   costoTotal: 25.5, (Opcional)
        //   kilometrajeActual: 15000,
        //   horometroActual: 500, (Opcional)
        //   fullTanque: true, (Importante para calcular rendimiento real)
        //   origen: 'interno' | 'externo', (Interno = Descuenta de inventario, Externo = Estación de servicio)
        //   consumibleId: 5 (Solo si es interno: ID del Diesel en tu inventario)
        //   fecha: '...'
        // }

        // 1. VALIDAR ACTIVO
        const activo = await Activo.findByPk(body.activoId, {
            include: [{ model: VehiculoInstancia, as: 'vehiculoInstancia' }],
            transaction: t
        });

        if (!activo) throw new Error("Activo no encontrado");

        // Validar coherencia (No puedes bajar el kilometraje)
        if (activo.vehiculo && body.kilometrajeActual < activo.vehiculo.kilometrajeActual) {
            throw new Error(`El kilometraje nuevo (${body.kilometrajeActual}) no puede ser menor al actual (${activo.vehiculo.kilometrajeActual}).`);
        }

        // 2. BUSCAR ÚLTIMA CARGA (Para calcular rendimiento)
        const ultimaCarga = await CargaCombustible.findOne({
            where: { activoId: body.activoId },
            order: [['fecha', 'DESC']],
            transaction: t
        });

        let kmRecorridos = 0;
        let rendimiento = null; // Km por Litro

        if (ultimaCarga) {
            kmRecorridos = body.kilometrajeActual - ultimaCarga.kilometrajeAlMomento;
            
            // Solo calculamos rendimiento si la vez pasada se llenó full y esta vez hay coherencia
            if (kmRecorridos > 0 && ultimaCarga.fullTanque) {
                // Rendimiento = Distancia recorrida / Litros necesarios para volver a llenar
                rendimiento = parseFloat((kmRecorridos / body.litros).toFixed(2));
            }
        }

        // 3. REGISTRAR EL HITO DE KILOMETRAJE
        const nuevoKm = await Kilometraje.create({
            activoId: body.activoId,
            valor: body.kilometrajeActual,
            fecha: body.fecha || new Date(),
            origen: 'carga_combustible',
            observacion: `Registro automático por carga de combustible (${body.litros} L)`,
            usuarioId: 1 // TODO: Usar usuario real
        }, { transaction: t });

        // 4. REGISTRAR EL HITO DE HORÓMETRO (Opcional)
        let nuevoHorometroId = null;
        if (body.horometroActual) {
            const h = await Horometro.create({
                activoId: body.activoId,
                valor: body.horometroActual,
                fecha: body.fecha || new Date(),
                origen: 'carga_combustible',
                usuarioId: 1
            }, { transaction: t });
            nuevoHorometroId = h.id;
        }

        // 5. REGISTRAR LA CARGA DE COMBUSTIBLE
        const nuevaCarga = await CargaCombustible.create({
            activoId: body.activoId,
            kilometrajeId: nuevoKm.id, // Relacionamos con el registro de Km creado arriba
            fecha: body.fecha || new Date(),
            litros: body.litros,
            costoTotal: body.costoTotal || 0,
            kilometrajeAlMomento: body.kilometrajeActual,
            fullTanque: body.fullTanque !== undefined ? body.fullTanque : true,
            origen: body.origen || 'externo',
            
            // Datos calculados
            kilometrosRecorridos: kmRecorridos,
            rendimientoCalculado: rendimiento
        }, { transaction: t });

        // 6. ACTUALIZAR EL ACTIVO/VEHICULO (Caché actual)
        if (activo.vehiculo) {
            await activo.vehiculo.update({
                kilometrajeActual: body.kilometrajeActual,
                horometroActual: body.horometroActual || activo.vehiculo.horometroActual
            }, { transaction: t });
        }

        // 7. GESTIÓN DE INVENTARIO (Si es tanque interno de la empresa)
        if (body.origen === 'interno' && body.consumibleId) {
            
            // PASO 1: Buscar el consumible PRIMERO para obtener su precio actual
            const combustibleItem = await Consumible.findByPk(body.consumibleId, { transaction: t });
            
            if (!combustibleItem) {
                throw new Error("El tanque de origen seleccionado no existe o no tiene stock.");
            }

            // PASO 2: Registrar la salida con los datos contables
            await SalidaInventario.create({
                consumibleId: body.consumibleId,
                cantidad: body.litros,
                tipo: 'consumo',
                motivo: `Despacho a unidad ${activo.codigoInterno}`,
                fecha: body.fecha || new Date(),
                usuarioId: 1, // TODO: Usar usuario real
                
                // --- CORRECCIÓN DEL ERROR ---
                activoId: body.activoId, // Vinculamos la salida al camión
                costoAlMomento: combustibleItem.precioPromedio || 0 // Guardamos cuánto valía el litro hoy
                // -----------------------------
            }, { transaction: t });

            // PASO 3: Restar stock
            await combustibleItem.decrement('stockAlmacen', { by: body.litros, transaction: t });
        
        }

        await t.commit();

        return NextResponse.json({
            success: true,
            message: 'Carga registrada correctamente',
            data: {
                carga: nuevaCarga,
                rendimiento: rendimiento ? `${rendimiento} km/l` : 'N/A'
            }
        });

    } catch (error) {
        await t.rollback();
        console.error("Error al registrar combustible:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}