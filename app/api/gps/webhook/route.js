import { NextResponse } from "next/server";
import db from "@/models";

export async function POST(request) {
    try {
        const { codigoActivo, lat, lng, velocidad, timestamp } = await request.json();

        // 1. Identificar el Activo
        const activo = await db.Activo.findOne({ where: { codigoInterno: codigoActivo } });
        if (!activo) return NextResponse.json({ error: "Activo no reconocido" }, { status: 404 });

        // 2. ACTUALIZAR LA "FOTO" (Última ubicación en Activo)
        // Esto es para ver dónde está AHORA MISMO en el mapa general
        await activo.update({ 
            latitudActual: lat, 
            longitudActual: lng 
        });

        // 3. BUSCAR EL FLETE ACTIVO (El "Video")
        // Buscamos si este activo tiene un flete rodando actualmente
        const fleteActivo = await db.Flete.findOne({
            where: {
                activoPrincipalId: activo.id,
                estado: 'en_ruta' // Solo grabamos historial si está trabajando
            }
        });

        // 4. INSERTAR EL PUNTO EN EL HISTORIAL (Solo si hay flete)
       if (fleteActivo) {
            await db.RutaFlete.create({
                fleteId: fleteActivo.id,
                
                // AQUÍ ESTÁ EL CAMBIO: GeoJSON Object
                // RECUERDA: coordinates: [LONGITUD, LATITUD]
                posicion: { 
                    type: 'Point', 
                    coordinates: [parseFloat(lng), parseFloat(lat)] 
                },
                
                velocidad,
                timestamp: timestamp || new Date()
            });
            // Actualizar última posición en Activo (Para foto actual)
            await activo.update({
                latitudActual: lat,
                longitudActual: lng
            });

            // Ojo: Si también migras Activo a PostGIS, usa la misma lógica.
             
            // Si Activo sigue con lat/lng planos, déjalo como estaba.
        } 

        return NextResponse.json({ success: true, message: "Ubicación actualizada (Sin flete activo)" });

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}