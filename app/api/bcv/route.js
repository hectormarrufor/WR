import axios from 'axios';
import https from 'https';
const cheerio = require('cheerio');
import { NextResponse } from 'next/server';
import BcvPrecioHistorico from '../../../models/BcvPrecioHistorico';

export async function GET(request) {
    try {
        // Capturar parámetros de la URL
        const { searchParams } = new URL(request.url);
        const forceUpdate = searchParams.get('force') === 'true';
        
        const today = new Date();
        // Restamos 4 horas (VET es UTC-4). 
        // Si son las 03:00 AM del día 14 Zulu, esto lo lleva a las 23:00 PM del día 13.
        const venezuelaTime = new Date(today.getTime() - (0 * 60 * 60 * 1000));
        const fechaActual = venezuelaTime.toISOString().split('T')[0]; 
        const horaActual = venezuelaTime.toTimeString().split(' ')[0];

        // 1. Verificar si existe registro (solo si NO estamos forzando)
        const existingPrice = await BcvPrecioHistorico.findOne({
            where: { fecha: fechaActual },
        });

        if (existingPrice && !forceUpdate) {
            return NextResponse.json({ 
                message: 'Precio BCV obtenido de base de datos', 
                precio: parseFloat(existingPrice.monto),
                fecha: existingPrice.fecha,
                hora: existingPrice.hora,
                origen: 'base_de_datos'
            });
        }

        // 2. Proceder con el scraping (porque no existe o porque forzamos actualización)
        const agent = new https.Agent({ rejectUnauthorized: false });
        const { data } = await axios.get('https://www.bcv.org.ve/', { httpsAgent: agent, timeout: 10000 });
        const $ = cheerio.load(data);
        const dolarText = $('div#dolar .recuadrotsmc .centrado').first().text().trim();
        const precioBCV = parseFloat(dolarText.replace(/\./g, '').replace(',', '.')); 

        if (isNaN(precioBCV)) throw new Error("No se pudo parsear el precio del BCV.");


        let resultRecord;
        let operacion;

        // 3. Guardar o Actualizar
        if (existingPrice) {
            // Si ya existe y estamos aquí, es porque forceUpdate es true. Actualizamos.
            existingPrice.monto = precioBCV;
            existingPrice.hora = horaActual;
            await existingPrice.save();
            resultRecord = existingPrice;
            operacion = 'actualizado_por_fuerza';
        } else {
            // No existe, creamos nuevo
            resultRecord = await BcvPrecioHistorico.create({
                fecha: fechaActual,
                hora: horaActual,
                monto: precioBCV,
            });
            operacion = 'creado_nuevo';
        }

        return NextResponse.json({ 
            message: 'Precio BCV procesado exitosamente', 
            precio: parseFloat(resultRecord.monto),
            fecha: resultRecord.fecha,
            hora: resultRecord.hora,
            origen: operacion
        });

    } catch (error) {
        console.error('Error BCV API:', error.message);
        return NextResponse.json({ message: 'Error', error: error.message }, { status: 500 });
    }
}