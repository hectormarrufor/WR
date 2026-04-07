import { NextResponse } from 'next/server';
import db from '@/models';

// Función mágica que procesa una matriz dinámica en vivo
const calcularDesgasteDinamico = (matriz, distanciaKm, horasTotales, calidadPorcentaje, nombreActivo, horasAnuales) => {
    if (!matriz || !matriz.detalles) return { mtto: 0, posesion: 0, items: [] };

    let costoMantenimiento = 0;
    let costoPosesion = 0;
    let desgloseItems = [];
    const factor = calidadPorcentaje / 100;

    const horasUsoAnual = (horasAnuales && horasAnuales > 0) ? horasAnuales : 2400;

    matriz.detalles.forEach(detalle => {
        const costoAplicado = detalle.costoMinimo + ((detalle.costoMaximo - detalle.costoMinimo) * factor);
        const costoTotalItem = costoAplicado * detalle.cantidad;
        let costoEnViaje = 0;
        let tipoEtiqueta = '';

        if (detalle.tipoDesgaste === 'km') {
            const costoPorKm = costoTotalItem / (detalle.frecuencia || 1);
            costoEnViaje = costoPorKm * distanciaKm;
            costoMantenimiento += costoEnViaje;
            tipoEtiqueta = 'Rodamiento';
        } else if (detalle.tipoDesgaste === 'horas') {
            costoEnViaje = (costoTotalItem / (detalle.frecuencia || 1)) * horasTotales;
            costoMantenimiento += costoEnViaje;
            tipoEtiqueta = 'Por Hora';
        } else if (detalle.tipoDesgaste === 'meses') {
            const vidaUtilAnios = (detalle.frecuencia || 1) / 12;
            const costoAnual = costoTotalItem / vidaUtilAnios;
            const costoPorHoraFija = costoAnual / horasUsoAnual;
            costoEnViaje = costoPorHoraFija * horasTotales;
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
            tipoCotizacion, chutos = [], remolques = [], distanciaKm,
            horasOperacion = 0, tonelaje = 0, cantidadPeajes = 0,
            precioPeajeBs = 1900, bcv = 1, precioGasoilUsd = 0.5,
            sueldoChoferMensual = 0, sueldoAyudanteMensual = 0, tieneAyudante = false,
            calidadRepuestos = 50, porcentajeGanancia = 0.30, viaticosManuales = 0,
            viaticoAlimentacionDia = 15, viaticoHotelNoche = 20,
            valorFlotaActiva = 1, gastosFijosAnualesTotales = 0,
            horasTotalesFlota = 1, costoAdministrativoPorHora = 0,
            sueldoDiarioChofer = 25, sueldoDiarioAyudante = 15,
            jornadaMaxima = 12, horaSalida = "06:00", comidaPrimerDia = false, tipoCarga = 'general',
            tramoDescarga = 0 // Nueva variable inyectada desde el frontend
        } = body;

        // ------------------------------------------------------------------
        // --- 1. EXTRACCIÓN DE DATOS BASE (CONVOY MÚLTIPLE) ---
        // ------------------------------------------------------------------
        const chutosDb = await Promise.all(chutos.map(async (c) => {
            if (!c.activoId) return null;
            const dbChuto = await db.Activo.findByPk(c.activoId, {
                include: [
                    { model: db.MatrizCosto, as: 'matrizCosto', include: ['detalles'] },
                    { model: db.VehiculoInstancia, as: 'vehiculoInstancia', include: [{ model: db.Vehiculo, as: 'plantilla' }] }
                ]
            });
            return dbChuto ? { ...dbChuto.toJSON(), _formChoferId: c.choferId, _formAyudanteId: c.ayudanteId, _horasAnuales: dbChuto.horasAnuales, unidadId: c.unidadId } : null;
        }));

        const chutosValidos = chutosDb.filter(c => c && c.matrizCosto);

        if (chutosValidos.length === 0) {
            console.error("Falta información de los vehículos principales o sus matrices de costos");
            return NextResponse.json({ error: "Ningún vehículo principal válido con Matriz de Costos" }, { status: 400 });
        }

        const remolquesDb = await Promise.all(remolques.map(async (r) => {
            if (r.tipo === 'tercero') return { esTercero: true, peso: parseFloat(r.pesoTercero) || 0, retorna: r.retorna, unidadId: r.unidadId };
            if (!r.activoId) return null;
            const dbBatea = await db.Activo.findByPk(r.activoId, {
                include: [
                    { model: db.MatrizCosto, as: 'matrizCosto', include: ['detalles'] },
                    { model: db.RemolqueInstancia, as: 'remolqueInstancia', include: [{ model: db.Remolque, as: 'plantilla' }] }
                ]
            });
            return dbBatea ? { ...dbBatea.toJSON(), esTercero: false, retorna: r.retorna, _horasAnuales: dbBatea.horasAnuales, unidadId: r.unidadId } : null;
        }));

        const remolquesValidos = remolquesDb.filter(Boolean);

        // ------------------------------------------------------------------
        // --- 2. TELEMETRÍA Y PESOS (CONGREGACIÓN DE CONVOY) ---
        // ------------------------------------------------------------------
        let capacidadMax = 0, pesoRemolquesIda = 0, pesoRemolquesRetorno = 0;
        let sobrepesoChutosTotal = 0, consumoLlenoTotal = 0, consumoVacioTotal = 0, pesoRealChutosTotal = 0;

        chutosValidos.forEach(chuto => {
            const ficha = chuto.vehiculoInstancia?.plantilla;
            capacidadMax += parseFloat(chuto.capacidadTonelajeMax || ficha?.capacidadArrastre || ficha?.pesoMaximoCombinado) || 30;
            
            const pesoFabrica = parseFloat(ficha?.peso) || 0;
            const pesoReal = parseFloat(chuto.tara) || pesoFabrica || 0;
            pesoRealChutosTotal += pesoReal;
            if (pesoReal > pesoFabrica && pesoFabrica > 0) sobrepesoChutosTotal += (pesoReal - pesoFabrica);

            consumoLlenoTotal += parseFloat(chuto.consumoCombustibleLPorKm || ficha?.consumoTeoricoLleno) || 0.35;
            consumoVacioTotal += parseFloat(chuto.consumoBaseLPorKm || ficha?.consumoTeoricoVacio) || 0.25;
            console.log(`Chuto ${chuto.codigoInterno}: Capacidad=${parseFloat(chuto.capacidadTonelajeMax || ficha?.capacidadArrastre || ficha?.pesoMaximoCombinado || 30)}T, PesoReal=${pesoReal}T, Sobrepeso=${pesoReal - pesoFabrica}T, ConsumoVacio=${parseFloat(chuto.consumoBaseLPorKm || ficha?.consumoTeoricoVacio || 0.25)}L/km, ConsumoLleno=${parseFloat(chuto.consumoCombustibleLPorKm || ficha?.consumoTeoricoLleno || 0.35)}L/km`);
        });

        remolquesValidos.forEach(r => {
            let pesoR = parseFloat(r.esTercero ? r.peso : (r.tara || r.remolqueInstancia?.plantilla?.peso || 6));
            pesoRemolquesIda += pesoR;
            if (r.retorna) pesoRemolquesRetorno += pesoR;
        });

        const fuenteCapacidad = chutosValidos[0].capacidadTonelajeMax ? 'Real (Perfil)' : 'Teórico';
        const fuenteChuto = chutosValidos[0].tara ? 'Real (Balanza)' : 'Teórico/Defecto';
        const fuenteRendimiento = chutosValidos[0].consumoCombustibleLPorKm ? 'Real (Flota)' : 'Teórico/Defecto';

        // ------------------------------------------------------------------
        // --- 3. CÁLCULO FÍSICO DE TIEMPO ---
        // ------------------------------------------------------------------
        let horasTotales = 0;
        let horasEsperaTotales = 0;

        if (tipoCotizacion === 'flete' && body.tramos && body.tramos.length > 0) {
            let tiempoFinalSegundos = 0;
            body.tramos.forEach((tramo, index) => {
                const tiempoBaseRealista = (parseFloat(tramo.tiempoBaseSegundos) || 0) * 1.4;
                let segundosTramo = tiempoBaseRealista;

                // REGLA DE NEGOCIO: Basado en el tramo de descarga elegido
                const esRetorno = index > tramoDescarga;
                const tonelajeSeguro = esRetorno ? 0 : (parseFloat(tramo.tonelaje) || 0);
                const pesoRemolqueAplicable = esRetorno ? pesoRemolquesRetorno : pesoRemolquesIda;
                
                const pesoBrutoTramo = tonelajeSeguro + pesoRemolqueAplicable + sobrepesoChutosTotal;
                const factorCarga = Math.min(pesoBrutoTramo / capacidadMax, 1);

                const demoraHorizontal = 0.10 + (0.30 * factorCarga);
                segundosTramo += (tiempoBaseRealista * demoraHorizontal);

                if (parseFloat(tramo.desnivelMetros) > 0) {
                    const penalidadMontaña = (parseFloat(tramo.desnivelMetros) / 100) * (90 + (120 * factorCarga));
                    segundosTramo += penalidadMontaña;
                }

                const esperaTramoHoras = parseFloat(tramo.tiempoEspera || 0);
                horasEsperaTotales += esperaTramoHoras;
                segundosTramo += (esperaTramoHoras * 3600);

                tiempoFinalSegundos += segundosTramo;
            });
            horasTotales = tiempoFinalSegundos / 3600;
        } else {
            const velocidad = 50;
            const horasViaje = distanciaKm / velocidad;
            horasTotales = tipoCotizacion === 'servicio' ? (horasViaje + horasOperacion) : horasViaje;
        }

        const horasConduccionPura = horasTotales - horasEsperaTotales;
        const velocidadPromedioReal = horasConduccionPura > 0 ? (distanciaKm / horasConduccionPura) : 0;

        // ------------------------------------------------------------------
        // --- 4. MANTENIMIENTO DINÁMICO MULTIPLE ---
        // ------------------------------------------------------------------
        let totalMantenimiento = 0;
        let listaCompletaRepuestos = [];

        chutosValidos.forEach((chuto, idx) => {
            const calc = calcularDesgasteDinamico(chuto.matrizCosto, distanciaKm, horasTotales, calidadRepuestos, `Chuto ${idx+1}`, chuto._horasAnuales);
            totalMantenimiento += calc.mtto;
            listaCompletaRepuestos.push(...calc.items);
        });

        remolquesValidos.forEach((r, idx) => {
            if (!r.esTercero && r.matrizCosto) {
                const calc = calcularDesgasteDinamico(r.matrizCosto, distanciaKm, horasTotales, calidadRepuestos, `Batea ${idx+1}`, r._horasAnuales);
                totalMantenimiento += calc.mtto;
                listaCompletaRepuestos.push(...calc.items);
            }
        });
        listaCompletaRepuestos.sort((a, b) => b.monto - a.monto);

        // ------------------------------------------------------------------
        // --- 5. COMBUSTIBLE Y DESGLOSE (CÁLCULO UNIFICADO EXACTO) ---
        // ------------------------------------------------------------------
        const desgloseGasoil = chutosValidos.map((chuto) => {
            const ficha = chuto.vehiculoInstancia?.plantilla;
            const consumoVacio = parseFloat(chuto.consumoBaseLPorKm || ficha?.consumoTeoricoVacio) || 0.25;
            const consumoLleno = parseFloat(chuto.consumoCombustibleLPorKm || ficha?.consumoTeoricoLleno) || 0.35;
            const capacidadMaxChuto = parseFloat(chuto.capacidadTonelajeMax || ficha?.capacidadArrastre || ficha?.pesoMaximoCombinado) || 30;

            let extraPesoLts = 0;
            let extraElevacionLts = 0;
            let baseRodamientoLts = 0;

            if (tipoCotizacion === 'flete' && body.tramos && body.tramos.length > 0) {
                body.tramos.forEach((tramo, idx) => {
                    const dist = parseFloat(tramo.distanciaKm) || 0;
                    const desnivel = parseFloat(tramo.desnivelMetros) || 0;
                    
                    // REGLA DE NEGOCIO: Basado en el tramo de descarga elegido
                    const esRetorno = idx > tramoDescarga;

                    let cargaTramo = parseFloat(tramo.pesosCarga?.[chuto.unidadId]) || 0;
                    if (cargaTramo === 0 && parseFloat(tramo.tonelaje) > 0) {
                        cargaTramo = parseFloat(tramo.tonelaje) / chutosValidos.length;
                    }
                    if (esRetorno) cargaTramo = 0;

                    const remolqueAsignado = remolquesValidos.find(r => r.unidadId === chuto.unidadId);
                    let taraRemolque = 0;
                    if (remolqueAsignado) {
                        taraRemolque = remolqueAsignado.esTercero ? parseFloat(remolqueAsignado.peso) : parseFloat(remolqueAsignado.tara || remolqueAsignado.remolqueInstancia?.plantilla?.peso || 6);
                    }

                    const taraRemolqueAplicada = (esRetorno && remolqueAsignado && !remolqueAsignado.retorna) ? 0 : taraRemolque;

                    const pesoArrastreTotal = cargaTramo + taraRemolqueAplicada;
                    const factorCarga = Math.min(pesoArrastreTotal / capacidadMaxChuto, 1);
                    
                    const baseTramo = dist * consumoVacio;
                    baseRodamientoLts += baseTramo;
                    extraPesoLts += dist * (factorCarga * (consumoLleno - consumoVacio));
                    
                    const pesoArrastreToneladas = pesoArrastreTotal;
                    const factorGasoilPorMetroTon = 0.68 / 1000;
                    
                    extraElevacionLts += pesoArrastreToneladas * desnivel * factorGasoilPorMetroTon;
                });
            } else {
                baseRodamientoLts = (parseFloat(body.distanciaKm) || 0) * consumoVacio + (parseFloat(body.horasOperacion) || 0) * 5.0;
            }

            const totalLts = baseRodamientoLts + extraPesoLts + extraElevacionLts;

            return {
                nombre: `${chuto.codigoInterno} (${chuto.vehiculoInstancia?.placa || ''})`,
                ltsBase: baseRodamientoLts,
                ltsPeso: extraPesoLts,
                ltsElevacion: extraElevacionLts,
                ltsTotal: totalLts,
                costoUsd: totalLts * precioGasoilUsd
            };
        });

        // Agregamos desde el desglose para garantizar congruencia matemática absoluta y cero desfases
        let litrosBaseDistancia = 0;
        let litrosExtraPeso = 0;
        let litrosExtraElevacion = 0;

        desgloseGasoil.forEach(d => {
            litrosBaseDistancia += d.ltsBase;
            litrosExtraPeso += d.ltsPeso;
            litrosExtraElevacion += d.ltsElevacion;
        });

        const litrosConsumidos = litrosBaseDistancia + litrosExtraPeso + litrosExtraElevacion;
        const totalCombustible = litrosConsumidos * precioGasoilUsd;

        // ------------------------------------------------------------------
        // --- 6. CRONOGRAMA, VIÁTICOS Y NÓMINA (INTEGRACIÓN FINAL) ---
        // ------------------------------------------------------------------
        let tiempoRestante = horasTotales;
        let diaActual = 1; 
        let itinerario = [];
        let [horaReloj, minReloj] = horaSalida.split(':').map(Number);

        let diasConComida = 0;
        let nochesHotel = 0;
        let horasDescansoAcumuladas = 0;

        const costoComidaDia = parseFloat(viaticoAlimentacionDia);
        const costoHotelNoche = parseFloat(viaticoHotelNoche);
        
        const cantChoferes = chutosValidos.length;
        const cantAyudantes = chutosValidos.filter(c => c._formAyudanteId).length;
        const factorPersonal = cantChoferes + cantAyudantes;

        if (comidaPrimerDia) diasConComida++;

        while (tiempoRestante > 0) {
            let horasTramoHoy = Math.min(tiempoRestante, jornadaMaxima);

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

                diaActual++; 
                horaReloj = parseInt(horaSalida.split(':')[0]);
                minReloj = parseInt(horaSalida.split(':')[1]);
            }
        }

        const totalComida = diasConComida * costoComidaDia * factorPersonal;
        const totalHotel = nochesHotel * costoHotelNoche * factorPersonal;
        const viaticosManual = parseFloat(viaticosManuales || 0);
        const viaticosTotal = totalComida + totalHotel + viaticosManual;

        const diasTotalesNomina = diaActual; 

        const nominaChofer = diasTotalesNomina * parseFloat(sueldoDiarioChofer) * cantChoferes;
        const nominaAyudante = diasTotalesNomina * parseFloat(sueldoDiarioAyudante) * cantAyudantes;

        const nominaTotal = nominaChofer + nominaAyudante;

        const duracionTotalMision = (parseFloat(horasTotales) || 0) + (parseFloat(horasDescansoAcumuladas) || 0);

        let dateSolo = new Date().toISOString().substring(0, 10);
        if (body.fechaSalida) {
            dateSolo = body.fechaSalida.substring(0, 10);
        }

        const partesHora = horaSalida.split(':');
        const horaSegura = String(parseInt(partesHora[0]) || 6).padStart(2, '0');
        const minSeguro = String(parseInt(partesHora[1]) || 0).padStart(2, '0');

        const fechaSalidaRealStr = `${dateSolo}T${horaSegura}:${minSeguro}:00.000-04:00`;
        const fechaSalidaObj = new Date(fechaSalidaRealStr);

        const fechaLlegadaObj = new Date(fechaSalidaObj.getTime() + (duracionTotalMision * 3600 * 1000));

        // ------------------------------------------------------------------
        // --- 7. DEPRECIACIÓN Y COSTO DE POSESIÓN MULTIPLE ---
        // ------------------------------------------------------------------
        let costoPosesionTotalViaje = 0;
        let valorReposicionTotalChutos = 0;
        let valorReposicionTotalBateas = 0;
        
        chutosValidos.forEach(chuto => {
            const tarifaPos = parseFloat(chuto.costoPosesionHora) || 15.0;
            costoPosesionTotalViaje += (tarifaPos * horasTotales);
            valorReposicionTotalChutos += parseFloat(chuto.valorReposicion) || 40000;
        });

        remolquesValidos.forEach(r => {
            if (!r.esTercero) {
                const tarifaPos = parseFloat(r.costoPosesionHora) || 5.0;
                costoPosesionTotalViaje += (tarifaPos * horasTotales);
                valorReposicionTotalBateas += parseFloat(r.valorReposicion) || 15000;
            }
        });

        const totalDepreciacion = costoPosesionTotalViaje * 0.70;
        const totalCapital = costoPosesionTotalViaje * 0.30;
        const costoPosesionTotal = costoPosesionTotalViaje;

        // ------------------------------------------------------------------
        // --- 8. CÁLCULO PONDERADO DE OVERHEAD MULTIPLE ---
        // ------------------------------------------------------------------
        let totalOverhead = 0;
        let costoEstructuraHoraPonderado = 0;

        chutosValidos.forEach(chuto => {
            const peso = valorFlotaActiva > 0 ? ((parseFloat(chuto.valorReposicion) || 40000) / valorFlotaActiva) : 0;
            const overheadHora = (gastosFijosAnualesTotales * peso) / (parseFloat(chuto._horasAnuales) || 1);
            costoEstructuraHoraPonderado += overheadHora;
        });

        remolquesValidos.forEach(r => {
            if (!r.esTercero) {
                const peso = valorFlotaActiva > 0 ? ((parseFloat(r.valorReposicion) || 15000) / valorFlotaActiva) : 0;
                const overheadHora = (gastosFijosAnualesTotales * peso) / (parseFloat(r._horasAnuales) || 1);
                costoEstructuraHoraPonderado += overheadHora;
            }
        });

        totalOverhead = costoEstructuraHoraPonderado * duracionTotalMision;

        const overheadDetalle = {
            totalViaje: totalOverhead,
            costoHoraCombinado: costoEstructuraHoraPonderado,
            horasAplicadas: duracionTotalMision,
            chuto: {
                valor: valorReposicionTotalChutos,
                pesoPorcentaje: valorFlotaActiva > 0 ? (valorReposicionTotalChutos / valorFlotaActiva) * 100 : 0,
            },
            batea: remolquesValidos.length > 0 ? {
                valor: valorReposicionTotalBateas,
                pesoPorcentaje: valorFlotaActiva > 0 ? (valorReposicionTotalBateas / valorFlotaActiva) * 100 : 0,
            } : null,
            flotaGlobal: {
                valorTotalAplicado: valorFlotaActiva, 
                horasSoporte: horasTotalesFlota
            }
        };

        // ------------------------------------------------------------------
        // --- 9. CIERRE: RIESGO, COSTO + MARKUP ---
        // ------------------------------------------------------------------
        const totalPeajes = cantidadPeajes * (precioPeajeBs / bcv);

        const subtotalOperativo = totalCombustible + nominaTotal + viaticosTotal + totalPeajes + totalMantenimiento + costoPosesionTotal + totalOverhead;

        let factorRiesgoBase = 0;
        let factorPorTonelada = 0;
        let tipoRiesgoDesc = 'Carga General';

        switch (tipoCarga) {
            case 'salmuera':
                factorRiesgoBase = 0.05;   
                factorPorTonelada = 0.005; 
                tipoRiesgoDesc = 'Salmuera / Fluidos (Desgaste acelerado por corrosión extrema)';
                break;
            case 'hidrocarburos':
                factorRiesgoBase = 0.03;   
                factorPorTonelada = 0.003; 
                tipoRiesgoDesc = 'Hidrocarburos (Riesgo inflamable y permisos MENPET)';
                break;
            case 'quimicos':
                factorRiesgoBase = 0.10;   
                factorPorTonelada = 0.01;  
                tipoRiesgoDesc = 'Químicos Puros (Alta toxicidad, trajes especiales, RACDA)';
                break;
            case 'explosivos':
                factorRiesgoBase = 0.15;   
                factorPorTonelada = 0.015; 
                tipoRiesgoDesc = 'Explosivos (Riesgo máximo, permisos DAEX y escoltas)';
                break;
            default:
                factorRiesgoBase = 0;
                factorPorTonelada = 0;
                tipoRiesgoDesc = 'Carga General / No Peligrosa';
                break;
        }

        const tonelajeReal = parseFloat(tonelaje) || 0;
        const porcentajeRiesgoAplicado = factorRiesgoBase + (tonelajeReal * factorPorTonelada);
        const recargoRiesgoTotal = subtotalOperativo * porcentajeRiesgoAplicado;

        const riesgoDetalle = recargoRiesgoTotal > 0 ? {
            bonoChofer: recargoRiesgoTotal * 0.40,
            seguroViaje: recargoRiesgoTotal * 0.30,
            contingenciaOperativa: recargoRiesgoTotal * 0.30,
            descripcion: tipoRiesgoDesc,
            porcentajeAplicado: parseFloat((porcentajeRiesgoAplicado * 100).toFixed(1)), 
            porcentajeBase: parseFloat((factorRiesgoBase * 100).toFixed(1)),
            porcentajeVariable: parseFloat(((tonelajeReal * factorPorTonelada) * 100).toFixed(1)),
            tonelajeAplicado: tonelajeReal
        } : null;

        const costoTotal = subtotalOperativo + recargoRiesgoTotal;
        const gananciaBase = costoTotal * porcentajeGanancia;
        const precioSugerido = costoTotal + gananciaBase;

        // ------------------------------------------------------------------
        // --- 10. DESGLOSE EXCLUSIVO PARA ODT / SERVICIO ---
        // ------------------------------------------------------------------
        let desgloseServicio = null;
        if (tipoCotizacion === 'servicio') {
            const horasViaje = distanciaKm > 0 ? (distanciaKm / 50) : 0; 

            const proporcionViaje = horasTotales > 0 ? (horasViaje / horasTotales) : 0;
            const proporcionOps = horasTotales > 0 ? (horasOperacion / horasTotales) : 0;

            const mobCombustible = (distanciaKm * consumoVacioTotal) * precioGasoilUsd;

            const mobMantenimientoRodamiento = listaCompletaRepuestos.filter(i => i.tipo === 'Rodamiento').reduce((a, b) => a + b.monto, 0);
            const totalMantenimientoHoras = listaCompletaRepuestos.filter(i => i.tipo === 'Por Hora').reduce((a, b) => a + b.monto, 0);
            const totalMantenimientoMeses = listaCompletaRepuestos.filter(i => i.tipo === 'Fijo/Meses').reduce((a, b) => a + b.monto, 0);

            const mobMantenimiento = mobMantenimientoRodamiento + (totalMantenimientoHoras * proporcionViaje) + (totalMantenimientoMeses * proporcionViaje);

            const mobOverhead = costoEstructuraHoraPonderado * horasViaje;
            const mobPosesion = (costoPosesionTotal / horasTotales) * horasViaje; 
            const mobNomina = (nominaTotal / (horasTotales || 1)) * horasViaje;

            const costoMovilizacion = mobCombustible + mobMantenimiento + totalPeajes + mobNomina + mobPosesion + mobOverhead;

            const opsCombustible = (horasOperacion * 5.0 * chutosValidos.length) * precioGasoilUsd;

            const opsMantenimiento = (totalMantenimientoHoras * proporcionOps) + (totalMantenimientoMeses * proporcionOps);
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
                    posesion: mobPosesion 
                },
                opsDetalle: {
                    gasoil: opsCombustible,
                    mtto: opsMantenimiento,
                    overhead: opsOverhead,
                    posesion: opsPosesion 
                }
            };
        }

        return NextResponse.json({
            success: true,
            costoTotal,
            precioSugerido,
            gananciaBase,
            breakdown: {
                desgloseServicio: desgloseServicio, 
                litros: parseFloat(litrosConsumidos.toFixed(2)),
                desgloseGasoil: desgloseGasoil,
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
                    valorActivo: valorReposicionTotalChutos + valorReposicionTotalBateas,
                    vidaUtilAnios: chutosValidos.length > 0 ? chutosValidos[0].vidaUtilAnios : 10,
                    depreciacion: totalDepreciacion,
                    oportunidad: totalCapital
                },
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
                pesoRemolque: pesoRemolquesIda,
                auditoriaPesos: {
                    capacidad: { valor: capacidadMax, fuente: fuenteCapacidad },
                    chuto: { valor: pesoRealChutosTotal, fuente: fuenteChuto, sobrepeso: sobrepesoChutosTotal },
                    remolque: { valor: pesoRemolquesIda, fuente: fuenteCapacidad },
                    rendimiento: { lleno: consumoLlenoTotal, vacio: consumoVacioTotal, fuente: fuenteRendimiento }
                }
            }
        });

    } catch (error) {
        console.error("Error en cálculo de flete:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}