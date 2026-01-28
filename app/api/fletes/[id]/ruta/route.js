import { NextResponse } from "next/server";
import db from "@/models";
import { sequelize } from "@/models";

export async function GET(request, { params }) {
    try {
        const { id } = params;

        // CONSULTA RAW PARA USAR POTENCIA DE POSTGIS
        // 1. ST_MakeLine: Une los puntos en una línea ordenados por tiempo.
        // 2. ST_Simplify: Reduce la cantidad de puntos manteniendo la forma (0.0001 es la tolerancia en grados).
        // 3. ST_AsGeoJSON: Nos devuelve el JSON listo para el frontend.
        
        const rutaOptimizada = await sequelize.query(`
            SELECT 
                ST_AsGeoJSON(
                    ST_Simplify(
                        ST_MakeLine(posicion ORDER BY timestamp ASC), 
                        0.0001
                    )
                ) as geojson
            FROM "RutaFletes"
            WHERE "fleteId" = :fleteId
        `, {
            replacements: { fleteId: id },
            type: sequelize.QueryTypes.SELECT
        });

        // El resultado viene como un string JSON dentro de la columna geojson
        const geometry = rutaOptimizada[0]?.geojson 
            ? JSON.parse(rutaOptimizada[0].geojson) 
            : null;

        // Google Maps necesita array de {lat, lng}. 
        // PostGIS devuelve array de [lng, lat]. Hacemos el switch:
        const pathGoogle = geometry 
            ? geometry.coordinates.map(coord => ({ lat: coord[1], lng: coord[0] }))
            : [];

        return NextResponse.json({ success: true, path: pathGoogle });

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}