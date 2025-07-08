import Vehiculo from '../../../../models/vehiculo';
import sequelize from '../../../../sequelize';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const vehiculo = await Vehiculo.findByPk(id);
    if (!vehiculo) {
      return Response.json({ error: 'vehiculo no encontrado' }, { status: 404 });
    }
    return Response.json(vehiculo);
  } catch (error) {
    console.error(`Error al obtener vehiculo ${id}:`, error);
    return Response.json({ error: 'Error al obtener vehiculo' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const vehiculoActualizado = await request.json();
    console.log(id, vehiculoActualizado)
    const vehiculo = await Vehiculo.findByPk(id);
    if (!vehiculo) {
      return Response.json({ error: 'vehiculo no encontrado' }, { status: 404 });
    }
    await vehiculo.update(vehiculoActualizado);
    const vehiculoActualizadoBD = await Vehiculo.findByPk(id);
    return Response.json(vehiculoActualizadoBD);
  } catch (error) {
    console.error(`Error al actualizar vehiculo ${id}:`, error);
    return Response.json({ error: 'Error al actualizar vehiculo' }, { status: 500 });
  }
}
  
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const vehiculo = await Vehiculo.findByPk(id);
    if (!vehiculo) {
      return Response.json({ error: 'vehiculo no encontrado' }, { status: 404 });
    }
    await vehiculo.destroy();
    return Response.json({ message: 'vehiculo eliminado' });
  } catch (error) {
    console.error(`Error al eliminar vehiculo ${id}:`, error);
    return Response.json({ error: 'Error al eliminar vehiculo' }, { status: 500 });
  }
}