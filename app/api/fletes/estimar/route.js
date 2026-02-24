import { NextResponse } from 'next/server';
import db from '@/models';

// Función mágica que procesa una matriz dinámica en vivo
const calcularDesgasteDinamico = (matriz, distanciaKm, horasTotales, calidadPorcentaje, nombreActivo) => {
    if (!matriz || !matriz.detalles) return { mtto: 0, posesion: 0, items: [] };

    let costoMantenimiento = 0;
    let costoPosesion = 0;
    let desgloseItems = [];
    const factor = calidadPorcentaje / 100;

    matriz.detalles.forEach(detalle => {
        const costoAplicado = detalle.costoMinimo + ((detalle.costoMaximo - detalle.costoMinimo) * factor);
        const costoTotalItem = costoAplicado * detalle.cantidad;
        let costoEnViaje = 0;
        let tipoEtiqueta = '';

        if (detalle.tipoDesgaste === 'km') {
            const costoPorKm = costoTotalItem / detalle.frecuencia;
            costoEnViaje = costoPorKm * distanciaKm;
            costoMantenimiento += costoEnViaje;
            tipoEtiqueta = 'Rodamiento';
        } else if (detalle.tipoDesgaste === 'horas') {
            const costoPorHora = costoTotalItem / detalle.frecuencia;
            costoEnViaje = costoPorHora * horasTotales;
            costoMantenimiento += costoEnViaje;
            tipoEtiqueta = 'Por Hora';
        } else if (detalle.tipoDesgaste === 'meses') {
            const costoPorMes = costoTotalItem / detalle.frecuencia;
            const costoPorHoraFija = costoPorMes / 730;
            costoEnViaje = costoPorHoraFija * horasTotales;
            costoPosesion += costoEnViaje;
            tipoEtiqueta = 'Fijo/Tiempo';
        }

        desgloseItems.push({
            descripcion: `[${nombreActivo}] ${detalle.descripcion}`,
            monto: costoEnViaje,
            tipo: tipoEtiqueta
        });
    });

    return { mtto: costoMantenimiento, posesion: costoPosesion, items: desgloseItems };
};


export async function POST(req) {
    try {
        const body = await req.json();
        const {
            tipoCotizacion, activoPrincipalId, remolqueId, distanciaKm,
            horasOperacion = 0, tonelaje = 0, cantidadPeajes = 0,
            precioPeajeBs = 1900, bcv = 1, precioGasoilUsd = 0.5,
            sueldoChoferMensual = 0, sueldoAyudanteMensual = 0, tieneAyudante = false,
            calidadRepuestos = 50, porcentajeGanancia = 0.30, viaticosManuales = 0
        } = body;

        // ------------------------------------------------------------------
        // --- 1. EXTRACCIÓN DE DATOS BASE ---
        // ------------------------------------------------------------------
        const chuto = await db.Activo.findByPk(activoPrincipalId, {
            include: [
                { model: db.MatrizCosto, as: 'matrizCosto', include: ['detalles'] },
                { model: db.VehiculoInstancia, as: 'vehiculoInstancia', include: [{ model: db.Vehiculo, as: 'plantilla' }] }
            ]
        });

        const batea = remolqueId ? await db.Activo.findByPk(remolqueId, {
            include: [
                { model: db.MatrizCosto, as: 'matrizCosto', include: ['detalles'] },
                { model: db.RemolqueInstancia, as: 'remolqueInstancia', include: [{ model: db.Remolque, as: 'plantilla' }] }
            ]
        }) : null;

        if (!chuto || !chuto.matrizCosto) {
            return NextResponse.json({ error: "Vehículo principal no tiene Matriz de Costos asociada" }, { status: 400 });
        }

        const fichaTecnicaChuto = chuto.vehiculoInstancia?.plantilla;
        const fichaTecnicaBatea = batea?.remolqueInstancia?.plantilla;

        // ------------------------------------------------------------------
        // --- 2. TELEMETRÍA Y PESOS (Necesario para calcular Tiempos) ---
        // ------------------------------------------------------------------
        let capacidadMax = chuto.capacidadTonelajeMax || fichaTecnicaChuto?.capacidadArrastre || fichaTecnicaChuto?.pesoMaximoCombinado || 30;
        let fuenteCapacidad = chuto.capacidadTonelajeMax ? 'Real (Perfil del Activo)' : 'Teórico (Manual/Plantilla)';

        let pesoRemolque = 0;
        let fuenteRemolque = 'Sin Remolque';
        if (batea) {
            pesoRemolque = batea.tara || fichaTecnicaBatea?.peso || 6;
            fuenteRemolque = batea.tara ? 'Real (Balanza)' : (fichaTecnicaBatea?.peso ? 'Teórico' : 'Por Defecto (6t)');
        }

        const pesoFabricaChuto = fichaTecnicaChuto?.peso || 0;
        const pesoRealChuto = chuto.tara || pesoFabricaChuto || 0;
        const fuenteChuto = chuto.tara ? 'Real (Balanza)' : 'Teórico/Defecto';
        const sobrepesoChuto = (pesoRealChuto > pesoFabricaChuto && pesoFabricaChuto > 0) ? (pesoRealChuto - pesoFabricaChuto) : 0;

        let consumoLleno = chuto.consumoCombustibleLPorKm || fichaTecnicaChuto?.consumoTeoricoLleno || 0.35;
        let consumoVacio = chuto.consumoBaseLPorKm || fichaTecnicaChuto?.consumoTeoricoVacio || 0.25;
        let fuenteRendimiento = chuto.consumoCombustibleLPorKm ? 'Real (Medido en Flota)' : 'Teórico/Defecto';

        // ------------------------------------------------------------------
        // --- 3. CÁLCULO FÍSICO DE TIEMPO (AHORA SE HACE PRIMERO) ---
        // ------------------------------------------------------------------
        let horasTotales = 0;
        let horasEsperaTotales = 0; // <--- NUEVA VARIABLE PARA RASTREAR ESPERAS
        
        if (tipoCotizacion === 'flete' && body.tramos && body.tramos.length > 0) {
            let tiempoFinalSegundos = 0;
            body.tramos.forEach(tramo => {
                const tiempoBaseRealista = (tramo.tiempoBaseSegundos || 0) * 1.4; // Factor Venezuela
                let segundosTramo = tiempoBaseRealista;

                const pesoBrutoTramo = tramo.tonelaje + pesoRemolque + sobrepesoChuto;
                const factorCarga = Math.min(pesoBrutoTramo / capacidadMax, 1);

                const demoraHorizontal = 0.10 + (0.30 * factorCarga);
                segundosTramo += (tiempoBaseRealista * demoraHorizontal);

                if (tramo.desnivelMetros > 0) {
                    const penalidadMontaña = (tramo.desnivelMetros / 100) * (90 + (120 * factorCarga));
                    segundosTramo += penalidadMontaña;
                }

                // Extraemos la espera y la sumamos al contador global
                const esperaTramoHoras = parseFloat(tramo.tiempoEspera || 0);
                horasEsperaTotales += esperaTramoHoras; 
                segundosTramo += (esperaTramoHoras * 3600);

                tiempoFinalSegundos += segundosTramo;
            });
            horasTotales = tiempoFinalSegundos / 3600;
        } else {
            const velocidad = chuto.velocidadPromedioTeorica || 50;
            const horasViaje = distanciaKm / velocidad;
            horasTotales = tipoCotizacion === 'servicio' ? (horasViaje + horasOperacion) : horasViaje;
        }

        // CÁLCULO DE VELOCIDAD NORMALIZADA
        const horasConduccionPura = horasTotales - horasEsperaTotales;
        const velocidadPromedioReal = horasConduccionPura > 0 ? (distanciaKm / horasConduccionPura) : 0;

        // ------------------------------------------------------------------
        // --- 4. MANTENIMIENTO DINÁMICO (Con las horas calculadas) ---
        // ------------------------------------------------------------------
        const calculoChuto = calcularDesgasteDinamico(chuto.matrizCosto, distanciaKm, horasTotales, calidadRepuestos, 'Chuto');
        const calculoBatea = batea ? calcularDesgasteDinamico(batea.matrizCosto, distanciaKm, horasTotales, calidadRepuestos, 'Batea') : { mtto: 0, posesion: 0, items: [] };

        const totalMantenimiento = calculoChuto.mtto + calculoBatea.mtto;
        const listaCompletaRepuestos = [...calculoChuto.items, ...calculoBatea.items].sort((a, b) => b.monto - a.monto);

        // ------------------------------------------------------------------
        // --- 5. COMBUSTIBLE ---
        // ------------------------------------------------------------------
        let litrosBaseDistancia = 0;
        let litrosExtraPeso = 0;
        let litrosExtraElevacion = 0;

        if (tipoCotizacion === 'flete' && body.tramos && body.tramos.length > 0) {
            body.tramos.forEach(tramo => {
                const pesoBrutoTramo = tramo.tonelaje + pesoRemolque + sobrepesoChuto;
                const factorCarga = Math.min(pesoBrutoTramo / capacidadMax, 1);

                litrosBaseDistancia += tramo.distanciaKm * consumoVacio;
                litrosExtraPeso += tramo.distanciaKm * (factorCarga * (consumoLleno - consumoVacio));
                
                const factorGasoilPorMetroTon = 0.68 / 1000;
                litrosExtraElevacion += pesoBrutoTramo * (tramo.desnivelMetros || 0) * factorGasoilPorMetroTon;
            });
        } else {
            litrosBaseDistancia = (distanciaKm * consumoVacio) + (horasOperacion * 5.0);
        }

        const litrosConsumidos = litrosBaseDistancia + litrosExtraPeso + litrosExtraElevacion;
        const totalCombustible = litrosConsumidos * precioGasoilUsd;

        // ------------------------------------------------------------------
        // --- 6. NÓMINA, CRONOGRAMA Y VIÁTICOS (Basado en Horas Reales) ---
        // ------------------------------------------------------------------
        const jornadaMax = body.jornadaMaxima || 10;
        const horaSalidaSt = body.horaSalida || "06:00";
        const comidaPrimerDia = body.comidaPrimerDia || false;
        
        // FÓRMULA DE NÓMINA (Pago exacto por fracción de hora trabajada: /4/7/24)
        const valorHoraChofer = sueldoChoferMensual / 4 / 7 / 24;
        const nominaChofer = valorHoraChofer * horasTotales;
        
        let nominaAyudante = 0;
        if (tieneAyudante && sueldoAyudanteMensual) {
            const valorHoraAyudante = sueldoAyudanteMensual / 4 / 7 / 24;
            nominaAyudante = valorHoraAyudante * horasTotales;
        }
        const nominaTotal = nominaChofer + nominaAyudante;

        // --- GENERADOR DEL CRONOGRAMA ---
        let tiempoRestante = horasTotales;
        let diaActual = 1;
        let itinerario = [];
        let [horaReloj, minReloj] = horaSalidaSt.split(':').map(Number);
        
        // Contadores de logística real
        let diasConComida = 0;
        let nochesHotel = 0;
        const costoComidaDia = 15;
        const costoHotelNoche = 15;
        const factorPersonal = tieneAyudante ? 2 : 1;

        // Si el usuario marcó que SÍ se paga comida el día que arranca:
        if (comidaPrimerDia) diasConComida++;

        while (tiempoRestante > 0) {
            // ¿Cuánto conduce hoy? Lo que falte, o el límite de la jornada máxima
            let horasTramoHoy = Math.min(tiempoRestante, jornadaMax);
            
            // Calcular la hora a la que termina de manejar hoy
            let horasRealesInt = Math.floor(horasTramoHoy);
            let minutosReales = Math.round((horasTramoHoy - horasRealesInt) * 60);
            
            let horaFin = horaReloj + horasRealesInt;
            let minFin = minReloj + minutosReales;
            if (minFin >= 60) { horaFin++; minFin -= 60; }
            if (horaFin >= 24) { horaFin -= 24; } // Formato 24h

            const inicioStr = `${String(horaReloj).padStart(2, '0')}:${String(minReloj).padStart(2, '0')}`;
            const finStr = `${String(horaFin).padStart(2, '0')}:${String(minFin).padStart(2, '0')}`;

            let detalleV = diaActual === 1 && comidaPrimerDia ? `+ Comida ($${costoComidaDia * factorPersonal})` : null;
            if (diaActual > 1) detalleV = `+ Comida ($${costoComidaDia * factorPersonal})`;

            itinerario.push({
                dia: diaActual,
                tipo: 'trabajo',
                accion: `Ruta en progreso (${horasTramoHoy.toFixed(1)} Hrs)`,
                inicio: inicioStr,
                fin: finStr,
                detalleViatico: detalleV
            });

            tiempoRestante -= horasTramoHoy;

            // Si aún queda viaje para mañana, toca dormir
            if (tiempoRestante > 0) {
                nochesHotel++;
                diasConComida++; // El día de mañana automáticamente lleva comida
                
                // Las horas de descanso son 24 menos las horas trabajadas en la jornada
                const horasDescanso = 24 - horasTramoHoy;
                
                itinerario.push({
                    dia: diaActual,
                    tipo: 'descanso',
                    accion: `Pernocta Obligatoria (${horasDescanso.toFixed(1)} Hrs de parada)`,
                    inicio: finStr,
                    fin: inicioStr, // Al día siguiente arranca a la misma hora base
                    detalleViatico: `+ Hotel ($${costoHotelNoche * factorPersonal})`
                });
                
                diaActual++;
                // Para el día siguiente, la hora de reloj vuelve a ser la hora de salida estándar
                horaReloj = parseInt(horaSalidaSt.split(':')[0]);
                minReloj = parseInt(horaSalidaSt.split(':')[1]);
            }
        }

        // --- CÁLCULO FINAL DE VIÁTICOS ---
        const totalComida = diasConComida * costoComidaDia * factorPersonal;
        const totalHotel = nochesHotel * costoHotelNoche * factorPersonal;
        const viaticosManual = parseFloat(viaticosManuales || 0);
        const viaticosTotal = totalComida + totalHotel + viaticosManual;

        // ------------------------------------------------------------------
        // --- 7. DEPRECIACIÓN Y COSTO DE POSESIÓN ---
        // ------------------------------------------------------------------
        const valorReposicion = chuto.valorReposicion || 40000;
        const valorSalvamento = chuto.valorSalvamento || 5000;
        const vidaUtilAnios = chuto.vidaUtilAnios || 10;

        const horasVidaUtil = vidaUtilAnios * 2400;
        const depreciacionPorHora = (valorReposicion - valorSalvamento) / horasVidaUtil;
        const interesAnual = 0.05;
        const costoCapitalHora = (valorReposicion * interesAnual) / 2400;

        const totalDepreciacion = depreciacionPorHora * horasTotales;
        const totalCapital = costoCapitalHora * horasTotales;
        
        // Sumamos Depreciación Financiera + Gastos Fijos de Matriz (Seguros/Trámites)
        const costoPosesionTotal = totalDepreciacion + totalCapital + calculoChuto.posesion + calculoBatea.posesion;

        // ------------------------------------------------------------------
        // --- 8. PEAJES Y CIERRE ---
        // ------------------------------------------------------------------
        const totalPeajes = cantidadPeajes * (precioPeajeBs / bcv);

        const costoTotal = totalCombustible + nominaTotal + viaticosTotal + totalPeajes + totalMantenimiento + costoPosesionTotal;
        const margen = body.porcentajeGanancia || 0.30;
        const precioSugerido = costoTotal / (1 - margen);

        return NextResponse.json({
            success: true,
            costoTotal,
            precioSugerido,
            breakdown: {
                litros: parseFloat(litrosConsumidos.toFixed(2)),
                combustible: totalCombustible,
                combustibleDetalle: {
                    baseDistancia: litrosBaseDistancia,
                    extraPeso: litrosExtraPeso,
                    extraElevacion: litrosExtraElevacion
                },
                nomina: nominaTotal,
                nominaDetalle: {
                    sueldoBaseChofer: sueldoChoferMensual,
                    sueldoBaseAyudante: sueldoAyudanteMensual || 0,
                    pagoChoferRuta: nominaChofer,
                    pagoAyudanteRuta: nominaAyudante
                },
                viaticos: viaticosTotal,
                viaticosDetalle: {
                    alimentacion: totalComida,
                    pernocta: totalHotel,
                    diasComidaFacturados: diasConComida,
                    nochesHotelFacturadas: nochesHotel
                },
                itinerario: itinerario, // <--- ESTO ES VITAL PARA PINTAR EL CRONOGRAMA
                posesion: costoPosesionTotal,
                posesionDetalle: {
                    valorActivo: valorReposicion,
                    vidaUtilAnios: vidaUtilAnios,
                    depreciacion: totalDepreciacion,
                    oportunidad: totalCapital
                },
                rutinaViaje: {
                    horasConduccion: horasTotales.toFixed(1),
                    horasConduccionPura: horasConduccionPura.toFixed(1), // <--- NUEVO
                    velocidadPromedioReal: velocidadPromedioReal.toFixed(1), // <--- NUEVO
                    jornadas: diaActual,
                    pernoctas: nochesHotel,
                    horasDescanso: nochesHotel * (24 - jornadaMax)
                },
                peajes: totalPeajes,
                mantenimiento: totalMantenimiento,
                itemsDetallados: listaCompletaRepuestos,
                pesoRemolque: pesoRemolque,
                auditoriaPesos: {
                    capacidad: { valor: capacidadMax, fuente: fuenteCapacidad },
                    chuto: { valor: pesoRealChuto, fuente: fuenteChuto, sobrepeso: sobrepesoChuto },
                    remolque: { valor: pesoRemolque, fuente: fuenteRemolque },
                    rendimiento: { lleno: consumoLleno, vacio: consumoVacio, fuente: fuenteRendimiento }
                }
            }
        });

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}