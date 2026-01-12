import { NextResponse } from 'next/server';
import sequelize from '@/sequelize';
import { 
    Vehiculo, Subsistema, ConsumibleRecomendado, 
    Activo, VehiculoInstancia, SubsistemaInstancia 
} from '@/models';

export async function PUT(request, { params }) {
    const { id } = params; // ID del Modelo (Plantilla)
    const t = await sequelize.transaction();

    try {
        const body = await request.json();

        // 1. BUSCAR EL MODELO EXISTENTE
        const modelo = await Vehiculo.findByPk(id, { transaction: t });
        if (!modelo) throw new Error("Modelo no encontrado");

        // 2. ACTUALIZAR DATOS BÁSICOS DEL MODELO
        await modelo.update({
            marca: body.marca,
            modelo: body.modelo,
            anio: body.anio,
            tipoVehiculo: body.tipoVehiculo,
            peso: body.peso,
            capacidadArrastre: body.capacidadArrastre,
            pesoMaximoCombinado: body.pesoMaximoCombinado,
            imagen: body.imagen,
            numeroEjes: body.numeroEjes,
            tipoCombustible: body.tipoCombustible,
        }, { transaction: t });

        // 3. GESTIÓN DE SUBSISTEMAS (Aquí ocurre la magia)
        if (body.subsistemas && body.subsistemas.length > 0) {
            
            for (const subData of body.subsistemas) {
                let subsistemaId = subData.id;

                // --- CASO A: EL SUBSISTEMA YA EXISTÍA (ACTUALIZAR) ---
                if (subsistemaId) {
                    await Subsistema.update({
                        nombre: subData.nombre,
                        categoria: subData.categoria
                    }, { 
                        where: { id: subsistemaId },
                        transaction: t 
                    });

                    // (Opcional) Aquí podrías actualizar sus recomendaciones borrando y creando de nuevo
                    // Para simplificar, asumimos que solo actualizamos nombres por ahora.
                } 
                
                // --- CASO B: ES UN SUBSISTEMA NUEVO (CREAR + PROPAGAR) ---
                else {
                    // B.1 Crear en la Plantilla
                    const nuevoSub = await Subsistema.create({
                        nombre: subData.nombre,
                        categoria: subData.categoria,
                        modeloVehiculoId: modelo.id
                    }, { transaction: t });
                    
                    subsistemaId = nuevoSub.id;

                    // B.2 PROPAGACIÓN: Buscar todos los activos hijos de este modelo
                    const activosHijos = await Activo.findAll({
                        include: [{
                            model: VehiculoInstancia,
                            as: 'vehiculoInstancia',
                            where: { modeloId: modelo.id }, // Filtrar por este modelo
                            required: true
                        }],
                        transaction: t
                    });

                    // B.3 Crear las instancias físicas vacías
                    if (activosHijos.length > 0) {
                        const nuevasInstancias = activosHijos.map(activo => ({
                            activoId: activo.id,
                            subsistemaPlantillaId: nuevoSub.id, // Enlace con el nuevo molde
                            estado: 'ok',
                            observaciones: 'Agregado por actualización de plantilla'
                        }));

                        await SubsistemaInstancia.bulkCreate(nuevasInstancias, { transaction: t });
                        console.log(`Propagado subsistema "${nuevoSub.nombre}" a ${nuevasInstancias.length} activos.`);
                    }
                }

                // --- GESTIÓN DE RECOMENDACIONES (COMÚN PARA NUEVOS Y VIEJOS) ---
                // La estrategia más limpia es borrar las viejas y crear las nuevas para este subsistema
                // OJO: Solo borramos recomendaciones de la plantilla, NO tocamos inventario físico
                
                if (subData.recomendaciones) {
                    // Borrar anteriores
                    await ConsumibleRecomendado.destroy({
                        where: { subsistemaId: subsistemaId },
                        transaction: t
                    });

                    // Crear nuevas
                    const detalles = subData.recomendaciones.map(rec => ({
                        subsistemaId: subsistemaId,
                        categoria: rec.categoria,
                        cantidad: rec.cantidad,
                        tipoCriterio: rec.tipoCriterio,
                        // Mapeo de criterios (Igual que en tu POST)
                        grupoEquivalenciaId: rec.tipoCriterio === 'grupo' ? rec.criterioId : null,
                        valorCriterio: rec.tipoCriterio === 'tecnico' ? rec.criterioId : (rec.labelOriginal || null),
                        consumibleId: rec.tipoCriterio === 'individual' ? rec.criterioId : null
                    }));

                    if (detalles.length > 0) {
                        await ConsumibleRecomendado.bulkCreate(detalles, { transaction: t });
                    }
                }
            }
        }

        await t.commit();
        return NextResponse.json({ success: true, message: 'Modelo actualizado y propagado' });

    } catch (error) {
        await t.rollback();
        console.error("Error en PUT Modelo:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}