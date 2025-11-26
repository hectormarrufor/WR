import { NextResponse } from 'next/server';
import db from '../../../../../models';
import sequelize from '@/sequelize';

export async function GET(request, { params }) {
  const { id } = await params;
  try {
    const empleado = await db.Empleado.findByPk(id, {
      include: [
        { model: db.Puesto, as: 'puestos', through: { attributes: [] } },
        // Puedes añadir más inclusiones aquí si el empleado está asociado a Mantenimientos, Operaciones, etc.
        // { model: db.Mantenimiento, as: 'mantenimientosCreados' },
        // { model: db.OperacionCampo, as: 'operacionesSupervisadas' },
      ],
    });

    if (!empleado) {
      return NextResponse.json({ message: 'Empleado no encontrado' }, { status: 404 });
    }

    return NextResponse.json(empleado);
  } catch (error) {
    console.error('Error fetching employee:', error);
    return NextResponse.json({ message: 'Error al obtener empleado', error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const { id } = await params;
  const body = await request.json();
  const t = await sequelize.transaction();

  try {
    // 1. Actualizar datos básicos del empleado
    await db.Empleado.update(
      {
        nombre: body.nombre,
        apellido: body.apellido,
        cedula: body.cedula,
        fechaNacimiento: body.fechaNacimiento,
        fechaIngreso: body.fechaIngreso,
        sueldo: body.sueldo,
        telefono:body.telefono,
        direccion: body.direccion,
        estado: body.estado,
        imagen: body.imagen,

      },
      { where: { id }, transaction: t }
    );

    // 2. Borrar relaciones actuales de puestos
    await db.EmpleadoPuesto.destroy({
      where: { empleadoId: id },
      transaction: t,
    });

    // 3. Insertar nuevas relaciones
    if (body.puestos && Array.isArray(body.puestos)) {
      const nuevasRelaciones = body.puestos.map((puestoId) => ({
        empleadoId: id,
        puestoId,
      }));

      await db.EmpleadoPuesto.bulkCreate(nuevasRelaciones, { transaction: t });
    }

    // 4. Confirmar transacción
    await t.commit();

    return NextResponse.json({ message: 'Empleado actualizado con puestos' });
  } catch (error) {
    await t.rollback();
    console.error(error);
    return NextResponse.json(
      { message: 'Error al actualizar empleado', error: error.message },
      { status: 500 }
    );
  }

}

export async function DELETE(request, { params }) {
  const { id } = await params;
  try {
    const empleado = await db.Empleado.findByPk(id);

    if (!empleado) {
      return NextResponse.json({ message: 'Empleado no encontrado' }, { status: 404 });
    }

    // Considera una eliminación lógica (cambiar estado a 'Inactivo') en lugar de física
    // await empleado.update({ estado: 'Inactivo' }); // Asumiendo que tienes un campo 'estado'
    // O para eliminación física:
    // Eliminar asociaciones many-to-many (por ejemplo puestos) si existen

    if (typeof empleado.setPuestos === 'function') {
      await empleado.setPuestos([]);
    }

    // Eliminar o desvincular registros que referencian al empleado en otras tablas
    const deletes = [];

    // Lista de modelos relacionados a revisar
    const relatedModels = [
      { model: db.Mantenimiento, name: 'Mantenimiento' },
      { model: db.OperacionCampo, name: 'OperacionCampo' },
    ].filter(item => item.model);

    // Intenta obtener el nombre de la FK desde las asociaciones del modelo
    function getForeignKey(model) {
      if (!model || !model.associations) return null;
      for (const assoc of Object.values(model.associations)) {
        if (assoc.target === db.Empleado || assoc.source === db.Empleado) {
          return assoc.foreignKey || assoc.foreignKeyAttribute || assoc.identifierField || null;
        }
      }
      return null;
    }

    for (const { model, name } of relatedModels) {
      try {
        // intenta primero la FK desde la asociación
        let fk = getForeignKey(model);

        // si no existe, intenta nombres comunes como respaldo
        if (!fk && model.rawAttributes) {
          const candidates = ['empleadoId', 'EmpleadoId', 'empleado_id', 'id_empleado', 'creadorId'];
          fk = candidates.find(c => Object.prototype.hasOwnProperty.call(model.rawAttributes, c));
        }

        // si aún no hay fk válida, omitir este modelo
        if (!fk) {
          console.warn(`No se encontró FK en ${name} para empleado; se omite borrado de registros relacionados.`);
          continue;
        }

        const where = {};
        where[fk] = id;
        deletes.push(model.destroy({ where }));
      } catch (e) {
        // Ignorar errores puntuales (tabla/columna ausente u otros) para no abortar todo el proceso
        console.warn(`Ocurrió un error al eliminar registros relacionados en ${name}:`, e.message);
      }
    }

    if (deletes.length) await Promise.all(deletes);
    await empleado.destroy();

    return NextResponse.json({ message: 'Empleado eliminado (o inactivado) exitosamente' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting employee:', error);
    return NextResponse.json({ message: 'Error al eliminar empleado', error: error.message }, { status: 500 });
  }
}