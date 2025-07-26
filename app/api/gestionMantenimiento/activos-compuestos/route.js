import { NextResponse } from 'next/server';
import Activo from '../../../../models/gestionMantenimiento/Activo';
import ModeloActivo from '../../../../models/gestionMantenimiento/ModeloActivo';
import { CategoriaActivo, Grupo } from '../../../../models/gestionMantenimiento/CategoriaGrupo';
import sequelize from '../../../../sequelize';

// Función Helper para encontrar el ModeloActivo para un componente
async function findComponentModel(componentGroupName, transaction) {
    // Esta es una simplificación. En un sistema real, podrías tener una lógica
    // más compleja para elegir el modelo por defecto (ej. "MOTOR_GENERICO")
    const grupo = await Grupo.findOne({ where: { nombre: componentGroupName }, transaction });
    if (!grupo) return null;

    const categoria = await CategoriaActivo.findOne({
        include: [{
            model: Grupo,
            as: 'grupos',
            where: { id: grupo.id }
        }],
        transaction
    });
    if (!categoria) return null;
    
    return ModeloActivo.findOne({ where: { categoriaId: categoria.id }, transaction });
}

export async function POST(request) {
  const t = await sequelize.transaction(); // Iniciar transacción

  try {
    const body = await request.json();
    const { modeloActivoId, atributos_instancia, componentes_a_crear, ...coreData } = body;

    // 1. Crear el activo principal (el vehículo)
    const activoPrincipal = await Activo.create({
        ...coreData,
        modeloActivoId,
        atributos_instancia
    }, { transaction: t });

    // 2. Crear y enlazar los activos componentes
    if (componentes_a_crear && typeof componentes_a_crear === 'object') {
      for (const componentKey in componentes_a_crear) {
        const componentData = componentes_a_crear[componentKey];
        const { relatedGrupo, ...atributosComponente } = componentData;
        
        // Buscamos un ModeloActivo que corresponda al grupo del componente
        const modeloComponente = await findComponentModel(relatedGrupo, t);

        if (modeloComponente) {
            await Activo.create({
                nombre: `${relatedGrupo} de ${activoPrincipal.nombre}`,
                codigo: `COMP-${activoPrincipal.codigo}-${relatedGrupo}`, // Código autogenerado
                modeloActivoId: modeloComponente.id,
                parentId: activoPrincipal.id, // ¡Enlace automático!
                atributos_instancia: atributosComponente
            }, { transaction: t });
        }
      }
    }
    
    await t.commit(); // Si todo fue bien, confirmar la transacción
    return NextResponse.json(activoPrincipal, { status: 201 });

  } catch (error) {
    await t.rollback(); // Revertir todo si algo falló
    console.error("Error en la creación compuesta:", error);
    return NextResponse.json({ message: 'Error al crear el activo compuesto', error: error.message }, { status: 500 });
  }
}