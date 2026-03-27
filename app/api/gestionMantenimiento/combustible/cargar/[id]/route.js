import { NextResponse } from 'next/server';
import sequelize from '@/sequelize';
import { CargaCombustible, Consumible, Kilometraje, SalidaInventario, Activo } from '@/models';

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
            // Restamos, pero usamos Math.max para que nunca quede en negativo
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