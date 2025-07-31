import { NextResponse } from 'next/server';
import db from '../../../../../models';

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
  try {
    const body = await request.json();
    const empleado = await db.Empleado.findByPk(id);

    if (!empleado) {
      return NextResponse.json({ message: 'Empleado no encontrado' }, { status: 404 });
    }

    await empleado.update(body);
    return NextResponse.json(empleado);
  } catch (error) {
    console.error('Error updating employee:', error);
    return NextResponse.json({ message: 'Error al actualizar empleado', error: error.message }, { status: 400 });
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
    await empleado.update({ estado: 'Inactivo' }); // Asumiendo que tienes un campo 'estado'
    // O para eliminación física:
    // await empleado.destroy();

    return NextResponse.json({ message: 'Empleado eliminado (o inactivado) exitosamente' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting employee:', error);
    return NextResponse.json({ message: 'Error al eliminar empleado', error: error.message }, { status: 500 });
  }
}