import { NextResponse } from 'next/server';
import {
    syncExchangeRates,
    checkConsumableWarranties,
    checkHREvents,
    checkAssetDocs
} from './services'; // Asegúrate de que la ruta de importación sea correcta
import { notificarCabezas, notificarUsuario } from '@/app/api/notificar/route'; // Tu wrapper de notificaciones

// Configuración Next.js
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Vercel timeout (si tienes plan Pro)

export async function GET(request) {
    // 1. Seguridad (CRITICAL: Usa un Secret Header en tu tarea cron)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        console.log('--- CRON 6AM START ---');

        // 2. Ejecutar todo en PARALELO (Promise.allSettled)
        // Esto asegura que si falla BCV, igual se revisen los empleados.
        const [finanzas, consumibles, rrhh, activos] = await Promise.allSettled([
            syncExchangeRates(),
            checkConsumableWarranties(),
            checkHREvents(),
            checkAssetDocs()
        ]);

        const report = [];

        // 3. Procesar FINANZAS
        if (finanzas.status === 'fulfilled' && finanzas.value.status === 'OK') {
            // Ya notificaste dentro de la función de finanzas si quisiste, 
            // o puedes notificar aquí el resumen.
            report.push("✅ Tasas actualizadas.");
        } else {
            // AQUÍ ESTÁ EL CAMBIO: Ahora mostramos el mensaje de error que viene del servicio
            report.push(`❌ Error Finanzas: ${finanzas.msg}`);
        }
   console.log(consumibles);

    // 4. Procesar INVENTARIO (Garantías)
    if (consumibles.status === 'fulfilled' && consumibles.value.length > 0) {
        const items = consumibles.value;
        // Agrupar mensaje para no enviar 50 notificaciones push
        const body = `Hay ${items.length} consumibles próximos a perder garantía.\nEj: ${items[0].nombre} (${items[0].serial})`;

        await notificarCabezas({
            title: 'Alerta de Garantías',
            body: body,
            url: '/superuser/inventario/garantias',
            tag: 'warranty-check'
        });
        report.push(`✅ ${items.length} garantías detectadas.`);
    }

    // 5. Procesar RRHH (Cumpleaños, Aniversarios, Docs)
    if (rrhh.status === 'fulfilled' && rrhh.value.length > 0) {
        const events = rrhh.value;

        // Aquí te sugiero hacer un bucle si quieres notificaciones individuales
        // o agruparlas por tipo. Ejemplo individual:
        for (const ev of events) {
            await notificarCabezas({
                title: ev.type === 'CUMPLE' ? '🎂 Cumpleaños' : (ev.type === 'ANIVERSARIO' ? '🏆 Aniversario' : '⚠️ Doc. Empleado'),
                body: ev.msg,
                url: '/superuser/rrhh', // URL genérica o específica
                tag: `hr-${Date.now()}` // Tag único para no agruparlas visualmente
            });
        }
        report.push(`✅ ${events.length} eventos de RRHH reportados.`);
    }

    // 6. Procesar DOCUMENTOS ACTIVOS
    if (activos.status === 'fulfilled' && activos.value.length > 0) {
        const docs = activos.value;
        // Agrupamos para no saturar si hay muchos
        const count = docs.length;
        const preview = docs.slice(0, 2).map(d => d.msg).join('\n'); // Mostrar los primeros 2 en el cuerpo

        await notificarCabezas({
            title: `🚨 ${count} Documentos de Activos por vencer`,
            body: `${preview}\n... y ${count - 2} más.`,
            url: '/superuser/flota/documentacion',
            tag: 'asset-docs'
        });
        report.push(`✅ ${count} documentos de activos detectados.`);
    }

    return NextResponse.json({ success: true, report });

} catch (error) {
    console.error('CRON CRITICAL ERROR:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
}
}