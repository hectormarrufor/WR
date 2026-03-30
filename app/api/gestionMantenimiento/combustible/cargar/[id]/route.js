import { NextResponse } from 'next/server';
import sequelize from '@/sequelize';
import { CargaCombustible, Consumible, Kilometraje, SalidaInventario, Activo } from '@/models';

export async function DELETE(request, { params }) {
    const t = await sequelize.transaction();

    try {
        // Next.js 15 requiere que params sea tratado como una promesa
        const { id } = await params;

        const carga = await CargaCombustible.findByPk(id, { transaction: t });
        
        if (!carga) {
            throw new Error('El registro de combustible no existe.');
        }

        // 1. Reversión de Inventario Interno (Tanque de la base)
        if (carga.origen === 'interno' && carga.consumibleOrigenId) {
            const tanque = await Consumible.findByPk(carga.consumibleOrigenId, { transaction: t });
            
            if (tanque) {
                // Devolvemos los litros al tanque de la empresa
                tanque.stockAlmacen = parseFloat(tanque.stockAlmacen) + parseFloat(carga.litros);
                await tanque.save({ transaction: t });

                // Buscamos y eliminamos el movimiento contable de salida
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

        // 2. Reversión del Nivel de Combustible en el Equipo (Camión/Máquina)
        const activo = await Activo.findByPk(carga.activoId, { transaction: t });
        if (activo) {
            const nivelActual = parseFloat(activo.nivelCombustible || 0);
            // Restamos lo despachado. Math.max asegura que el tanque no quede con litros negativos.
            activo.nivelCombustible = Math.max(0, nivelActual - parseFloat(carga.litros));
            await activo.save({ transaction: t });
        }

        // 3. Limpieza de Horómetro/Odómetro asociado
        if (carga.kilometrajeId) {
            await Kilometraje.destroy({ 
                where: { id: carga.kilometrajeId }, 
                transaction: t 
            });
        }

        // 4. Eliminación del registro principal
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