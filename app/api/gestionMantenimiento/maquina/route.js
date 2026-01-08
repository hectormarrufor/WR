import { NextResponse } from 'next/server';
import sequelize from '@/sequelize';
import { 

// filepath: c:\Users\Hector Marrufo\Documents\App Web DADICA hector marrufo\WR\app\api\gestionMantenimiento\maquina\route.js
    Maquina, 
    Subsistema, 
    ConsumibleRecomendado 
} from '@/models';

// ----------------------------------------------------------------------
// MAIN HANDLER
// ----------------------------------------------------------------------

// GET: Listar Plantillas de Máquinas
export async function GET(request) {
    try {
        const maquinas = await Maquina.findAll();
        return NextResponse.json({ success: true, data: maquinas });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// POST: Crear Plantilla de Máquina con Subsistemas y Recomendaciones
export async function POST(request) {
    const t = await sequelize.transaction();

    try {
        const body = await request.json();

        // 1. Crear Máquina (Tabla Padre)
        // Usamos los campos definidos en Maquina.js
        const nuevaMaquina = await Maquina.create({
            marca: body.marca,
            modelo: body.modelo,
            anio: body.anio,
            tipo: body.tipo, // 'Retroexcavadora', 'Taladro', etc.
            traccion: body.traccion, // 'oruga', 'ruedas'
            peso: body.peso,
            capacidadLevante: body.capacidadLevante,
            capacidadCucharon: body.capacidadCucharon,
            alcanceMaximo: body.alcanceMaximo,
            potencia: body.potencia,
            // Si tu modelo Maquina llega a tener imagen, descomentar:
            // imagen: body.imagen || null, 
        }, { transaction: t });

        // 2. Procesar Subsistemas (Hijos)
        if (body.subsistemas && body.subsistemas.length > 0) {
            
            for (const subData of body.subsistemas) {
                // Crear el Subsistema (Ej: Sistema Hidráulico, Motor, Brazo)
                const nuevoSubsistema = await Subsistema.create({
                    nombre: subData.nombre,
                    categoria: subData.categoria, 
                    maquinaId: nuevaMaquina.id // Relación con el padre (Maquina)
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

                        // LÓGICA DE MAPEO (Igual que en Vehículo y Remolque)
                        if (rec.tipoCriterio === 'grupo') {
                            // Criterio basado en Grupo de Equivalencia
                            detalle.grupoEquivalenciaId = rec.criterioId; 
                            detalle.valorCriterio = null; 
                        } 
                        else if (rec.tipoCriterio === 'tecnico') {
                            // Criterio basado en especificación técnica (texto)
                            detalle.valorCriterio = rec.criterioId;
                        } 
                        else if (rec.tipoCriterio === 'individual') {
                            // Criterio basado en un consumible específico (ID)
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
        return NextResponse.json({ success: true, data: nuevaMaquina }, { status: 201 });

    } catch (error) {
        await t.rollback();
        console.error("Error creando máquina:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}