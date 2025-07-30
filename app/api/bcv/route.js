// app/api/bcv/precio/route.js (o tu ruta actual de la API)
import axios from 'axios';
import https from 'https';
const cheerio = require('cheerio');
import { NextResponse } from 'next/server';
import BcvPrecioHistorico from '../../../models/BcvPrecioHistorico'; // Ajusta la ruta si es necesario

export async function GET(request) {
    try {
        const today = new Date();
        // Formatear la fecha a 'YYYY-MM-DD' para la consulta
        const fechaActual = today.toISOString().split('T')[0]; 

        // 1. Verificar si ya existe un registro para la fecha actual
        const existingPrice = await BcvPrecioHistorico.findOne({
            where: {
                fecha: fechaActual,
            },
        });

        if (existingPrice) {
            return NextResponse.json({ 
                message: 'Precio BCV para hoy ya existe', 
                precio: parseFloat(existingPrice.monto), // Convertir a número para el retorno
                fecha: existingPrice.fecha,
                hora: existingPrice.hora,
                origen: 'base_de_datos'
            });
        }

        // 2. Si no existe, proceder con el scraping
        const agent = new https.Agent({
            rejectUnauthorized: false, 
        });

        const { data } = await axios.get('https://www.bcv.org.ve/', { httpsAgent: agent });
        const $ = cheerio.load(data);

        const dolarText = $('div#dolar .recuadrotsmc .centrado').first().text().trim();

        // Limpiar y parsear el valor a un número
        // Asegúrate de que el formato de moneda sea consistente: elimina puntos de miles y usa punto para decimales.
        const precioBCV = parseFloat(dolarText.replace(/\./g, '').replace(',', '.')); 

        if (isNaN(precioBCV)) {
            throw new Error("No se pudo parsear el precio del BCV.");
        }

        // 3. Guardar el nuevo registro en la base de datos
        const now = new Date();
        const horaActual = now.toTimeString().split(' ')[0]; // Obtener 'HH:MM:SS'

        const newPriceRecord = await BcvPrecioHistorico.create({
            fecha: fechaActual,
            hora: horaActual,
            monto: precioBCV,
        });


        return NextResponse.json({ 
            message: 'Precio BCV obtenido y guardado exitosamente', 
            precio: parseFloat(newPriceRecord.monto), // Convertir a número para el retorno
            fecha: newPriceRecord.fecha,
            hora: newPriceRecord.hora,
            origen: 'bcv_scrapeo_y_guardado'
        });

    } catch (error) {
        console.error('Error al obtener o guardar el precio BCV:', error.message);
        return NextResponse.json({ 
            message: 'Error al obtener o guardar el precio BCV', 
            error: error.message, 
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
        }, { status: 500 });
    }
}