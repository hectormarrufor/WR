import { NextResponse } from 'next/server';
import db from '@/models';

export async function POST(req) {
    try {
        const body = await req.json();
        const { 
            tipoCotizacion, 
            activoPrincipalId, 
            remolqueId, 
            distanciaKm, 
            horasOperacion = 0, 
            tonelaje = 0, 
            cantidadPeajes = 0, 
            precioPeajeUnitario = 5, 
            precioGasoilUsd = 0.5, 
            porcentajeGanancia = 0.30 
        } = body;

        // 1. Obtener los Activos directamente (SIN el include 'matriz')
        const chuto = await db.Activo.findByPk(activoPrincipalId);
        const batea = remolqueId ? await db.Activo.findByPk(remolqueId) : null;

        if (!chuto) {
            return NextResponse.json({ error: "Vehículo principal no encontrado" }, { status: 404 });
        }

        // 2. Constantes Laborales (Viáticos y Nómina)
        const SUELDO_CHOFER_DIA = 35;  
        const SUELDO_AYUDANTE_DIA = 20;
        const VIATICOS_DIA = 25;       

        // 3. Cálculos de Tiempo
        // Usamos tu campo de la BD, o un fallback razonable para vehículos pesados
        const velocidad = chuto.velocidadPromedioTeorica || 50; 
        const horasViaje = distanciaKm / velocidad;
        
        // Si es ODT suma las horas de trabajo, si es Flete es puro rodamiento
        const horasTotales = tipoCotizacion === 'servicio' 
            ? (horasViaje + horasOperacion) 
            : horasViaje; 

        const diasTrabajo = Math.ceil(horasTotales / 12); // Asumimos turnos de 12 horas

        // 4. MANTENIMIENTO VARIABLE (Usando tu campo costoMantenimientoTeorico $/Km)
        const mttoChuto = distanciaKm * (chuto.costoMantenimientoTeorico || 0.46);
        const mttoBatea = batea ? (distanciaKm * (batea.costoMantenimientoTeorico || 0.15)) : 0;
        const totalMantenimiento = mttoChuto + mttoBatea;

        // 5. POSESIÓN Y COSTOS FIJOS (Usando tu campo costoPosesionTeorico $/Hr)
        const posesionChuto = horasTotales * (chuto.costoPosesionTeorico || 3.00);
        const posesionBatea = batea ? (horasTotales * (batea.costoPosesionTeorico || 1.00)) : 0;
        const totalPosesion = posesionChuto + posesionBatea;

        // 6. COMBUSTIBLE (Magia pura con tus campos consumoBaseLPorKm y consumoCombustibleLPorKm)
        let totalCombustible = 0;
        const consumoLleno = chuto.consumoCombustibleLPorKm || 0.35; // Litros por km
        const consumoVacio = chuto.consumoBaseLPorKm || 0.25;        // Litros por km
        
        if (tipoCotizacion === 'flete') {
            // Flete Logístico: Generalmente va cargado y regresa vacío (50/50 de la ruta)
            let litrosConsumidos = 0;
            if (tonelaje > 0) {
                litrosConsumidos = (distanciaKm / 2) * consumoLleno + (distanciaKm / 2) * consumoVacio;
            } else {
                litrosConsumidos = distanciaKm * consumoVacio;
            }
            totalCombustible = litrosConsumidos * precioGasoilUsd;
        } else {
            // Servicio ODT (Vacuum / Maquinaria): Va y viene vacío, pero consume estando estacionado
            const litrosViaje = distanciaKm * consumoVacio; 
            // Toma de Fuerza (PTO): Un camión bombeando gasta aprox 4 a 5 Lts/Hr
            const litrosOperacion = horasOperacion * 5.0; 
            totalCombustible = (litrosViaje + litrosOperacion) * precioGasoilUsd;
        }

        // 7. GASTOS OPERATIVOS (Peajes y Nómina)
        const totalPeajes = cantidadPeajes * precioPeajeUnitario;
        const nominaChofer = diasTrabajo * SUELDO_CHOFER_DIA;
        // Si hay remolque pesado o es servicio, asumimos que va un ayudante
        const nominaAyudante = (batea || tipoCotizacion === 'servicio') ? (diasTrabajo * SUELDO_AYUDANTE_DIA) : 0; 
        const totalViaticos = diasTrabajo * VIATICOS_DIA;
        
        const totalOperativos = totalPeajes + nominaChofer + nominaAyudante + totalViaticos;

        // 8. TOTALES Y MÁRGENES (Markup)
        const costoTotal = totalCombustible + totalMantenimiento + totalPosesion + totalOperativos;
        const precioSugerido = costoTotal / (1 - porcentajeGanancia); 

        return NextResponse.json({
            success: true,
            costoTotal: parseFloat(costoTotal.toFixed(2)),
            precioSugerido: parseFloat(precioSugerido.toFixed(2)),
            metrics: { detalle: tipoCotizacion === 'flete' ? "Cálculo de Ruta (Cargado/Vacío)" : "Cálculo de Servicio (PTO/Horas)" },
            breakdown: {
                combustible: parseFloat(totalCombustible.toFixed(2)),
                mantenimiento: parseFloat(totalMantenimiento.toFixed(2)),
                posesion: parseFloat(totalPosesion.toFixed(2)),
                peajes: parseFloat(totalPeajes.toFixed(2)),
                nomina: parseFloat((nominaChofer + nominaAyudante).toFixed(2)),
                viaticos: parseFloat(totalViaticos.toFixed(2)),
                operativos: parseFloat(totalOperativos.toFixed(2)) 
            }
        });

    } catch (error) {
        console.error("Error estimando flete/servicio:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}