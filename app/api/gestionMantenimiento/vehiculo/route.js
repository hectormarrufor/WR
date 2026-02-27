// app/api/gestionMantenimiento/vehiculo/route.js
import { NextResponse } from 'next/server';
import sequelize from '@/sequelize';
import { Op } from 'sequelize';
import { 
    Vehiculo, 
    Subsistema, 
    Consumible, 
    ConsumibleRecomendado,
    Filtro,
    Correa,
    EquivalenciaFiltro // Importamos el modelo agrupador si existe, o usamos lógica de IDs compartidos
} from '@/models';

// ----------------------------------------------------------------------
// 1. HELPER: Resolver Consumible (Obtener ID o Crear con Vinculación)
// ----------------------------------------------------------------------
async function resolverConsumible(item, transaction) {
    // CASO A: El usuario envió un ID (Consumible existente)
    if (typeof item === 'number') {
        const existe = await Consumible.findByPk(item, { transaction });
        if (!existe) throw new Error(`El consumible ID ${item} no existe.`);
        return existe;
    }

    // CASO B: Crear nuevo al vuelo
    if (typeof item === 'object') {
        
        // 1. Crear el registro padre (Consumible)
        const nuevoConsumible = await Consumible.create({
            nombre: item.nombre,
            descripcion: item.descripcion || 'Creado desde plantilla vehículo',
            tipo: item.tipo, 
            stockActual: 0, 
            stockMinimo: item.stockMinimo || 0,
            unidadMedida: item.unidadMedida || 'UNIDAD',
            codigo: item.codigo || null 
        }, { transaction });

        // 2. Lógica específica por TIPO y VINCULACIÓN (EquivalenteA)
        if (item.tipo === 'Filtro') {
            
            let equivalenciaIdToUse = null;

            // ¿El usuario nos dijo que este nuevo filtro es igual a uno existente?
            if (item.equivalenteA) {
                // Buscamos el filtro "hermano mayor" existente
                const filtroExistente = await Filtro.findOne({ 
                    where: { consumibleId: item.equivalenteA },
                    transaction 
                });

                if (filtroExistente) {
                    if (filtroExistente.equivalenciaId) {
                        // Caso 1: El existente ya tiene grupo, nos unimos.
                        equivalenciaIdToUse = filtroExistente.equivalenciaId;
                    } else {
                        // Caso 2: El existente es un lobo solitario.
                        // Creamos un nuevo grupo de equivalencia
                        const nuevaEquivalencia = await EquivalenciaFiltro.create({
                            descripcion: 'Grupo generado automáticamente'
                        }, { transaction });
                        
                        equivalenciaIdToUse = nuevaEquivalencia.id;

                        // IMPORTANTE: Actualizamos al "hermano mayor" para que entre al grupo
                        filtroExistente.equivalenciaId = equivalenciaIdToUse;
                        await filtroExistente.save({ transaction });
                    }
                }
            }

            // Creamos el detalle del filtro nuevo con el ID de grupo (si se encontró)
            await Filtro.create({
                consumibleId: nuevoConsumible.id,
                tipoFiltro: item.tipoFiltro || 'Aceite',
                equivalenciaId: equivalenciaIdToUse // null si no se pasó equivalenteA
            }, { transaction });

        } else if (item.tipo === 'Correa') {
            // Para correas es más fácil: si pasas la medida, la equivalencia es automática luego
            await Correa.create({
                consumibleId: nuevoConsumible.id,
                medida: item.medida // Ej: "6PK1035"
            }, { transaction });
        }

        // Retornamos la instancia completa
        return nuevoConsumible;
    }
    
    throw new Error('Formato de consumible inválido.');
}

// ----------------------------------------------------------------------
// 2. HELPER: Buscar Equivalencias (Expandir selección)
// ----------------------------------------------------------------------
async function buscarHermanosEquivalentes(consumible, transaction) {
    let idsRecomendados = [consumible.id];

    if (consumible.tipo === 'Filtro') {
        const miFiltro = await Filtro.findOne({ where: { consumibleId: consumible.id }, transaction });
        
        // Ahora sí: Si acabamos de crear uno nuevo y lo vinculamos en el paso anterior,
        // miFiltro.equivalenciaId YA tendrá valor, y traerá a sus nuevos hermanos.
        if (miFiltro && miFiltro.equivalenciaId) {
            const hermanos = await Filtro.findAll({
                where: { 
                    equivalenciaId: miFiltro.equivalenciaId,
                    consumibleId: { [Op.ne]: consumible.id }
                },
                attributes: ['consumibleId'],
                transaction
            });
            idsRecomendados.push(...hermanos.map(h => h.consumibleId));
        }
    } 
    else if (consumible.tipo === 'Correa') {
        const miCorrea = await Correa.findOne({ where: { consumibleId: consumible.id }, transaction });
        if (miCorrea && miCorrea.medida) {
            const hermanas = await Correa.findAll({
                where: { 
                    medida: miCorrea.medida,
                    consumibleId: { [Op.ne]: consumible.id }
                },
                attributes: ['consumibleId'],
                transaction
            });
            idsRecomendados.push(...hermanas.map(c => c.consumibleId));
        }
    }

    return [...new Set(idsRecomendados)];
}

// ----------------------------------------------------------------------
// MAIN HANDLER
// ----------------------------------------------------------------------
// GET: Listar Plantillas de Vehículos
export async function GET(request) {
    try {
        const vehiculos = await Vehiculo.findAll();
        return NextResponse.json({ success: true, data: vehiculos });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
export async function POST(request) {
    const t = await sequelize.transaction();

    try {
        const body = await request.json();

        // 1. Crear Vehículo
        const nuevoModelo = await Vehiculo.create({
            marca: body.marca,
            modelo: body.modelo,
            anio: body.anio,
            tipoVehiculo: body.tipoVehiculo,
            peso: body.peso,
            capacidadArrastre: body.capacidadArrastre,
            pesoMaximoCombinado: body.pesoMaximoCombinado,
            imagen: body.imagen || null,
            potenciaMotor: body.potenciaMotor,
            numeroEjes: body.numeroEjes,
            tipoCombustible: body.tipoCombustible,
        }, { transaction: t });

        // 2. Procesar Subsistemas (Hijos)
        if (body.subsistemas && body.subsistemas.length > 0) {
            
            for (const subData of body.subsistemas) {
                // Crear el Subsistema (Ej: Motor)
                const nuevoSubsistema = await Subsistema.create({
                    nombre: subData.nombre,
                    categoria: subData.categoria, // 'motor', 'tren_rodaje', etc.
                    modeloVehiculoId: nuevoModelo.id // Relación con el padre
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

                        // LÓGICA DE MAPEO (EL TRADUCTOR)
                        // Aquí decidimos en qué columna guardar el 'criterioId' que viene del front

                        if (rec.tipoCriterio === 'grupo') {
                            // Si es grupo, guardamos el ID en la Foreign Key correspondiente
                            detalle.grupoEquivalenciaId = rec.criterioId; 
                            detalle.valorCriterio = null; // No aplica texto
                        } 
                        else if (rec.tipoCriterio === 'tecnico') {
                            // Si es técnico (medida, viscosidad, código), guardamos el STRING
                            detalle.valorCriterio = rec.criterioId; // Ej: "11R22.5" o "15W40"
                        } 
                        else if (rec.tipoCriterio === 'individual') {
                            // Si es individual, guardamos el ID del consumible específico
                            detalle.consumibleId = rec.criterioId;
                            // Opcional: guardar nombre en valorCriterio como respaldo visual
                            detalle.valorCriterio = rec.labelOriginal || null; 
                        }

                        return detalle;
                    });

                    // Guardamos todas las recomendaciones de este subsistema de golpe
                    await ConsumibleRecomendado.bulkCreate(detallesParaGuardar, { transaction: t });
                }
            }
        }

        await t.commit();
        return NextResponse.json({ success: true, data: nuevoModelo }, { status: 201 });

    } catch (error) {
        await t.rollback();
        console.error("Error creando modelo:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}