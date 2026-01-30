// app/api/cron-jobs/services.js
import { Op } from 'sequelize';
import axios from 'axios';
import https from 'https';
import * as cheerio from 'cheerio';
import sequelize from '@/sequelize';
import {
    Empleado, DocumentoEmpleado, ConsumibleSerializado,
    Activo, DocumentoActivo, BcvPrecioHistorico
} from '@/models'; // Ajusta tus imports
import { getCaracasDate, addDays, isSameMonthDay, getYearsDiff } from "../../../helpers/dateUtils"; // El archivo del paso 1
import { notificarCabezas, notificarUsuario } from '../../notificar/route';

// Configuración para Binance
const URL_BINANCE = 'https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search';
const BINANCE_HEADERS = {
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
};

// ==========================================
// 1. FINANZAS (Binance + BCV)
// ==========================================
// ... (He simplificado tu código original para que retorne un Objeto, no un Response)
// Helper para consultar Binance
const fetchBinanceData = async (tradeType, amount = null, limit = 5) => {
    try {
        const payload = {
            "fiat": "VES",
            "page": 1,
            "rows": limit,
            "tradeType": tradeType,
            "asset": "USDT",
            "countries": [],
            "proMerchantAds": false,
            "shieldMerchantAds": false,
            "payTypes": ["PagoMovil"],
            "transAmount": amount
        };
        const { data } = await axios.post(URL_BINANCE, payload, { headers: BINANCE_HEADERS });
        return data.data || [];
    } catch (e) {
        console.warn('Fallo petición parcial a Binance:', e.message);
        return [];
    }
};

export async function syncExchangeRates() {
    try {
        const forceUpdate = true;

        // --- ZONA HORARIA CARACAS ---
        const now = new Date();
        const fechaCaracas = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Caracas', year: 'numeric', month: '2-digit', day: '2-digit',
        }).format(now);

        const horaCaracas = new Intl.DateTimeFormat('en-GB', {
            timeZone: 'America/Caracas', hour: '2-digit', minute: '2-digit', second: '2-digit',
        }).format(now);

        const fechaActual = fechaCaracas;
        const horaActual = horaCaracas;

        console.log(BcvPrecioHistorico);

        // 1. Verificar si existe registro en BD
        const existingPrice = await BcvPrecioHistorico.findOne({
            where: { fecha: fechaActual },
        });

        if (existingPrice && !forceUpdate) {
            return NextResponse.json({
                message: 'Precios obtenidos de base de datos',
                precio: parseFloat(existingPrice.monto),        // USD BCV
                eur: parseFloat(existingPrice.montoEur || 0),   // EUR BCV
                usdt: parseFloat(existingPrice.montoUsdt || 0), // USDT Binance
                fecha: existingPrice.fecha,
                hora: existingPrice.hora,
                origen: 'base_de_datos'
            });
        }

        // ---------------------------------------------------------
        // 2. SCRAPING BCV (USD y EUR)
        // ---------------------------------------------------------
        const agent = new https.Agent({ rejectUnauthorized: false });
        // Pedimos la página del BCV
        const { data: htmlBCV } = await axios.get('https://www.bcv.org.ve/', { httpsAgent: agent, timeout: 15000 });
        const $ = cheerio.load(htmlBCV);

        // Helper para limpiar el texto "36,4500000" -> 36.45
        const parseBCV = (selector) => {
            const text = $(selector).first().text().trim();
            return parseFloat(text.replace(/\./g, '').replace(',', '.')).toFixed(2);
        };

        const precioDolarBCV = parseBCV('div#dolar .recuadrotsmc .centrado');
        const precioEuroBCV = parseBCV('div#euro .recuadrotsmc .centrado');

        if (isNaN(precioDolarBCV)) throw new Error("No se pudo parsear el precio del Dólar BCV.");

        // ---------------------------------------------------------
        // 3. CALCULO USDT BINANCE (Lógica Dinámica 50 USDT)
        // ---------------------------------------------------------
        let precioUsdtPromedio = 0;

        try {
            // A. Obtener referencia de 1 USDT para calcular monto base
            const refData = await fetchBinanceData('BUY', null, 1);

            if (refData.length > 0) {
                const precioUnitarioRef = parseFloat(refData[0].adv.price);

                // B. Calcular cuánto son 50 USDT hoy
                const montoObjetivoVES = precioUnitarioRef * 50;

                // C. Buscar ofertas BUY y SELL para ese monto exacto en paralelo
                const [ofertasVenta, ofertasCompra] = await Promise.all([
                    fetchBinanceData('BUY', montoObjetivoVES, 5),
                    fetchBinanceData('SELL', montoObjetivoVES, 5)
                ]);

                if (ofertasVenta.length > 0 && ofertasCompra.length > 0) {
                    const calcPromedio = (lista) => lista.reduce((acc, item) => acc + parseFloat(item.adv.price), 0) / lista.length;
                    const promVenta = calcPromedio(ofertasVenta);
                    const promCompra = calcPromedio(ofertasCompra);

                    // Punto medio
                    precioUsdtPromedio = (promVenta + promCompra) / 2;
                }
            }
        } catch (errorBinance) {
            console.error("Error obteniendo USDT:", errorBinance.message);
            // No lanzamos throw para no detener el guardado del BCV
        }

        // ---------------------------------------------------------
        // 4. Guardar en Base de Datos
        // ---------------------------------------------------------
        let resultRecord;
        let operacion;

        // Datos a guardar
        const datosAGuardar = {
            monto: precioDolarBCV,              // USD
            montoEur: precioEuroBCV || 0,       // EUR (si falla, 0)
            montoUsdt: parseFloat(precioUsdtPromedio.toFixed(2)) || 0, // USDT (si falla, 0)
            hora: horaActual
        };

        if (existingPrice) {
            // Actualizar
            await existingPrice.update(datosAGuardar);
            resultRecord = existingPrice;
            operacion = 'actualizado_por_fuerza';
        } else {
            // Crear nuevo
            resultRecord = await BcvPrecioHistorico.create({
                fecha: fechaActual,
                ...datosAGuardar
            });
            operacion = 'creado_nuevo';
        }

        // Notificar Admin
        await notificarCabezas( {
            title: 'Tasas de Cambio Actualizadas',
            body: `USD: ${precioDolarBCV}\nEUR: ${precioEuroBCV}\nUSDT: ${datosAGuardar.montoUsdt}`,
            url: '/superuser/bcv',
            tag: 'bcv_update'
        });


        return { type: 'FINANZAS', status: 'OK', msg: `BCV: ${resultRecord.monto}, EUR: ${resultRecord.montoEur}, USDT: ${resultRecord.montoUsdt}` };
    } catch (e) {
        console.error("Error Finanzas:", e);
        return { type: 'FINANZAS', status: 'ERROR', msg: e.message };
    }
}

// ==========================================
// 2. INVENTARIO (Garantías Consumibles)
// ==========================================
export async function checkConsumableWarranties() {
    const today = getCaracasDate();
    const limitDate = addDays(today, 15); // Umbral de 15 días

    const items = await ConsumibleSerializado.findAll({
        where: {
            estado: { [Op.not]: 'retirado' }, // Ignorar basura
            fechaVencimientoGarantia: {
                [Op.lte]: limitDate, // Vence hoy o antes de 15 días
                // [Op.gte]: today // (Opcional) Si quieres ignorar los que ya vencieron hace meses
            }
        },
        include: [
            { association: 'consumible', attributes: ['nombre'] },
            {
                association: "activo", as: 'activo', attributes: ['tipoActivo'],
                include: [
                    {
                        association: 'vehiculoInstancia', attributes: ['placa'],
                        include: [{ association: "plantilla", attributes: ['modelo', 'tipoVehiculo'] }]
                    },
                    {
                        association: 'remolqueInstancia', attributes: ['placa'],
                        include: [{ association: "plantilla", attributes: ['modelo', 'tipoRemolque'] }]
                    },
                    {
                        association: 'maquinaInstancia', attributes: ['placa'],
                        include: [{ association: "plantilla", attributes: ['modelo', 'tipo'] }]
                    },
                    {
                        association: 'inmuebleInstancia', attributes: ['direccionEspecifica'],
                        include: [{ association: "plantilla", attributes: ['nombre'] }]
                    },
                    {
                        association: 'equipoInstancia', attributes: ['serialFabrica'],
                        include: [{ association: "plantilla", attributes: ['tipoEquipo', 'marca', 'modelo'] }]
                    }
                ]
            }
        ]
    });

    console.log(`Consumibles con garantía por vencer: ${items.length}`);

    return items.map(item => ({
        serial: item.serial,
        nombre: item.consumible?.nombre,
        activo: item.activo?.tipoActivo === 'Vehiculo' ? `${item.activo.vehiculoInstancia.plantilla.tipoVehiculo} ${item.activo.vehiculoInstancia.plantilla.modelo} ${item.activo.vehiculoInstancia?.placa}` :
            item.activo?.tipoActivo === 'Remolque' ? `${item.activo.remolqueInstancia.plantilla.tipoRemolque} ${item.activo.remolqueInstancia.plantilla.modelo} ${item.activo.remolqueInstancia?.placa}` :
                item.activo?.tipoActivo === 'Maquina' ? `${item.activo.maquinaInstancia.plantilla.tipo} ${item.activo.maquinaInstancia.plantilla.modelo} ${item.activo.maquinaInstancia?.placa}` :
                    item.activo?.tipoActivo === "Inmueble" ? `${item.activo.inmuebleInstancia?.plantilla.nombre}` :
                        item.activo?.tipoActivo === "Equipo" ? `${item.activo.equipoInstancia?.plantilla.tipoEquipo || ''} ${item.activo.equipoInstancia?.plantilla.marca || ''} ${item.activo.equipoInstancia?.plantilla.modelo || ''}` :
                            'N/A',
        // activoId: `Activo ID: ${item.activo.id}`,
        vence: item.fechaVencimientoGarantia
    }));
}

// ==========================================
// 3. RRHH (Cumpleaños, Aniversarios, Docs)
// ==========================================
export async function checkHREvents() {
    const today = getCaracasDate();
    const notifications = [];

    // Traemos empleados activos con sus documentos
    const empleados = await Empleado.findAll({
        attributes: ['id', 'nombre', 'apellido', 'fechaNacimiento', 'fechaIngreso'],
        include: [{
            model: DocumentoEmpleado,
            as: 'documentos',
            where: {
                fechaVencimiento: { [Op.lte]: addDays(today, 15) } // Docs por vencer en 15 dias o ya vencidos
            },
            required: false // LEFT JOIN: Trae empleados aunque no tengan docs vencidos (para ver cumple/aniversario)
        }]
    });

    for (const emp of empleados) {
        // A. Cumpleaños (4 días antes o el mismo día)
        const bdayThisYear = new Date(today.getFullYear(), new Date(emp.fechaNacimiento).getMonth(), new Date(emp.fechaNacimiento).getDate() + 1); // Ajuste zona horaria simple
        const daysToBday = (bdayThisYear - today) / (1000 * 60 * 60 * 24);

        if (daysToBday >= 0 && daysToBday <= 4) {
            notifications.push({
                type: 'CUMPLE',
                msg: `🎂 ${emp.nombre} ${emp.apellido} cumple ${getYearsDiff(emp.fechaNacimiento, today)+1} años ${daysToBday < 1 ? 'HOY' : 'en ' + Math.ceil(daysToBday) + ' días'}.`,
                id: emp.id
            });
        }

        // B. Aniversario (1 día antes)
        const anniThisYear = new Date(today.getFullYear(), new Date(emp.fechaIngreso).getMonth(), new Date(emp.fechaIngreso).getDate() + 1);
        const daysToAnni = (anniThisYear - today) / (1000 * 60 * 60 * 24);

        if (daysToAnni >= 0 && daysToAnni <= 1) {
            const years = getYearsDiff(emp.fechaIngreso, today); // +1 porque es el que va a cumplir
            notifications.push({
                type: 'ANIVERSARIO',
                msg: `¡¡¡🎉🎂 Mañana ${emp.nombre} ${emp.apellido} cumple ${years}  ${years === 1 ? 'año' : 'años'} en la empresa🎂!!!`,
                id: emp.id,
            });
        }

        // C. Documentos Empleado (Ya filtrados por la query)
        if (emp.documentos && emp.documentos.length > 0) {
            emp.documentos.forEach(doc => {
                notifications.push({
                    type: 'DOC_EMPLEADO',
                    msg: `⚠️ ${doc.tipo} de ${emp.nombre} ${emp.apellido} vence el ${doc.fechaVencimiento}.`,
                    id: emp.id,
                });
            });
        }
    }

    return notifications;
}

// ==========================================
// 4. ACTIVOS (Documentos de Vehículos/Activos)
// ==========================================
export async function checkAssetDocs() {
    const today = getCaracasDate();

    const docs = await DocumentoActivo.findAll({
        where: {
            fechaVencimiento: { [Op.lte]: addDays(today, 15) }
        },
        include: [{ model: Activo, as: 'activo', attributes: ['tipoActivo'],
            include: [
                    {
                        association: 'vehiculoInstancia', attributes: ['placa'],
                        include: [{ association: "plantilla", attributes: ['modelo', 'tipoVehiculo'] }]
                    },
                    {
                        association: 'remolqueInstancia', attributes: ['placa'],
                        include: [{ association: "plantilla", attributes: ['modelo', 'tipoRemolque'] }]
                    },
                    {
                        association: 'maquinaInstancia', attributes: ['placa'],
                        include: [{ association: "plantilla", attributes: ['modelo', 'tipo'] }]
                    },
                    {
                        association: 'inmuebleInstancia', attributes: ['direccionEspecifica'],
                        include: [{ association: "plantilla", attributes: ['nombre'] }]
                    },
                    {
                        association: 'equipoInstancia', attributes: ['serialFabrica'],
                        include: [{ association: "plantilla", attributes: ['tipoEquipo', 'marca', 'modelo'] }]
                    }
                ]
         }]
    });

    return docs.map(doc => ({
        msg: doc.activo.tipoActivo === "Vehiculo" ?
        `${doc.tipo} del ${doc.activo?.vehiculoInstancia.plantilla.tipoVehiculo || 'N/A'} ${doc.activo.vehiculoInstancia.plantilla.modelo} ${doc.activo.vehiculoInstancia?.placa || ''}  vence el ${doc.fechaVencimiento}.`
        : doc.activo.tipoActivo === "Remolque" ?
        `${doc.tipo} del ${doc.activo?.remolqueInstancia.plantilla.tipoRemolque || 'N/A'} ${doc.activo.remolqueInstancia.plantilla.modelo} ${doc.activo.remolqueInstancia?.placa || ''}  vence el ${doc.fechaVencimiento}.`
        : doc.activo.tipoActivo === "Maquina" ? 
        `${doc.tipo} del ${doc.activo?.maquinaInstancia.plantilla.tipo || 'N/A'} ${doc.activo.maquinaInstancia.plantilla.modelo} ${doc.activo.maquinaInstancia?.placa || ''}  vence el ${doc.fechaVencimiento}.`
        : doc.activo.tipoActivo === "Inmueble" ?
        `${doc.tipo} del ${doc.activo?.inmuebleInstancia.plantilla.tipo || 'N/A'} ${doc.activo.inmuebleInstancia?.plantilla.nombre || ''} vence el ${doc.fechaVencimiento}.`
        : doc.activo.tipoActivo === "Equipo" ?
        `${doc.tipo} del ${doc.activo?.equipoInstancia.plantilla.tipo || 'N/A'} ${doc.activo.equipoInstancia?.plantilla.marca || ''} ${doc.activo.equipoInstancia?.plantilla.modelo || ''} ubicado en ${doc.activo.ubicacionActual || 'N/A'} vence el ${doc.fechaVencimiento}.`
        : `${doc.tipo} del Activo ID ${doc.activoId} vence el ${doc.fechaVencimiento}.`
        ,
        id: doc.activoId
    }));
}