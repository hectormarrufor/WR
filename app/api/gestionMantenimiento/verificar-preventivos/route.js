import db from '@/models';
import { NextResponse } from 'next/server';

export async function POST(request) { // Se usa POST para que sea una acción explícita
    try {
        const activos = await db.Activo.findAll({
            include: [{ model: db.Modelo, as: 'modelo' }]
        });

        let hallazgosCreados = 0;

        for (const activo of activos) {
            const especificaciones = activo.modelo.especificaciones;
            const intervalo = especificaciones.aceite?.intervaloCambio; // Asumiendo que guardas el intervalo aquí

            if (!intervalo) continue; // Si el modelo no tiene intervalo, lo saltamos

            // 1. Obtener el último kilometraje registrado del activo
            const ultimoKm = await db.Kilometraje.findOne({
                where: { activoId: activo.id },
                order: [['fecha', 'DESC']]
            });
            if (!ultimoKm) continue;

            // 2. Obtener el kilometraje del último cambio de aceite para este activo
            const ultimoCambio = await db.Hallazgo.findOne({
                where: {
                    activoId: activo.id,
                    descripcion: { [Op.like]: '%Cambio de aceite%' },
                    estado: 'Resuelto'
                },
                include: [{ model: db.Inspeccion, as: 'inspeccion' }],
                order: [['createdAt', 'DESC']]
            });
            const kmUltimoCambio = ultimoCambio?.inspeccion?.kilometrajeActual || 0;

            // 3. Verificar si ya existe un hallazgo pendiente para esto
            const hallazgoPendiente = await db.Hallazgo.count({
                where: { activoId: activo.id, descripcion: { [Op.like]: '%Cambio de aceite%' }, estado: 'Pendiente' }
            });

            // 4. Lógica de decisión
            if (ultimoKm.valor - kmUltimoCambio >= intervalo && hallazgoPendiente === 0) {
                // ¡Se necesita mantenimiento! Creamos el hallazgo.
                await db.Hallazgo.create({
                    activoId: activo.id,
                    descripcion: `Cambio de aceite y filtro requerido por kilometraje (${ultimoKm.valor} KM)`,
                    tipo: 'Preventivo',
                    prioridad: 'Alta',
                    origen: 'Sistema'
                });
                hallazgosCreados++;
            }
        }
        return NextResponse.json({ message: `Verificación completa. Se crearon ${hallazgosCreados} hallazgos preventivos.` });
    } catch (error) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}