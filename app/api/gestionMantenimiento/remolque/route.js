import { NextResponse } from 'next/server';
import sequelize from '@/sequelize';
import { 

// filepath: c:\Users\Hector Marrufo\Documents\App Web DADICA hector marrufo\WR\app\api\gestionMantenimiento\remolque\route.js
    Remolque, 
    Subsistema, 
    ConsumibleRecomendado 
} from '@/models';

// ----------------------------------------------------------------------
// MAIN HANDLER
// ----------------------------------------------------------------------

// GET: Listar Plantillas de Remolques
export async function GET(request) {
    try {
        const remolques = await Remolque.findAll();
        return NextResponse.json({ success: true, data: remolques });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// POST: Crear Plantilla de Remolque con Subsistemas y Recomendaciones
export async function POST(request) {
    const t = await sequelize.transaction();

    try {
        const body = await request.json();

        // 1. Crear Remolque (Tabla Padre)
        const nuevoRemolque = await Remolque.create({
            marca: body.marca,
            modelo: body.modelo,
            anio: body.anio,
            imagen: body.imagen || null,
            nroEjes: body.nroEjes,
            capacidadCarga: body.capacidadCarga,
            peso: body.peso,
            tipoRemolque: body.tipoRemolque, // 'Batea', 'Plataforma', etc.
        }, { transaction: t });

        // 2. Procesar Subsistemas (Hijos)
        if (body.subsistemas && body.subsistemas.length > 0) {
            
            for (const subData of body.subsistemas) {
                // Crear el Subsistema (Ej: Ejes, Frenos, Suspensión)
                const nuevoSubsistema = await Subsistema.create({
                    nombre: subData.nombre,
                    categoria: subData.categoria, 
                    remolqueId: nuevoRemolque.id // Relación con el padre (Remolque)
                }, { transaction: t });

                // 3. Procesar Recomendaciones (Nietos - Detalles)
                if (subData.recomendaciones && subData.recomendaciones.length > 0) {
                    
                    const detallesParaGuardar = subData.recomendaciones.map(rec => {
                        // Objeto base
                        let detalle = {
                            subsistemaId: nuevoSubsistema.id,
                            label: rec.label,
                            categoria: rec.categoria,
                            cantidad: rec.cantidad || 1,
                            tipoCriterio: rec.tipoCriterio, // 'grupo', 'tecnico', 'individual'
                            valorCriterio: null,
                            grupoEquivalenciaId: null,
                            consumibleId: null
                        };

                        // LÓGICA DE MAPEO (Igual que en Vehículo)
                        if (rec.tipoCriterio === 'grupo') {
                            detalle.grupoEquivalenciaId = rec.criterioId; 
                            detalle.valorCriterio = null; 
                        } 
                        else if (rec.tipoCriterio === 'tecnico') {
                            detalle.valorCriterio = rec.criterioId;
                        } 
                        else if (rec.tipoCriterio === 'individual') {
                            detalle.consumibleId = rec.criterioId;
                            detalle.valorCriterio = rec.labelOriginal || null; 
                        }

                        return detalle;
                    });

                    // Guardamos todas las recomendaciones de este subsistema
                    await ConsumibleRecomendado.bulkCreate(detallesParaGuardar, { transaction: t });
                }
            }
        }

        await t.commit();
        return NextResponse.json({ success: true, data: nuevoRemolque }, { status: 201 });

    } catch (error) {
        await t.rollback();
        console.error("Error creando remolque:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}