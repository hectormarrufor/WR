import { NextResponse } from 'next/server';
import Grupo from '../../../../../../models/gestionMantenimiento/Grupo';

// Función recursiva para construir el esqueleto anidado
const buildSchema = async (grupo, seen = new Set()) => {
    if (!grupo || !grupo.definicion_formulario || seen.has(grupo.nombre)) {
        return [];
    }
    seen.add(grupo.nombre);

    const atributos = grupo.definicion_formulario.atributos_especificos || [];
    const resolvedAtributos = [];

    for (const attr of atributos) {
        if (attr.type === 'relation' && attr.relatedGrupo) {
            const relatedGrupo = await Grupo.findOne({ where: { nombre: attr.relatedGrupo } });
            if (relatedGrupo) {
                // En lugar de una simple relación, incrustamos el esqueleto completo del grupo relacionado
                resolvedAtributos.push({
                    ...attr,
                    type: 'object', // Lo tratamos como un objeto anidado
                    isRelation: true, // Un marcador para saber que es una composición
                    schema: await buildSchema(relatedGrupo, new Set(seen)) // Pasamos una copia de 'seen'
                });
            }
        } else {
            resolvedAtributos.push(attr);
        }
    }
    return resolvedAtributos;
};

export async function GET(request, { params }) {
  try {
    const grupo = await Grupo.findOne({ where: { nombre: params.nombre } });
    if (!grupo) return NextResponse.json({ message: 'Grupo no encontrado' }, { status: 404 });
    const schema = await buildSchema(grupo);
    return NextResponse.json({ atributos_especificos: schema });
  } catch (error) {
    console.error('Error al construir el schema del grupo:', error);
    return NextResponse.json({ message: 'Error al construir el schema', error: error.message }, { status: 500 });
  }
}