import { NextResponse } from 'next/server';
import sequelize from '@/sequelize';
import { 
    Consumible, 
    ConsumibleSerializado, 
    ConsumibleUsado, 
    SubsistemaInstancia, 
    ConsumibleRecomendado 
} from '@/models';

export async function POST(request) {
    const t = await sequelize.transaction();
    try {
        const body = await request.json();
        const { 
            subsistemaInstanciaId, 
            consumibleId, 
            cantidad = 1, 
            consumibleSerializadoId = null,
            kilometrajeActual = 0 
        } = body;

        // 1. Validar Subsistema
        const subInstancia = await SubsistemaInstancia.findByPk(subsistemaInstanciaId, { transaction: t });
        if (!subInstancia) throw new Error('Subsistema Instancia no encontrado.');

        // 2. Validar Compatibilidad (que esté recomendado para la plantilla)
        const esCompatible = await ConsumibleRecomendado.findOne({
            where: {
                subsistemaId: subInstancia.subsistemaId,
                consumibleId: consumibleId
            },
            transaction: t
        });

        if (!esCompatible) {
            throw new Error('El consumible no es compatible con este subsistema.');
        }

        // 3. Buscar Consumible General
        const consumible = await Consumible.findByPk(consumibleId, { transaction: t });
        if (!consumible) throw new Error('Consumible no encontrado.');

        // 4. Lógica según tipo
        const esInstalacionSerializada = consumible.esSerializado || consumibleSerializadoId !== null;

        if (esInstalacionSerializada) {
            // --- CASO SERIALIZADO ---
            if (!consumibleSerializadoId) throw new Error('Se requiere ID serializado.');

            const itemSerializado = await ConsumibleSerializado.findOne({
                where: { id: consumibleSerializadoId, consumibleId: consumibleId },
                transaction: t
            });

            if (!itemSerializado) throw new Error('Ítem serializado no encontrado.');
            if (itemSerializado.estado !== 'Disponible') throw new Error(`El ítem ${itemSerializado.serial} no está disponible (Estado: ${itemSerializado.estado}).`);

            // Crear registro
            await ConsumibleUsado.create({
                subsistemaInstanciaId,
                consumibleId,
                consumibleSerializadoId,
                cantidad: 1,
                vidaUtilInicial: kilometrajeActual
            }, { transaction: t });

            // Actualizar estado a "En Uso"
            itemSerializado.estado = 'En Uso';
            await itemSerializado.save({ transaction: t });

            // Restar stock global
            await consumible.decrement('stockActual', { by: 1, transaction: t });

        } else {
            // --- CASO FUNGIBLE ---
            if (consumible.stockActual < cantidad) {
                throw new Error(`Stock insuficiente (Req: ${cantidad}, Disp: ${consumible.stockActual}).`);
            }

            await ConsumibleUsado.create({
                subsistemaInstanciaId,
                consumibleId,
                consumibleSerializadoId: null,
                cantidad: cantidad,
                vidaUtilInicial: kilometrajeActual
            }, { transaction: t });

            // Restar stock global
            await consumible.decrement('stockActual', { by: cantidad, transaction: t });
        }

        await t.commit();
        return NextResponse.json({ success: true, message: 'Asignado correctamente' });

    } catch (error) {
        await t.rollback();
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}