// En tu controlador o servicio cuando necesites el horario de oficina
const { NextResponse } = require('next/server');
const { ConfiguracionGeneral } = require('../../../../models');

async function GET({ params }) {
    try {
        const { clave } = await params;
        const valor = await ConfiguracionGeneral.findOne({
            where: { clave: clave }
        });
        return NextResponse.json(valor);
    } catch (error) {
        throw new Error(`Error al conseguir la clave en la configuracion: ${error.message}`)
    }

}

