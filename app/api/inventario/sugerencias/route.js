import db from '@/models';
import { NextResponse } from 'next/server';
import sequelize from '@/sequelize';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const campo = searchParams.get('campo'); // 'marca' o 'viscosidad'

    try {
        let resultados;
        if (campo === 'marca') {
            // Buscamos todos los valores únicos y no nulos de la columna 'marca'
            resultados = await db.Consumible.findAll({
                attributes: [
                    [sequelize.fn('DISTINCT', sequelize.col('marca')), 'marca']
                ],
                where: {
                    marca: { [db.Sequelize.Op.ne]: null }
                },
                order: [['marca', 'ASC']]
            });
            return NextResponse.json(resultados.map(r => r.marca));
        }

        if (campo === 'viscosidad') {
            // Esta es una consulta más compleja para buscar dentro del JSONB
            const [data] = await sequelize.query(`
                SELECT DISTINCT(especificaciones->>'viscosidad') AS viscosidad
                FROM "Consumibles"
                WHERE especificaciones->>'viscosidad' IS NOT NULL
                ORDER BY viscosidad ASC;
            `);
            return NextResponse.json(data.map(r => r.viscosidad));
        }
        if (campo === 'medida') {
            // Esta es una consulta más compleja para buscar dentro del JSONB
            const [data] = await sequelize.query(`
                SELECT DISTINCT(especificaciones->>'medida') AS medida
                FROM "Consumibles"
                WHERE especificaciones->>'medida' IS NOT NULL
                ORDER BY medida ASC;
            `);
            return NextResponse.json(data.map(r => r.viscosidad));
        }

        return NextResponse.json({ message: 'Campo no válido' }, { status: 400 });

    } catch (error) {
        console.error(`Error al obtener sugerencias para ${campo}:`, error);
        return NextResponse.json({ message: 'Error en el servidor' }, { status: 500 });
    }
}