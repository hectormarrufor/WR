// app/api/superuser/clientes/route.js
import axios from 'axios';
import https from 'https';
const cheerio = require('cheerio');

import { NextResponse } from 'next/server';


export async function GET(request) {
    try {
        const agent = new https.Agent({
            rejectUnauthorized: false, 
        });

        const { data } = await axios.get('https://www.bcv.org.ve/', { httpsAgent: agent });
        const $ = cheerio.load(data);

        // Este selector puede cambiar según el HTML del sitio
        const dolarText = $('div#dolar .recuadrotsmc .centrado').first().text().trim();

        // res.json({ USD: dolarText });


        // const req = await fetch("https://bcv-api.rafnixg.dev/rates/", {
        //     method: 'GET',
        //     headers: {
        //         'Content-Type': 'application/json',
        //         'accept': 'application/json'
        //     }
        // })


        console.log("precio: ", dolarText);
        return NextResponse.json(dolarText);
    } catch (error) {
        console.error('Error fetching precio BCV', error.message);
        return NextResponse.json({ message: 'Error al obtener clientes', error: error.message }, { status: 500 });
    }
}

