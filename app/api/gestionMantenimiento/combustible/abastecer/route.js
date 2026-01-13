import { NextResponse } from 'next/server';
import { sequelize, Consumible, EntradaInventario } from '@/models';

export async function POST(request) {
    const t = await sequelize.transaction();

    try {
        const body = await request.json();
        
        // body: { consumibleId: 5, litros: 5000, costoTotal: 2500, proveedor: 'PDVSA', ordenCompra: 'OC-123' }

        // 1. BUSCAR EL TANQUE (Consumible)
        const tanque = await Consumible.findByPk(body.consumibleId, { transaction: t });
        
        if (!tanque) throw new Error("El tanque seleccionado no existe.");

        // 2. CÁLCULO DE COSTO PROMEDIO PONDERADO (PMP)
        const stockActual = parseFloat(tanque.stockAlmacen || 0);
        const costoActual = parseFloat(tanque.precioPromedio || 0);
        
        const litrosNuevos = parseFloat(body.litros);
        const costoTotalNuevo = parseFloat(body.costoTotal);

        // Valor total actual en inventario ($)
        const valorInventarioActual = stockActual * costoActual;

        // Nuevo valor total ($)
        const nuevoValorTotal = valorInventarioActual + costoTotalNuevo;
        
        // Nuevo Stock Total
        const nuevoStock = stockActual + litrosNuevos;

        // Nuevo Precio Unitario
        let nuevoPrecioPromedio = 0;
        if (nuevoStock > 0) {
            nuevoPrecioPromedio = nuevoValorTotal / nuevoStock;
        }

        // 3. ACTUALIZAR EL CONSUMIBLE (TANQUE)
        await tanque.update({
            stockAlmacen: nuevoStock,
            precioPromedio: nuevoPrecioPromedio
        }, { transaction: t });

        // 4. CREAR EL REGISTRO DE ENTRADA (HISTÓRICO)
        const entrada = await EntradaInventario.create({
            consumibleId: body.consumibleId,
            cantidad: litrosNuevos,
            costoUnitario: costoTotalNuevo / litrosNuevos, // Costo de ESTA compra específica
            tipo: 'compra',
            origen: body.proveedor || 'Proveedor Externo',
            ordenCompra: body.ordenCompra, // Guardamos la referencia de la OC
            observacion: `Recepción de Combustible. OC: ${body.ordenCompra || 'N/A'}`,
            fecha: new Date(),
            usuarioId: 1 // TODO: ID real
        }, { transaction: t });

        await t.commit();

        return NextResponse.json({ 
            success: true, 
            message: 'Abastecimiento registrado y costos actualizados',
            data: { nuevoStock, nuevoPrecio: nuevoPrecioPromedio }
        });

    } catch (error) {
        await t.rollback();
        console.error("Error abasteciendo:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}