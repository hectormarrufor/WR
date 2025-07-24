import { NextResponse } from 'next/server';
import { Vehiculo, ComponenteMayor, TipoVehiculo } from '../../../models'; // Asegúrate de importar TipoVehiculo

export async function GET() {
  try {
    const vehiculosPromise = Vehiculo.findAll({
      order: [['marca', 'ASC']],
      // --- CORRECCIÓN AQUÍ ---
      // Como no hay un alias 'as', incluimos el modelo directamente.
      // Sequelize es lo suficientemente inteligente para usar la asociación existente.
      include: [{
        model: TipoVehiculo, // Usamos el nombre del modelo
        attributes: ['value']
      }]
    });

    const componentesPromise = ComponenteMayor.findAll({
      order: [['marca', 'ASC']],
    });

    const [vehiculos, componentes] = await Promise.all([vehiculosPromise, componentesPromise]);

    const activosVehiculos = vehiculos.map(v => ({
      id: v.id,
      tipo: 'Vehículo',
      // Sequelize añadirá el objeto bajo el nombre del modelo en camelCase por defecto
      subtipo: v.TipoVehiculo?.nombre || 'No especificado', 
      identificador: v.placa,
      descripcion: `${v.marca} ${v.modelo}`,
      estado: v.estadoOperativoGeneral,
      urlDetalle: `/superuser/flota/activos/vehiculos/${v.id}` 
    }));

    const activosComponentes = componentes.map(c => ({
      id: c.id,
      tipo: 'Componente Mayor',
      subtipo: c.tipoComponente,
      identificador: c.serial,
      descripcion: `${c.marca} ${c.modelo}`,
      estado: 'Operativo',
      urlDetalle: `/superuser/flota/activos/componentes/${c.id}`
    }));

    const inventarioCompleto = [...activosVehiculos, ...activosComponentes];
    inventarioCompleto.sort((a, b) => a.descripcion.localeCompare(b.descripcion));

    return NextResponse.json(inventarioCompleto);

  } catch (error) {
    console.error('Error al obtener el inventario de activos:', error);
    return NextResponse.json({ message: 'Error interno del servidor', error: error.message }, { status: 500 });
  }
}