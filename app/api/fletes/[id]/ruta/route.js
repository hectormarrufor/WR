import { NextResponse } from "next/server";
import { sequelize, Flete, Cliente, Empleado, Activo } from "@/models";

// ==========================================
// GET: Obtener UN Flete + Su Ruta PostGIS
// ==========================================
export async function GET(request, { params }) {
    try {
        // 🚨 Next.js 15 exige el await aquí
        const { id } = await params;

        // 1. BUSCAR LOS DATOS REALES DEL FLETE (Lo que faltaba)
        const flete = await Flete.findByPk(id, {
            include: [
                { model: Cliente },
                { model: Empleado, as: 'chofer' },
                { model: Empleado, as: 'ayudante' },
                { model: Activo, as: 'vehiculo' },
                { model: Activo, as: 'remolque' }
            ]
        });

        if (!flete) {
            return NextResponse.json({ error: "Flete no encontrado" }, { status: 404 });
        }

        // 2. TU CONSULTA MAGISTRAL DE POSTGIS (Telemetría)
        let pathGoogle = [];
        try {
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

            const geometry = rutaOptimizada[0]?.geojson ? JSON.parse(rutaOptimizada[0].geojson) : null;
            
            // Convertimos [lng, lat] de PostGIS a {lat, lng} de Google Maps
            if (geometry && geometry.coordinates) {
                pathGoogle = geometry.coordinates.map(coord => ({ lat: coord[1], lng: coord[0] }));
            }
        } catch (postGisError) {
            // Si la tabla RutaFletes está vacía o hay un error, no tumbamos el flete, solo mandamos la ruta vacía
            console.warn("Nota: No se pudo cargar la telemetría GPS para este flete.", postGisError.message);
        }

        // 3. DEVOLVEMOS TODO EMPAQUETADO
        return NextResponse.json({
            ...flete.toJSON(),        // Toda la data financiera, cliente, fechas, etc.
            rutaTelemetria: pathGoogle // Tu ruta optimizada inyectada
        });

    } catch (error) {
        console.error("Error GET Flete ID:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// ==========================================
// PUT: Actualizar o Finalizar Flete
// ==========================================
export async function PUT(request, { params }) {
    try {
        const { id } = await params;
        const body = await request.json();

        const flete = await Flete.findByPk(id);
        if (!flete) return NextResponse.json({ error: "Flete no encontrado" }, { status: 404 });

        // Si envían JSONs stringificados, los parseamos para Sequelize
        if (typeof body.tramos === 'string') try { body.tramos = JSON.parse(body.tramos); } catch(e){}
        if (typeof body.waypoints === 'string') try { body.waypoints = JSON.parse(body.waypoints); } catch(e){}
        if (typeof body.breakdown === 'string') try { body.breakdown = JSON.parse(body.breakdown); } catch(e){}

        await flete.update(body);

        return NextResponse.json(flete);
    } catch (error) {
        console.error("Error PUT Flete:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// ==========================================
// DELETE: Cancelar o Eliminar Flete
// ==========================================
export async function DELETE(request, { params }) {
    try {
        const { id } = await params;
        const flete = await Flete.findByPk(id);
        
        if (!flete) return NextResponse.json({ error: "Flete no encontrado" }, { status: 404 });

        await flete.destroy();
        
        return NextResponse.json({ message: "Flete eliminado correctamente" });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}