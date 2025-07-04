import Stone from '../../../../models/vehiculoPesado';
import sequelize from '../../../../sequelize';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const piedra = await Stone.findByPk(id);
    if (!piedra) {
      return Response.json({ error: 'piedra no encontrado' }, { status: 404 });
    }
    return Response.json(piedra);
  } catch (error) {
    console.error(`Error al obtener piedra ${id}:`, error);
    return Response.json({ error: 'Error al obtener piedra' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const piedraActualizado = await request.json();
    console.log(id, piedraActualizado)
    const piedra = await Stone.findByPk(id);
    if (!piedra) {
      return Response.json({ error: 'piedra no encontrado' }, { status: 404 });
    }
    await piedra.update(piedraActualizado);
    const piedraActualizadoBD = await Stone.findByPk(id);
    return Response.json(piedraActualizadoBD);
  } catch (error) {
    console.error(`Error al actualizar piedra ${id}:`, error);
    return Response.json({ error: 'Error al actualizar piedra' }, { status: 500 });
  }
}
  
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const piedra = await Stone.findByPk(id);
    if (!piedra) {
      return Response.json({ error: 'piedra no encontrado' }, { status: 404 });
    }
    await piedra.destroy();
    return Response.json({ message: 'piedra eliminado' });
  } catch (error) {
    console.error(`Error al eliminar piedra ${id}:`, error);
    return Response.json({ error: 'Error al eliminar piedra' }, { status: 500 });
  }
}