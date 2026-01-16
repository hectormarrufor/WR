import { NextResponse } from 'next/server';
import sequelize from '@/sequelize';
import { 
    Consumible, 
    ConsumibleSerializado, 
    ConsumibleInstalado 
} from '@/models';

export async function DELETE(request, { params }) {
    const { id } = params; // ID de la tabla pivote (ConsumibleInstalado)
    
    // Obtener parámetros de la URL para saber el destino de la pieza
    const { searchParams } = new URL(request.url);
    const motivo = searchParams.get('motivo') || 'disponible'; // valores: 'disponible', 'dañado'

    const t = await sequelize.transaction();

    try {
        // 1. Buscar el registro de instalación
        const uso = await ConsumibleInstalado.findByPk(id, { transaction: t });
        if (!uso) throw new Error('Registro de instalación no encontrado.');

        // 2. Lógica para SERIALIZADOS
        if (uso.consumibleSerializadoId) {
            const itemSerializado = await ConsumibleSerializado.findByPk(uso.consumibleSerializadoId, { transaction: t });
            
            if (itemSerializado) {
                if (motivo === 'dañado') {
                    // --- LÓGICA DE GARANTÍA Y DAÑOS ---
                    const hoy = new Date();
                    const finGarantia = itemSerializado.fechaFinGarantia ? new Date(itemSerializado.fechaFinGarantia) : null;
                    
                    // Determinamos si aplica garantía
                    const enGarantia = finGarantia && hoy <= finGarantia;
                    
                    // Actualizamos estado: 'Garantía' para reclamo, o 'Dañado' para almacén de desechos
                    itemSerializado.estado = enGarantia ? 'Garantía' : 'Dañado';
                    
                    // IMPORTANTE: NO incrementamos el stockActual del padre (Consumible) 
                    // porque una pieza dañada no debe contar como disponible para instalar.
                    
                } else {
                    // --- LÓGICA DE REINGRESO A STOCK (Está buena) ---
                    itemSerializado.estado = 'Disponible';
                    
                    // Aquí SÍ sumamos al stock global
                    await Consumible.increment('stockActual', { 
                        by: 1, 
                        where: { id: uso.consumibleId },
                        transaction: t 
                    });
                }

                // Guardamos el cambio de estado del serializado
                await itemSerializado.save({ transaction: t });
            }

        } else {
            // 3. Lógica para FUNGIBLES (Aceite, etc.)
            // Si es fungible y se daña (se botó el aceite, se quemó el bombillo), se pierde.
            // Si es 'disponible', es porque se sacó y se guardó de nuevo (ej. sobrante).
            
            if (motivo === 'disponible') {
                await Consumible.increment('stockActual', { 
                    by: uso.cantidad, 
                    where: { id: uso.consumibleId },
                    transaction: t 
                });
            }
            // Si es 'dañado' en fungible, simplemente no incrementamos stock (es pérdida total)
        }

        // 4. Eliminar el registro de uso (Desvinculamos del vehículo)
        // Al usar soft-deletes (paranoid), queda el histórico de que estuvo ahí.
        await uso.destroy({ transaction: t });

        await t.commit();
        
        return NextResponse.json({ 
            success: true, 
            message: motivo === 'dañado' 
                ? 'Retirado y enviado a control de daños/garantía.' 
                : 'Retirado y reingresado a stock operativo.' 
        });

    } catch (error) {
        await t.rollback();
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}