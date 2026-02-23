import { NextResponse } from 'next/server';
import db from '@/models';

// Función mágica que procesa una matriz dinámica en vivo
// Función mágica que procesa una matriz dinámica en vivo
const calcularDesgasteDinamico = (matriz, distanciaKm, horasTotales, calidadPorcentaje, nombreActivo) => {
    if (!matriz || !matriz.detalles) return { mtto: 0, posesion: 0, items: [] }; // <--- Agregamos items: []

    let costoMantenimiento = 0;
    let costoPosesion = 0;
    let desgloseItems = [];     // <--- NUEVO: El carrito donde guardamos el detalle

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
        }
        else if (detalle.tipoDesgaste === 'horas') {
            const costoPorHora = costoTotalItem / detalle.frecuencia;
            costoEnViaje = costoPorHora * horasTotales;
            costoMantenimiento += costoEnViaje;
            tipoEtiqueta = 'Por Hora';
        }
        else if (detalle.tipoDesgaste === 'meses') {
            const costoPorMes = costoTotalItem / detalle.frecuencia;
            const costoPorHoraFija = costoPorMes / 730;
            costoEnViaje = costoPorHoraFija * horasTotales;
            costoPosesion += costoEnViaje;
            tipoEtiqueta = 'Fijo/Tiempo';
        }

        // NUEVO: Guardamos el item para la factura del frontend
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
            calidadRepuestos = 50, porcentajeGanancia = 0.30
        } = body;

        const chuto = await db.Activo.findByPk(activoPrincipalId, {
            include: [
                { model: db.MatrizCosto, as: 'matrizCosto', include: ['detalles'] },
                {
                    model: db.VehiculoInstancia,
                    as: 'vehiculoInstancia',
                    include: [{ model: db.Vehiculo, as: 'plantilla' }]
                }
            ]
        });

        const batea = remolqueId ? await db.Activo.findByPk(remolqueId, {
            include: [
                { model: db.MatrizCosto, as: 'matrizCosto', include: ['detalles'] },
                {
                    model: db.RemolqueInstancia,
                    as: 'remolqueInstancia',
                    include: [{ model: db.Remolque, as: 'plantilla' }] // <--- CLAVE PARA OBTENER EL PESO
                }
            ]
        }) : null;

        if (!chuto || !chuto.matrizCosto) {
            return NextResponse.json({ error: "Vehículo principal no tiene Matriz de Costos asociada" }, { status: 400 });
        }

        // 2. TIEMPOS
        const velocidad = chuto.velocidadPromedioTeorica || 50;
        const horasViaje = distanciaKm / velocidad;
        const horasTotales = tipoCotizacion === 'servicio' ? (horasViaje + horasOperacion) : horasViaje;

        // 3. MANTENIMIENTO DINÁMICO
        // Agregamos 'Chuto' y 'Batea' para que la lista diga de quién es el caucho
        const calculoChuto = calcularDesgasteDinamico(chuto.matrizCosto, distanciaKm, horasTotales, calidadRepuestos, 'Chuto');
        const calculoBatea = batea ? calcularDesgasteDinamico(batea.matrizCosto, distanciaKm, horasTotales, calidadRepuestos, 'Batea') : { mtto: 0, posesion: 0, items: [] };

        const totalMantenimiento = calculoChuto.mtto + calculoBatea.mtto;

        // ¡OJO AQUÍ! CORRECCIÓN DE LA POSESIÓN (Lo que vimos hace un rato)
        // Ya no sumamos la posesion de la matriz. Sumamos los seguros/trámites (calculoChuto.posesion) 
        // MÁS la depreciación específica de ESE camión (chuto.costoPosesionHora)
        let totalPosesion = calculoChuto.posesion + calculoBatea.posesion;
        totalPosesion += (chuto.costoPosesionHora || 0) * horasTotales;
        if (batea) totalPosesion += (batea.costoPosesionHora || 0) * horasTotales;

        // NUEVO: Unimos la lista del chuto y la batea, y las ordenamos de la más cara a la más barata
        const listaCompletaRepuestos = [...calculoChuto.items, ...calculoBatea.items].sort((a, b) => b.monto - a.monto);

       // 4. COMBUSTIBLE: Interpolación Lineal con Rastreo de Fuentes (Auditoría), LTL y Topografía
        let totalCombustible = 0;
        const fichaTecnicaChuto = chuto.vehiculoInstancia?.plantilla;
        const fichaTecnicaBatea = batea?.remolqueInstancia?.plantilla;

        // --- INICIO DE RASTREO DE FUENTES (TELEMETRÍA) ---

        // A. RASTREO DE CAPACIDAD DE ARRASTRE
        let capacidadMax = 30;
        let fuenteCapacidad = 'Por Defecto (30t)';
        if (chuto.capacidadTonelajeMax) {
            capacidadMax = chuto.capacidadTonelajeMax;
            fuenteCapacidad = 'Real (Perfil del Activo)';
        } else if (fichaTecnicaChuto?.capacidadArrastre || fichaTecnicaChuto?.pesoMaximoCombinado) {
            capacidadMax = fichaTecnicaChuto.capacidadArrastre || fichaTecnicaChuto.pesoMaximoCombinado;
            fuenteCapacidad = 'Teórico (Manual/Plantilla)';
        }

        // B. RASTREO DE TARA DEL REMOLQUE
        let pesoRemolque = 0;
        let fuenteRemolque = 'Sin Remolque';
        if (batea) {
            if (batea.tara) {
                pesoRemolque = batea.tara;
                fuenteRemolque = 'Real (Balanza/Activo)';
            } else if (fichaTecnicaBatea?.peso) {
                pesoRemolque = fichaTecnicaBatea.peso;
                fuenteRemolque = 'Teórico (Manual/Plantilla)';
            } else {
                pesoRemolque = 6; // Valor por defecto si no hay datos
                fuenteRemolque = 'Por Defecto (6t - Faltan Datos)';
            }
        }

        // C. RASTREO DE TARA DEL CHUTO Y SOBREPESO
        const pesoFabricaChuto = fichaTecnicaChuto?.peso || 0;
        let pesoRealChuto = 0;
        let fuenteChuto = 'Por Defecto (0t)';
        
        if (chuto.tara) {
            pesoRealChuto = chuto.tara;
            fuenteChuto = 'Real (Balanza/Activo)';
        } else if (pesoFabricaChuto > 0) {
            pesoRealChuto = pesoFabricaChuto;
            fuenteChuto = 'Teórico (Manual/Plantilla)';
        }
        
        // Si el chuto físico pesa más que el de fábrica, es esfuerzo extra
        const sobrepesoChuto = (pesoRealChuto > pesoFabricaChuto && pesoFabricaChuto > 0) 
            ? (pesoRealChuto - pesoFabricaChuto) 
            : 0;

        // D. RASTREO DE RENDIMIENTO (L/Km)
        let consumoLleno = 0.35;
        let consumoVacio = 0.25;
        let fuenteRendimiento = 'Por Defecto (0.35 / 0.25)';
        
        if (chuto.consumoCombustibleLPorKm && chuto.consumoBaseLPorKm) {
            consumoLleno = chuto.consumoCombustibleLPorKm;
            consumoVacio = chuto.consumoBaseLPorKm;
            fuenteRendimiento = 'Real (Medido en Flota)';
        } else if (fichaTecnicaChuto?.consumoTeoricoLleno && fichaTecnicaChuto?.consumoTeoricoVacio) {
            consumoLleno = fichaTecnicaChuto.consumoTeoricoLleno;
            consumoVacio = fichaTecnicaChuto.consumoTeoricoVacio;
            fuenteRendimiento = 'Teórico (Manual/Plantilla)';
        }

        // --- FIN DE RASTREO DE FUENTES ---


        // --- INICIO DE CÁLCULO FÍSICO (TRAMOS Y TOPOGRAFÍA) ---
        let litrosConsumidos = 0;
        let penalidadTopograficaTotal = 0;

        if (tipoCotizacion === 'flete') {
            const tramos = body.tramos || [];
            
            // Fallback: Si no hay tramos detallados (por alguna razón el front falló), usamos el cálculo clásico
            if (tramos.length === 0) {
                const pesoIda = tonelaje + pesoRemolque + sobrepesoChuto;
                const pesoVuelta = pesoRemolque + sobrepesoChuto;

                const factorIda = Math.min(pesoIda / capacidadMax, 1);
                const factorVuelta = Math.min(pesoVuelta / capacidadMax, 1);
                
                const consumoIda = consumoVacio + (factorIda * (consumoLleno - consumoVacio));
                const consumoVuelta = consumoVacio + (factorVuelta * (consumoLleno - consumoVacio));
                
                litrosConsumidos = ((distanciaKm / 2) * consumoIda) + ((distanciaKm / 2) * consumoVuelta);
            } else {
                 // Cálculo moderno: Iteramos por cada segmento real trazado en el mapa
                 tramos.forEach(tramo => {
                     // 1. Calculamos el Peso Bruto Combinado de este tramo específico
                     const pesoBrutoTramo = tramo.tonelaje + pesoRemolque + sobrepesoChuto;
                     
                     // 2. Factor de Carga y Consumo Lineal (Horizontal)
                     const factorCarga = Math.min(pesoBrutoTramo / capacidadMax, 1);
                     const consumoHorizontalTramo = consumoVacio + (factorCarga * (consumoLleno - consumoVacio));
                     
                     const litrosPlanoTramo = tramo.distanciaKm * consumoHorizontalTramo;

                     // 3. LA MAGIA: Penalidad por Topografía (Desnivel)
                     // ~0.68 litros extra por cada 1000m subidos, por cada Tonelada de peso bruto.
                     const factorGasoilPorMetroTon = 0.68 / 1000; 
                     const litrosSubidaTramo = pesoBrutoTramo * (tramo.desnivelMetros || 0) * factorGasoilPorMetroTon;

                     // Acumulamos
                     litrosConsumidos += (litrosPlanoTramo + litrosSubidaTramo);
                     penalidadTopograficaTotal += litrosSubidaTramo;
                 });
            }
        } else {
            // Cotización por horas/servicio
            litrosConsumidos = (distanciaKm * consumoVacio) + (horasOperacion * 5.0);
        }

        totalCombustible = litrosConsumidos * precioGasoilUsd;

        // --- FIN DE CÁLCULO FÍSICO ---

        // 5. NÓMINA Y PEAJES (Quedan intactos)
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
                operativos: parseFloat(totalOperativos.toFixed(2)),
                pesoRemolque: parseFloat(pesoRemolque.toFixed(2)),
                auditoriaPesos: {
                    capacidad: { valor: capacidadMax, fuente: fuenteCapacidad },
                    chuto: { valor: pesoRealChuto, fuente: fuenteChuto, sobrepeso: sobrepesoChuto },
                    remolque: { valor: pesoRemolque, fuente: fuenteRemolque },
                    rendimiento: { lleno: consumoLleno, vacio: consumoVacio, fuente: fuenteRendimiento }
                },
                itemsDetallados: listaCompletaRepuestos
            }
        });

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}