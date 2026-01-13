import BcvPrecioHistorico from '@/models/BcvPrecioHistorico';
import { NextResponse } from 'next/server';
    
export const dynamic = 'force-dynamic'; // Para asegurar que no cachee datos viejos

export async function GET() {
    try {
        const historico = await BcvPrecioHistorico.findAll({
            // Ordenamos por fecha y hora ascendente para que el gráfico se dibuje de izquierda a derecha
            order: [
                ['fecha', 'ASC'],
                ['hora', 'ASC']
            ]
        });

        // Formateamos para asegurar que el monto sea número (Sequelize a veces devuelve string en DECIMAL)
        const data = historico.map(h => ({
            // id: h.id,
            fecha: h.fecha, // YYYY-MM-DD
            // hora: h.hora,
            monto: parseFloat(h.monto), // Vital para el gráfico
            // fullDate: `${h.fecha} ${h.hora}`
        }));

        return NextResponse.json({ success: true, data });

    } catch (error) {
        console.error("Error obteniendo BCV:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}