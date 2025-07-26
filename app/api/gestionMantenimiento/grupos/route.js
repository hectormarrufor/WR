// app/api/gestionMantenimiento/grupos/route.js
import { NextResponse } from 'next/server';
import { Grupo } from '@/models';
import sequelize from '@/sequelize';

// --- LÓGICA DE CREACIÓN RECURSIVA CORREGIDA ---
async function crearGrupoRecursivo(grupoData, parentId = null, transaction) {
    // Desestructuramos para asegurar que usamos los datos del nivel actual
    const { nombre, definicion, subGrupos } = grupoData;

    // 1. Crear el grupo actual con su nombre correcto.
    const nuevoGrupo = await Grupo.create({
        nombre: nombre, // Usamos el 'nombre' del objeto actual, no el del padre.
        parentId: parentId,
        definicion: {} // La definición se rellena al final.
    }, { transaction });

    // 2. Copiamos la definición para poder modificarla.
    const definicionFinal = { ...definicion };

    // 3. Si hay sub-grupos, los creamos recursivamente.
    if (subGrupos && subGrupos.length > 0) {
        for (const subGrupo of subGrupos) {
            // Llamada recursiva, pasando el ID del grupo actual como padre.
            const subGrupoCreado = await crearGrupoRecursivo(subGrupo, nuevoGrupo.id, transaction);

            // Encontramos el atributo en la definición del padre que corresponde al sub-grupo.
            const atributoIdOriginal = Object.keys(definicionFinal).find(
                key => definicionFinal[key].tempKey === subGrupo.tempKey
            );

            // Actualizamos la definición del padre con el ID real del hijo.
            if (atributoIdOriginal) {
                definicionFinal[atributoIdOriginal].refId = subGrupoCreado.id;
                delete definicionFinal[atributoIdOriginal].tempKey; // Limpiamos la clave temporal.
            }
        }
    }

    // 4. Actualizamos el grupo actual con su definición completa y final.
    await nuevoGrupo.update({ definicion: definicionFinal }, { transaction });

    return nuevoGrupo;
}

export async function POST(request) {
    const t = await sequelize.transaction();
    try {
        const body = await request.json();
        await crearGrupoRecursivo(body, null, t);
        await t.commit();
        return NextResponse.json({ message: 'Grupo y sub-grupos creados exitosamente' }, { status: 201 });
    } catch (error) {
        await t.rollback();
        console.error('Error al crear el grupo:', error);
        if (error.name === 'SequelizeUniqueConstraintError') {
            const detail = error.parent?.detail || 'Un nombre de grupo ya existe.';
            return NextResponse.json({ error: `Conflicto de unicidad: ${detail}` }, { status: 409 });
        }
        return NextResponse.json({ error: 'Error al crear el grupo', details: error.message }, { status: 500 });
    }
}

export async function GET() {
     try {
        // Obtenemos TODOS los grupos, sin filtrar por parentId
        const grupos = await Grupo.findAll({
            order: [['nombre', 'ASC']],
            // Incluimos la asociación con el modelo padre para obtener su nombre
            include: [{
                model: Grupo,
                as: 'parent',
                attributes: ['id', 'nombre'], // Solo traemos los atributos que necesitamos del padre
            }],
        });
        return NextResponse.json(grupos);
    } catch (error) {
        console.error('Error al obtener los grupos:', error);
        return NextResponse.json({ error: 'Error al obtener los grupos', details: error.message }, { status: 500 });
    }
}