import db from '@/models';
import { NextResponse } from 'next/server';

export async function GET() {
    const entradas = await db.EntradaInventario.findAll({ include: ['consumible'], order: [['fecha', 'DESC']] });
    return NextResponse.json(entradas);
}

export async function POST(request) {
   const transaction = await db.sequelize.transaction();
    try {
        const body = await request.json();
        const { renglones, userId } = body;

        if (!userId || !Array.isArray(renglones) || renglones.length === 0) {
            throw new Error('Datos inválidos. Se requiere un usuario y al menos un renglón.');
        }

        // ✨ LA CORRECCIÓN CLAVE: Usamos un bucle 'for...of' que respeta 'await'
        // para procesar cada renglón de forma SECUENCIAL.
        for (const renglon of renglones) {
            const { consumibleId, cantidad, costoUnitario } = renglon;

            // 1. Obtenemos el estado MÁS RECIENTE del consumible dentro de la transacción.
            const consumible = await db.Consumible.findByPk(consumibleId, { transaction });
            if (!consumible) throw new Error(`Consumible con ID ${consumibleId} no encontrado.`);

            const stockActual = parseFloat(consumible.stock);
            const costoPromedioViejo = parseFloat(consumible.costoPromedio);
            const cantidadNueva = parseFloat(cantidad);
            const costoNuevo = parseFloat(costoUnitario);

            // 2. Realizamos el cálculo del costo promedio ponderado.
            const valorInventarioActual = stockActual * costoPromedioViejo;
            const valorInventarioNuevo = cantidadNueva * costoNuevo;
            const nuevoStockTotal = stockActual + cantidadNueva;

            const nuevoCostoPromedio = nuevoStockTotal > 0
                ? (valorInventarioActual + valorInventarioNuevo) / nuevoStockTotal
                : costoNuevo;

            // 3. Actualizamos el consumible con los nuevos valores.
            await consumible.update({
                stock: nuevoStockTotal,
                costoPromedio: nuevoCostoPromedio
            }, { transaction });

            // 4. Creamos el registro de la entrada individual.
            await db.EntradaInventario.create({ ...renglon, usuarioId: userId }, { transaction });
        }

        // 5. Si todos los renglones se procesaron sin error, confirmamos.
        await transaction.commit();
        
        return NextResponse.json({ message: `${renglones.length} entrada(s) registrada(s) exitosamente.` }, { status: 201 });

    } catch (error) {
        await transaction.rollback();
        console.error("Error al registrar entrada de inventario:", error);
        return NextResponse.json({ message: error.message }, { status: 400 });
    }
}