import { NextResponse } from 'next/server';
import sequelize from '@/sequelize';
import { 
    OrdenMantenimiento, 
    Hallazgo, 
    VehiculoInstancia, 
    TareaMantenimiento 
} from '@/models';

// Función para generar código correlativo (OM-2024-001)
async function generarCodigoOM(transaction) {
    const anio = new Date().getFullYear();
    const ultimaOrden = await OrdenMantenimiento.findOne({
        where: sequelize.where(sequelize.fn('EXTRACT', sequelize.literal('YEAR FROM "createdAt"')), anio),
        order: [['id', 'DESC']],
        transaction
    });
    
    let secuencia = 1;
    if (ultimaOrden) {
        const partes = ultimaOrden.codigo.split('-'); // OM-2024-005
        if (partes.length === 3) secuencia = parseInt(partes[2]) + 1;
    }
    return `OM-${anio}-${String(secuencia).padStart(3, '0')}`;
}

export async function POST(request) {
    const t = await sequelize.transaction();

    try {
        const body = await request.json();
        const { 
            vehiculoInstanciaId, 
            tipoMantenimiento, 
            prioridad, 
            descripcionGeneral,
            hallazgosIds = [] // Array de IDs de hallazgos seleccionados para corregir
        } = body;

        // 1. Validar Vehículo
        const vehiculo = await VehiculoInstancia.findByPk(vehiculoInstanciaId, { transaction: t });
        if (!vehiculo) throw new Error('Vehículo no encontrado.');

        // 2. Generar Código
        const codigo = await generarCodigoOM(t);

        // 3. Crear Cabecera de Orden
        const nuevaOrden = await OrdenMantenimiento.create({
            codigo,
            vehiculoInstanciaId,
            tipoMantenimiento,
            prioridad,
            descripcionGeneral,
            kilometrajeAlIngreso: vehiculo.kilometrajeActual, // Captura histórica
            estado: 'Pendiente'
        }, { transaction: t });

        // 4. Vincular Hallazgos y Crear Tareas Automáticas
        if (hallazgosIds.length > 0) {
            
            // Buscar los hallazgos completos para saber su subsistema
            const hallazgos = await Hallazgo.findAll({
                where: { id: hallazgosIds },
                transaction: t
            });

            for (const hallazgo of hallazgos) {
                // A. Actualizar el hallazgo: "Ahora perteneces a esta orden y estás En Proceso"
                hallazgo.ordenMantenimientoId = nuevaOrden.id;
                hallazgo.estado = 'En Proceso';
                await hallazgo.save({ transaction: t });

                // B. Crear una Tarea sugerida para corregir este hallazgo
                await TareaMantenimiento.create({
                    ordenMantenimientoId: nuevaOrden.id,
                    subsistemaInstanciaId: hallazgo.subsistemaInstanciaId,
                    descripcion: `Corrección de hallazgo: ${hallazgo.descripcion}`,
                    estado: 'Pendiente'
                }, { transaction: t });
            }
        }
        
        // Cambio de estado del vehículo (opcional, depende de tu regla de negocio)
        // vehiculo.estado = 'En Mantenimiento';
        // await vehiculo.save({ transaction: t });

        await t.commit();

        return NextResponse.json({ 
            success: true, 
            message: `Orden ${codigo} creada exitosamente.`,
            data: nuevaOrden 
        }, { status: 201 });

    } catch (error) {
        await t.rollback();
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}