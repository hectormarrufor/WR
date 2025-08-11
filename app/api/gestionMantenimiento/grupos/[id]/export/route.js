import db from '@/models';
import { NextResponse } from 'next/server';

// Función recursiva para construir el árbol completo de un grupo
async function fetchGrupoConJerarquia(grupoId) {
    const grupo = await db.Grupo.findByPk(grupoId, {
        // Excluimos metadatos innecesarios para un export limpio
        attributes: { exclude: ['createdAt', 'updatedAt', 'parentId'] }
    });

    if (!grupo) return null;

    const subGrupos = await db.Grupo.findAll({ where: { parentId: grupoId } });

    const plainGrupo = grupo.toJSON();
    plainGrupo.subGrupos = [];

    for (const subGrupo of subGrupos) {
        // Llamada recursiva para cada hijo
        const subGrupoCompleto = await fetchGrupoConJerarquia(subGrupo.id);
        if (subGrupoCompleto) {
            plainGrupo.subGrupos.push(subGrupoCompleto);
        }
    }

    return plainGrupo;
}


export async function GET(request, { params }) {
    const { id } = await params;

    try {
        const grupoCompleto = await fetchGrupoConJerarquia(id);

        if (!grupoCompleto) {
            return NextResponse.json({ message: 'Grupo no encontrado' }, { status: 404 });
        }

        // Preparamos el archivo JSON para la descarga
        const jsonString = JSON.stringify(grupoCompleto, null, 2);
        const headers = new Headers();
        headers.set('Content-Type', 'application/json');
        // Este header le dice al navegador que descargue el archivo
        headers.set('Content-Disposition', `attachment; filename="grupo_${grupoCompleto.nombre.toLowerCase()}_${id}.json"`);

        return new Response(jsonString, { headers });

    } catch (error) {
        console.error("Error al exportar el grupo:", error);
        return NextResponse.json({ message: 'Error en el servidor' }, { status: 500 });
    }
}