import { NextResponse } from 'next/server';
import { EquipoEspecial, FichaTecnicaEquipoEspecial } from '../../../../../models';
// UNICAMENTE importa el modelo de EquipoEspecial

export async function GET(request, { params }) {
  const { tipoEquipo } = await params;

  try {
    // Busca el ÚLTIMO equipo especial del tipo especificado
    const ultimoEquipo = await EquipoEspecial.findOne({
      where: { tipoEquipo },
      order: [['createdAt', 'DESC']],
      include: [{model: FichaTecnicaEquipoEspecial, as: "fichaTecnica"}]
     
    });

    if (!ultimoEquipo || !ultimoEquipo.fichaTecnica.propiedades) {
      // Si no encuentra ninguno, devuelve un objeto vacío para empezar de cero
      return NextResponse.json({});
    }

    // Devuelve la estructura de especificaciones del último equipo para usarla como plantilla
    return NextResponse.json(ultimoEquipo.fichaTecnica.propiedades);
  } catch (error) {
    console.error(`Error al obtener plantilla para ${tipoEquipo}:`, error);
    return NextResponse.json(
      { message: 'Error interno del servidor al obtener la plantilla de especificaciones.', details: error.message },
      { status: 500 }
    );
  }
}