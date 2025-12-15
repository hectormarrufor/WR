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

export async function POST(request) {
    const t = await sequelize.transaction();

    try {
        const body = await request.json();

        // 1. Crear Vehículo
        const vehiculo = await Vehiculo.create({
            marcaId: body.marcaId,
            modelo: body.modelo,
            anio: body.anio,
            tipoVehiculo: body.tipoVehiculo,
            peso: body.peso,
            capacidadCarga: body.capacidadCarga,
            numeroEjes: body.numeroEjes,
            tipoCombustible: body.tipoCombustible,
            imagen: body.imagen
        }, { transaction: t });

        // 2. Subsistemas
        if (body.subsistemas && Array.isArray(body.subsistemas)) {
            for (const subData of body.subsistemas) {
                const subsistema = await Subsistema.create({
                    nombre: subData.nombre,
                    descripcion: subData.descripcion,
                    vehiculoId: vehiculo.id
                }, { transaction: t });

                // 3. Consumibles
                if (subData.consumibles && Array.isArray(subData.consumibles)) {
                    for (const itemInput of subData.consumibles) {
                        
                        // A. Resolver (Buscar o Crear + Vincular)
                        // Aquí ocurre la magia: si es nuevo y trae 'equivalenteA', se une al grupo.
                        const consumiblePrincipal = await resolverConsumible(itemInput, t);

                        // B. Expandir (Traer a toda la familia)
                        // Como ya se unió al grupo en el paso A, aquí traerá a los hermanos.
                        const todosLosIds = await buscarHermanosEquivalentes(consumiblePrincipal, t);

                        // C. Insertar relaciones
                        const cantidad = (typeof itemInput === 'object' && itemInput.cantidad) ? itemInput.cantidad : 1;

                        const promesasInsert = todosLosIds.map(id => {
                            return ConsumibleRecomendado.findOrCreate({
                                where: { subsistemaId: subsistema.id, consumibleId: id },
                                defaults: {
                                    subsistemaId: subsistema.id,
                                    consumibleId: id,
                                    cantidadRecomendada: cantidad
                                },
                                transaction: t
                            });
                        });
                        await Promise.all(promesasInsert);
                    }
                }
            }
        }

        await t.commit();
        return NextResponse.json({ success: true, data: vehiculo }, { status: 201 });

    } catch (error) {
        await t.rollback();
        console.error("Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}