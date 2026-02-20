import { NextResponse } from 'next/server';
import db from '@/models';

// Función mágica que procesa una matriz dinámica en vivo
const calcularDesgasteDinamico = (matriz, distanciaKm, horasTotales, calidadPorcentaje) => {
    if (!matriz || !matriz.detalles) return { mtto: 0, posesion: 0 };

    let costoMantenimiento = 0; // Gastos por Km y Horas operativas
    let costoPosesion = 0;      // Gastos por Meses (Seguros, Trámites, Depreciación) prorrateados

    // Factor de calidad (0 a 1)
    const factor = calidadPorcentaje / 100;

    matriz.detalles.forEach(detalle => {
        // Interpolación lineal entre el Min y Max según el Slider
        const costoAplicado = detalle.costoMinimo + ((detalle.costoMaximo - detalle.costoMinimo) * factor);
        const costoTotalItem = costoAplicado * detalle.cantidad;

        if (detalle.tipoDesgaste === 'km') {
            // Cuánto cuesta este repuesto por cada kilómetro recorrido
            const costoPorKm = costoTotalItem / detalle.frecuencia;
            costoMantenimiento += (costoPorKm * distanciaKm);
        } 
        else if (detalle.tipoDesgaste === 'horas') {
            // Cuánto cuesta este repuesto por cada hora de motor/PTO encendido
            const costoPorHora = costoTotalItem / detalle.frecuencia;
            costoMantenimiento += (costoPorHora * horasTotales);
        }
        else if (detalle.tipoDesgaste === 'meses') {
            // Posesión: Seguros y trámites. 
            // 1 mes = 730 horas aprox. Sacamos cuánto cuesta tener el camión parado o rodando por hora.
            const costoPorMes = costoTotalItem / detalle.frecuencia;
            const costoPorHoraFija = costoPorMes / 730; 
            costoPosesion += (costoPorHoraFija * horasTotales);
        }
    });

    // Sumamos la depreciación/interés base de la matriz si existe
    costoPosesion += (matriz.costoPosesionHora || 0) * horasTotales;

    return { mtto: costoMantenimiento, posesion: costoPosesion };
};


export async function POST(req) {
    try {
        const body = await req.json();
        const { 
            tipoCotizacion, activoPrincipalId, remolqueId, distanciaKm, 
            horasOperacion = 0, tonelaje = 0, cantidadPeajes = 0, 
            precioPeajeBs = 1900, bcv = 1, precioGasoilUsd = 0.5, 
            sueldoChoferMensual = 0, sueldoAyudanteMensual = 0, tieneAyudante = false,
            calidadRepuestos = 50, porcentajeGanancia = 0.30 
        } = body;

        // 1. OBTENER LOS ACTIVOS Y SUS MATRICES EN VIVO
        const chuto = await db.Activo.findByPk(activoPrincipalId, {
            include: [{ model: db.MatrizCosto, as: 'matrizCosto', include: ['detalles'] }]
        });
        
        const batea = remolqueId ? await db.Activo.findByPk(remolqueId, {
            include: [{ model: db.MatrizCosto, as: 'matrizCosto', include: ['detalles'] }]
        }) : null;

        if (!chuto || !chuto.matrizCosto) {
            return NextResponse.json({ error: "Vehículo principal no tiene Matriz de Costos asociada" }, { status: 400 });
        }

        // 2. TIEMPOS
        const velocidad = chuto.velocidadPromedioTeorica || 50; 
        const horasViaje = distanciaKm / velocidad;
        const horasTotales = tipoCotizacion === 'servicio' ? (horasViaje + horasOperacion) : horasViaje; 

        // 3. MANTENIMIENTO DINÁMICO (Aquí ocurre la magia del Slider)
        const calculoChuto = calcularDesgasteDinamico(chuto.matrizCosto, distanciaKm, horasTotales, calidadRepuestos);
        const calculoBatea = batea ? calcularDesgasteDinamico(batea.matrizCosto, distanciaKm, horasTotales, calidadRepuestos) : { mtto: 0, posesion: 0 };

        const totalMantenimiento = calculoChuto.mtto + calculoBatea.mtto;
        const totalPosesion = calculoChuto.posesion + calculoBatea.posesion;

        // 4. COMBUSTIBLE (Sigue saliendo del Activo porque el consumo es físico del camión, no cambia por matriz)
        let totalCombustible = 0;
        const consumoLleno = chuto.consumoCombustibleLPorKm ?? 0.35; 
        const consumoVacio = chuto.consumoBaseLPorKm ?? 0.25;        
        
        let litrosConsumidos = 0;
        if (tipoCotizacion === 'flete') {
            litrosConsumidos = (tonelaje > 0) 
                ? ((distanciaKm / 2) * consumoLleno + (distanciaKm / 2) * consumoVacio)
                : (distanciaKm * consumoVacio);
        } else {
            litrosConsumidos = (distanciaKm * consumoVacio) + (horasOperacion * 5.0);
        }
        totalCombustible = litrosConsumidos * precioGasoilUsd;

        // 5. NÓMINA Y PEAJES (Igual que antes)
        const tarifaHoraChofer = sueldoChoferMensual > 0 ? (sueldoChoferMensual / 4 / 7 / 24) : 1.50; 
        const tarifaHoraAyudante = sueldoAyudanteMensual > 0 ? (sueldoAyudanteMensual / 4 / 7 / 24) : 0.80;
        const totalNomina = (horasTotales * tarifaHoraChofer) + (tieneAyudante ? (horasTotales * tarifaHoraAyudante) : 0);
        const totalViaticos = Math.ceil(horasTotales / 12) * 25 * (tieneAyudante ? 2 : 1);
        const totalPeajes = cantidadPeajes * (precioPeajeBs / bcv);

        const totalOperativos = totalPeajes + totalNomina + totalViaticos;
        const costoTotal = totalCombustible + totalMantenimiento + totalPosesion + totalOperativos;
        const precioSugerido = costoTotal / (1 - porcentajeGanancia); 

        return NextResponse.json({
            success: true,
            costoTotal: parseFloat(costoTotal.toFixed(2)),
            precioSugerido: parseFloat(precioSugerido.toFixed(2)),
            breakdown: {
                litros: parseFloat(litrosConsumidos.toFixed(2)),
                combustible: parseFloat(totalCombustible.toFixed(2)),
                mantenimiento: parseFloat(totalMantenimiento.toFixed(2)),
                posesion: parseFloat(totalPosesion.toFixed(2)),
                peajes: parseFloat(totalPeajes.toFixed(2)),
                nomina: parseFloat(totalNomina.toFixed(2)),
                viaticos: parseFloat(totalViaticos.toFixed(2)),
                operativos: parseFloat(totalOperativos.toFixed(2)) 
            }
        });

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}