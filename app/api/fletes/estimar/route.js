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

            // 🔥 CORRECCIÓN: Pasa a Mantenimiento, ya no a Posesión
            costoMantenimiento += costoEnViaje;
            tipoEtiqueta = 'Fijo/Meses';
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
            calidadRepuestos = 50, porcentajeGanancia = 0.30, viaticosManuales = 0,

            // 🔥 NUEVAS VARIABLES INYECTADAS DESDE CONFIG. GLOBAL 🔥
            viaticoAlimentacionDia = 15,
            viaticoHotelNoche = 20,

            // Variables para Prorrateo Ponderado ABC Puro
            valorFlotaTotal = 1,
            gastosFijosAnualesTotales = 0,
            horasTotalesFlota = 1,
            costoAdministrativoPorHora = 0,

            sueldoDiarioChofer = 25,
            sueldoDiarioAyudante = 15,
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
            console.error("Falta información del vehículo principal o su matriz de costos");
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
        let horasEsperaTotales = 0;

        if (tipoCotizacion === 'flete' && body.tramos && body.tramos.length > 0) {
            let tiempoFinalSegundos = 0;
            body.tramos.forEach(tramo => {
                const tiempoBaseRealista = (tramo.tiempoBaseSegundos || 0) * 1.4;
                let segundosTramo = tiempoBaseRealista;

                // 🔥 Forzamos que sean números. Si vienen vacíos o undefined, asumen 0.
                const tonelajeSeguro = parseFloat(tramo.tonelaje) || 0;
                const pesoRemolqueSeguro = parseFloat(pesoRemolque) || 0;
                const sobrepesoChutoSeguro = parseFloat(sobrepesoChuto) || 0;

                const pesoBrutoTramo = tonelajeSeguro + pesoRemolqueSeguro + sobrepesoChutoSeguro;
                const factorCarga = Math.min(pesoBrutoTramo / capacidadMax, 1);

                const demoraHorizontal = 0.10 + (0.30 * factorCarga);
                segundosTramo += (tiempoBaseRealista * demoraHorizontal);

                if (tramo.desnivelMetros > 0) {
                    const penalidadMontaña = (tramo.desnivelMetros / 100) * (90 + (120 * factorCarga));
                    segundosTramo += penalidadMontaña;
                }

                const esperaTramoHoras = parseFloat(tramo.tiempoEspera || 0);
                horasEsperaTotales += esperaTramoHoras;
                segundosTramo += (esperaTramoHoras * 3600);

                tiempoFinalSegundos += segundosTramo;
            });
            horasTotales = tiempoFinalSegundos / 3600;
        } else {
            // Velocidad normal para cuando no hay mapa
            const velocidad = 50;
            const horasViaje = distanciaKm / velocidad;
            horasTotales = tipoCotizacion === 'servicio' ? (horasViaje + horasOperacion) : horasViaje;
        }

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
                const tonelajeTramo = parseFloat(tramo.tonelaje || 0);
                const pesoRemolqueNum = parseFloat(pesoRemolque || 0);
                const sobrepesoChutoNum = parseFloat(sobrepesoChuto || 0);

                const pesoBrutoTramo = tonelajeTramo + pesoRemolqueNum + sobrepesoChutoNum;

                const factorCarga = Math.min(pesoBrutoTramo / capacidadMax, 1);

                litrosBaseDistancia += tramo.distanciaKm * consumoVacio;
                litrosExtraPeso += tramo.distanciaKm * (factorCarga * (consumoLleno - consumoVacio));

                // Cálculo de Montaña
                const factorGasoilPorMetroTon = 0.68 / 1000;
                litrosExtraElevacion += pesoBrutoTramo * (parseFloat(tramo.desnivelMetros) || 0) * factorGasoilPorMetroTon;
            });
        } else {
            litrosBaseDistancia = (distanciaKm * consumoVacio) + (horasOperacion * 5.0);
        }

        const litrosConsumidos = litrosBaseDistancia + litrosExtraPeso + litrosExtraElevacion;
        const totalCombustible = litrosConsumidos * precioGasoilUsd;

        // ------------------------------------------------------------------
        // --- 6. CRONOGRAMA, VIÁTICOS Y NÓMINA (INTEGRACIÓN FINAL) ---
        // ------------------------------------------------------------------
        const jornadaMax = body.jornadaMaxima || 10;
        const horaSalidaSt = body.horaSalida || "06:00";
        const comidaPrimerDia = body.comidaPrimerDia || false;

        let tiempoRestante = horasTotales;
        let diaActual = 1; // Esta variable determinará los días de nómina al final
        let itinerario = [];
        let [horaReloj, minReloj] = horaSalidaSt.split(':').map(Number);

        let diasConComida = 0;
        let nochesHotel = 0;
        let horasDescansoAcumuladas = 0;

        const costoComidaDia = parseFloat(viaticoAlimentacionDia);
        const costoHotelNoche = parseFloat(viaticoHotelNoche);
        const factorPersonal = tieneAyudante ? 2 : 1;

        if (comidaPrimerDia) diasConComida++;

        // --- BUCLE DE CRONOGRAMA (Calcula itinerario y días reales de viaje) ---
        while (tiempoRestante > 0) {
            let horasTramoHoy = Math.min(tiempoRestante, jornadaMax);

            let horasRealesInt = Math.floor(horasTramoHoy);
            let minutosReales = Math.round((horasTramoHoy - horasRealesInt) * 60);

            let horaFin = horaReloj + horasRealesInt;
            let minFin = minReloj + minutosReales;
            if (minFin >= 60) { horaFin++; minFin -= 60; }
            if (horaFin >= 24) { horaFin -= 24; }

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

            if (tiempoRestante > 0) {
                nochesHotel++;
                diasConComida++;

                const horasDescanso = 24 - horasTramoHoy;
                horasDescansoAcumuladas += horasDescanso;

                itinerario.push({
                    dia: diaActual,
                    tipo: 'descanso',
                    accion: `Pernocta Obligatoria (${horasDescanso.toFixed(1)} Hrs de parada)`,
                    inicio: finStr,
                    fin: inicioStr,
                    detalleViatico: `+ Hotel ($${costoHotelNoche * factorPersonal})`
                });

                diaActual++; // Incrementamos el día para la siguiente jornada
                horaReloj = parseInt(horaSalidaSt.split(':')[0]);
                minReloj = parseInt(horaSalidaSt.split(':')[1]);
            }
        }

        // --- CÁLCULO DE VIÁTICOS TOTALES ---
        const totalComida = diasConComida * costoComidaDia * factorPersonal;
        const totalHotel = nochesHotel * costoHotelNoche * factorPersonal;
        const viaticosManual = parseFloat(viaticosManuales || 0);
        const viaticosTotal = totalComida + totalHotel + viaticosManual;

        // --- CÁLCULO DE NÓMINA DINÁMICA (NORMA: TASA FIJA POR DÍA) ---
        const diasTotalesNomina = diaActual; // Tomamos el valor final del bucle del cronograma

        // Multiplicamos los días reales de viaje por la tarifa dinámica que viene de la BD
        const nominaChofer = diasTotalesNomina * parseFloat(sueldoDiarioChofer);
        let nominaAyudante = tieneAyudante ? (diasTotalesNomina * parseFloat(sueldoDiarioAyudante)) : 0;

        const nominaTotal = nominaChofer + nominaAyudante;

        // --- TIEMPOS FINALES Y FECHAS (BLINDADO CONTRA TIMEZONES) ---
        const duracionTotalMision = (parseFloat(horasTotales) || 0) + (parseFloat(horasDescansoAcumuladas) || 0);

        // 1. Extraemos solo la fecha pura "YYYY-MM-DD" del frontend
        let dateSolo = new Date().toISOString().substring(0, 10);
        if (body.fechaSalida) {
            dateSolo = body.fechaSalida.substring(0, 10);
        }

        // 2. Parseo seguro de la hora ('06:00')
        const partesHora = horaSalidaSt.split(':');
        const horaSegura = String(parseInt(partesHora[0]) || 6).padStart(2, '0');
        const minSeguro = String(parseInt(partesHora[1]) || 0).padStart(2, '0');

        // 🔥 EL TRUCO MAESTRO: Ensamblamos la fecha forzando la zona horaria de Venezuela (-04:00)
        // Así evitamos que el servidor UTC nos atrase el reloj 4 horas de forma invisible.
        const fechaSalidaRealStr = `${dateSolo}T${horaSegura}:${minSeguro}:00.000-04:00`;
        const fechaSalidaObj = new Date(fechaSalidaRealStr);

        // 3. Sumamos los milisegundos de la duración total (misión + descansos)
        const fechaLlegadaObj = new Date(fechaSalidaObj.getTime() + (duracionTotalMision * 3600 * 1000));

        // ------------------------------------------------------------------
        // --- 7. DEPRECIACIÓN Y COSTO DE POSESIÓN ---
        // ------------------------------------------------------------------
        const valorReposicionChuto = chuto.valorReposicion || 40000;
        const valorSalvamentoChuto = chuto.valorSalvamento || 5000;
        const vidaUtilAniosChuto = chuto.vidaUtilAnios || 10;
        const horasVidaUtilChuto = vidaUtilAniosChuto * 2400;
        const depreciacionPorHoraChuto = (valorReposicionChuto - valorSalvamentoChuto) / horasVidaUtilChuto;

        let depreciacionPorHoraBatea = 0;
        let costoCapitalHoraBatea = 0;
        let valorReposicionBatea = 0;

        if (batea) {
            valorReposicionBatea = batea.valorReposicion || 15000;
            const valorSalvamentoBatea = batea.valorSalvamento || 2000;
            const vidaUtilAniosBatea = batea.vidaUtilAnios || 10;
            const horasVidaUtilBatea = vidaUtilAniosBatea * 2400;
            depreciacionPorHoraBatea = (valorReposicionBatea - valorSalvamentoBatea) / horasVidaUtilBatea;
            costoCapitalHoraBatea = (valorReposicionBatea * 0.05) / 2400;
        }

        const interesAnual = 0.05;
        const costoCapitalHoraChuto = (valorReposicionChuto * interesAnual) / 2400;

        const totalDepreciacion = (depreciacionPorHoraChuto + depreciacionPorHoraBatea) * horasTotales;
        const totalCapital = (costoCapitalHoraChuto + costoCapitalHoraBatea) * horasTotales;

        const costoPosesionTotal = totalDepreciacion + totalCapital + calculoChuto.posesion + calculoBatea.posesion;

        // ------------------------------------------------------------------
        // --- 8. CÁLCULO PONDERADO DE OVERHEAD (NUEVO ABC PURO) ---
        // ------------------------------------------------------------------

        // 1. Pesos de los activos (Qué porcentaje del valor de la empresa representan)
        const pesoChuto = valorFlotaTotal > 0 ? (valorReposicionChuto / valorFlotaTotal) : 0;
        const pesoBatea = (batea && valorFlotaTotal > 0) ? (valorReposicionBatea / valorFlotaTotal) : 0;

        // 2. Gasto anual real que debe absorber CADA activo (según su peso)
        const gastoAnualChutoAsignado = gastosFijosAnualesTotales * pesoChuto;
        const gastoAnualBateaAsignado = batea ? (gastosFijosAnualesTotales * pesoBatea) : 0;

        // 3. Costo Overhead por HORA (Dividido entre las horas REALES asignadas a ese equipo)
        // Extraemos las horas directas de la base de datos para ese equipo específico.
        // Protegemos con un "|| 1" para evitar división por cero si el equipo es nuevo o está ocioso.
        const horasRealChuto = (chuto && chuto.horasAnuales > 0) ? chuto.horasAnuales : 1;
        const horasRealBatea = (batea && batea.horasAnuales > 0) ? batea.horasAnuales : 1;

        const overheadHoraChuto = gastoAnualChutoAsignado / horasRealChuto;
        const overheadHoraBatea = batea ? (gastoAnualBateaAsignado / horasRealBatea) : 0;

        const costoEstructuraHoraPonderado = overheadHoraChuto + overheadHoraBatea;

        // 4. Overhead total de la misión
        const totalOverhead = costoEstructuraHoraPonderado * duracionTotalMision;

        const overheadDetalle = {
            totalViaje: totalOverhead,
            costoHoraCombinado: costoEstructuraHoraPonderado,
            horasAplicadas: duracionTotalMision,
            chuto: {
                valor: valorReposicionChuto,
                pesoPorcentaje: pesoChuto * 100,
                costoHora: overheadHoraChuto
            },
            batea: batea ? {
                valor: valorReposicionBatea,
                pesoPorcentaje: pesoBatea * 100,
                costoHora: overheadHoraBatea
            } : null,
            flotaGlobal: {
                valorTotal: valorFlotaTotal,
                horasSoporte: horasTotalesFlota // Refleja la suma de horas reales
            }
        };

        // ------------------------------------------------------------------
        // --- 9. CIERRE: RIESGO, TARIFAS FIJAS VS COSTO + MARKUP ---
        // ------------------------------------------------------------------
        const totalPeajes = cantidadPeajes * (precioPeajeBs / bcv);

        // 1. Costo Operativo Base (Subtotal antes del riesgo)
        const subtotalOperativo = totalCombustible + nominaTotal + viaticosTotal + totalPeajes + totalMantenimiento + costoPosesionTotal + totalOverhead;

        // 🔥 2. LÓGICA DE CARGA PELIGROSA Y RIESGO (ESCALABLE POR TONELAJE) 🔥
        let factorRiesgoBase = 0;
        let factorPorTonelada = 0;
        let tipoRiesgoDesc = 'Carga General';

        // Evaluamos las categorías y asignamos un riesgo base + un multiplicador por tonelada
        switch (body.tipoCarga) {
            case 'salmuera':
                factorRiesgoBase = 0.05;   // 5% fijo (Trámites/Guías base)
                factorPorTonelada = 0.005; // +0.5% extra por CADA tonelada
                tipoRiesgoDesc = 'Salmuera / Fluidos (Desgaste acelerado por corrosión extrema)';
                break;
            case 'hidrocarburos':
                factorRiesgoBase = 0.03;   // 3% fijo
                factorPorTonelada = 0.003; // +0.3% extra por CADA tonelada
                tipoRiesgoDesc = 'Hidrocarburos (Riesgo inflamable y permisos MENPET)';
                break;
            case 'quimicos':
                factorRiesgoBase = 0.10;   // 10% fijo 
                factorPorTonelada = 0.01;  // +1.0% extra por CADA tonelada
                tipoRiesgoDesc = 'Químicos Puros (Alta toxicidad, trajes especiales, RACDA)';
                break;
            case 'explosivos':
                factorRiesgoBase = 0.15;   // 15% fijo 
                factorPorTonelada = 0.015; // +1.5% extra por CADA tonelada
                tipoRiesgoDesc = 'Explosivos (Riesgo máximo, permisos DAEX y escoltas)';
                break;
            default:
                factorRiesgoBase = 0;
                factorPorTonelada = 0;
                tipoRiesgoDesc = 'Carga General / No Peligrosa';
                break;
        }

        // 1. Aseguramos el tonelaje promedio de la ruta (protegido contra NaN)
        const tonelajeReal = parseFloat(tonelaje) || 0;

        // 2. Calculamos el porcentaje dinámico total
        // Ejemplo Químicos con 30t: 10% base + (30t * 1%) = 40% de recargo real.
        // Ejemplo Químicos con 1t:  10% base + (1t * 1%) = 11% de recargo real.
        const porcentajeRiesgoAplicado = factorRiesgoBase + (tonelajeReal * factorPorTonelada);

        // 3. Calculamos el monto en dólares de la prima
        const recargoRiesgoTotal = subtotalOperativo * porcentajeRiesgoAplicado;

        // 4. Desglose interno (Con la fórmula matemática expuesta para el Frontend)
        const riesgoDetalle = recargoRiesgoTotal > 0 ? {
            bonoChofer: recargoRiesgoTotal * 0.40,
            seguroViaje: recargoRiesgoTotal * 0.30,
            contingenciaOperativa: recargoRiesgoTotal * 0.30,
            descripcion: tipoRiesgoDesc,
            porcentajeAplicado: parseFloat((porcentajeRiesgoAplicado * 100).toFixed(1)), // El Total

            // 🔥 NUEVAS VARIABLES PARA MOSTRAR LA FÓRMULA EN EL FRONTEND 🔥
            porcentajeBase: parseFloat((factorRiesgoBase * 100).toFixed(1)),
            porcentajeVariable: parseFloat(((tonelajeReal * factorPorTonelada) * 100).toFixed(1)),
            tonelajeAplicado: tonelajeReal
        } : null;

        // 3. Costo Operativo Real Completo (Subtotal + Riesgo)
        const costoTotal = subtotalOperativo + recargoRiesgoTotal;

        // 4. Calculamos la ganancia comercial pura (el % que pidió el usuario)
        const gananciaBase = costoTotal * porcentajeGanancia;
        let precioCalculado = costoTotal + gananciaBase;

        // 5. Lógica de Tarifas Mínimas y Ajuste

        let ajusteTarifaMinima = 0;
        let esTarifaMinima = false;
        let tarifaAplicada = "Margen sobre Costo";
        let precioSugerido = precioCalculado;

        // 🔥 LA CONDICIÓN MÁGICA: Solo aplicamos el mínimo si NO es un servicio ODT 🔥
        if (tipoCotizacion === 'flete') {
            if (distanciaKm > 0 && distanciaKm <= 50) {
                if (precioCalculado < 254) {
                    precioSugerido = 254;
                    ajusteTarifaMinima = 254 - precioCalculado;
                    esTarifaMinima = true;
                    tarifaAplicada = "Tarifa Plana (0-50km)";
                }
            } else if (distanciaKm > 50 && distanciaKm <= 100) {
                if (precioCalculado < 528) {
                    precioSugerido = 528;
                    ajusteTarifaMinima = 528 - precioCalculado;
                    esTarifaMinima = true;
                    tarifaAplicada = "Tarifa Plana (50-100km)";
                }
            }
        }

        // ------------------------------------------------------------------
        // --- 10. DESGLOSE EXCLUSIVO PARA ODT / SERVICIO (CORREGIDO) ---
        // ------------------------------------------------------------------
        let desgloseServicio = null;
        if (tipoCotizacion === 'servicio') {
            const horasViaje = distanciaKm > 0 ? (distanciaKm / 50) : 0; // 50km/h velocidad base

            // 🔥 AQUÍ ESTÁN LAS DOS LÍNEAS QUE BORRÉ SIN QUERER 🔥
            const proporcionViaje = horasTotales > 0 ? (horasViaje / horasTotales) : 0;
            const proporcionOps = horasTotales > 0 ? (horasOperacion / horasTotales) : 0;

            // FASE 1: Movilización (Tránsito)
            const mobCombustible = (distanciaKm * consumoVacio) * precioGasoilUsd;

            // 🔥 CORRECCIÓN MATEMÁTICA: Separamos los 3 tipos de desgaste 🔥
            const mobMantenimientoRodamiento = calculoChuto.items.filter(i => i.tipo === 'Rodamiento').reduce((a, b) => a + b.monto, 0) +
                (calculoBatea ? calculoBatea.items.filter(i => i.tipo === 'Rodamiento').reduce((a, b) => a + b.monto, 0) : 0);

            const totalMantenimientoHoras = calculoChuto.items.filter(i => i.tipo === 'Por Hora').reduce((a, b) => a + b.monto, 0) +
                (calculoBatea ? calculoBatea.items.filter(i => i.tipo === 'Por Hora').reduce((a, b) => a + b.monto, 0) : 0);

            // Rescatamos los que son por meses
            const totalMantenimientoMeses = calculoChuto.items.filter(i => i.tipo === 'Fijo/Meses').reduce((a, b) => a + b.monto, 0) +
                (calculoBatea ? calculoBatea.items.filter(i => i.tipo === 'Fijo/Meses').reduce((a, b) => a + b.monto, 0) : 0);

            // El rodamiento lo paga 100% el viaje. Las horas y meses se prorratean por el tiempo viajando.
            const mobMantenimiento = mobMantenimientoRodamiento + (totalMantenimientoHoras * proporcionViaje) + (totalMantenimientoMeses * proporcionViaje);

            const mobOverhead = costoEstructuraHoraPonderado * horasViaje;
            const mobPosesion = (depreciacionPorHoraChuto + depreciacionPorHoraBatea + costoCapitalHoraChuto + costoCapitalHoraBatea) * horasViaje;
            const mobNomina = (nominaTotal / (horasTotales || 1)) * horasViaje;

            const costoMovilizacion = mobCombustible + mobMantenimiento + totalPeajes + mobNomina + mobPosesion + mobOverhead;

            // FASE 2: Operación en Locación
            const opsCombustible = (horasOperacion * 5.0) * precioGasoilUsd;

            // 🔥 CORRECCIÓN: La locación asume su porción del desgaste de motor (horas) y el desgaste por tiempo (meses)
            const opsMantenimiento = (totalMantenimientoHoras * proporcionOps) + (totalMantenimientoMeses * proporcionOps);

            // 🔥 CORRECCIÓN: Aplicamos el overhead por las horas de operación real
            const opsOverhead = costoEstructuraHoraPonderado * horasOperacion;
            const opsPosesion = costoPosesionTotal - mobPosesion;
            const opsNomina = nominaTotal - mobNomina;

            const costoOperacion = opsCombustible + opsMantenimiento + opsNomina + opsPosesion + opsOverhead;

            desgloseServicio = {
                horasViajeAprox: horasViaje.toFixed(1),
                costoMovilizacionTotal: costoMovilizacion,
                costoOperacionTotal: costoOperacion,
                costoViaticosYRiesgo: viaticosTotal + recargoRiesgoTotal,
                mobDetalle: {
                    gasoil: mobCombustible,
                    mtto: mobMantenimiento,
                    peajes: totalPeajes,
                    overhead: mobOverhead,
                    posesion: mobPosesion // 🔥 AÑADE ESTO
                },
                opsDetalle: {
                    gasoil: opsCombustible,
                    mtto: opsMantenimiento,
                    overhead: opsOverhead,
                    posesion: opsPosesion // 🔥 AÑADE ESTO
                }
            };
        }

        return NextResponse.json({
            success: true,
            costoTotal,
            precioSugerido,
            gananciaBase,
            ajusteTarifaMinima,
            infoTarifa: {
                aplicada: tarifaAplicada,
                esMinima: esTarifaMinima
            },
            breakdown: {
                desgloseServicio: desgloseServicio, // <--- AGREGA ESTA LÍNEA AQUÍ
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
                overhead: totalOverhead,
                overheadDetalle: overheadDetalle,
                itinerario: itinerario,
                posesion: costoPosesionTotal,
                posesionDetalle: {
                    valorActivo: valorReposicionChuto + valorReposicionBatea,
                    vidaUtilAnios: vidaUtilAniosChuto,
                    depreciacion: totalDepreciacion,
                    oportunidad: totalCapital
                },

                // 🔥 AQUÍ EXPORTAMOS EL RIESGO AL FRONTEND 🔥
                riesgo: recargoRiesgoTotal,
                riesgoDetalle: riesgoDetalle,

                rutinaViaje: {
                    horasConduccion: horasConduccionPura.toFixed(1),
                    horasEsperaTotales: horasEsperaTotales.toFixed(1),
                    horasDescanso: horasDescansoAcumuladas.toFixed(1),
                    tiempoMisionTotal: duracionTotalMision.toFixed(1),
                    fechaSalidaISO: fechaSalidaObj.toISOString(),
                    fechaLlegadaISO: fechaLlegadaObj.toISOString(),
                    velocidadPromedioReal: velocidadPromedioReal.toFixed(1),
                    jornadas: diaActual,
                    pernoctas: nochesHotel
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
        console.error("Error en cálculo de flete:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}