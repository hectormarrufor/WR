// src/app/api/gestionMantenimiento/grupos/export/route.js

import db from '@/models';
import { NextResponse } from 'next/server';

/**
 * Función recursiva para construir el árbol completo de un grupo.
 * @param {number} grupoId - El ID del grupo a exportar.
 * @returns {Promise<object>} El objeto del grupo con sus subgrupos anidados.
 */
async function fetchGrupoConJerarquia(grupoId) {
    const grupo = await db.Grupo.findByPk(grupoId, {
        attributes: { exclude: ['createdAt', 'updatedAt', 'parentId'] }
    });

    if (!grupo) return null;

    const plainGrupo = grupo.toJSON();
    const subGruposAnidados = {};

    // 1. Encontrar todos los hijos directos del grupo actual
    const subGruposHijos = await db.Grupo.findAll({ 
      where: { parentId: grupoId },
      attributes: ['id', 'nombre', 'definicion', 'createdAt', 'updatedAt']
    });

    // 2. Procesar cada subgrupo hijo recursivamente
    for (const subGrupo of subGruposHijos) {
      const subGrupoCompleto = await fetchGrupoConJerarquia(subGrupo.id);
      if (subGrupoCompleto) {
        subGruposAnidados[subGrupo.id] = subGrupoCompleto;
      }
    }

    // 3. Reconstruir la definición del grupo padre para anidar los hijos
    const definicionFinal = { ...plainGrupo.definicion };
    for (const key in definicionFinal) {
      const atributo = definicionFinal[key];
      // Si el atributo es de tipo 'grupo' y tiene un 'refId' que coincide con un hijo,
      // anidamos el objeto completo del subgrupo.
      if (atributo.dataType === 'grupo' && atributo.refId && subGruposAnidados[atributo.refId]) {
        atributo.subGrupo = subGruposAnidados[atributo.refId];
        atributo.mode = 'define'; // Aseguramos que el modo sea 'define' para que se renderice correctamente en el frontend.
      }
    }
    
    // Eliminamos la propiedad de subgrupos planos ya que ahora están anidados
    delete plainGrupo.subGrupos;

    // Actualizamos la definición del grupo principal con la estructura anidada
    plainGrupo.definicion = definicionFinal;

    return plainGrupo;
}


export async function GET(request, { params }) {
    const { id } = params;

    try {
        const grupoCompleto = await fetchGrupoConJerarquia(id);

        if (!grupoCompleto) {
            return NextResponse.json({ message: 'Grupo no encontrado' }, { status: 404 });
        }

        const jsonString = JSON.stringify(grupoCompleto, null, 2);
        const headers = new Headers();
        headers.set('Content-Type', 'application/json');
        headers.set('Content-Disposition', `attachment; filename="grupo_${grupoCompleto.nombre.toLowerCase()}_${id}.json"`);

        return new Response(jsonString, { headers });

    } catch (error) {
        console.error("Error al exportar el grupo:", error);
        return NextResponse.json({ message: 'Error en el servidor' }, { status: 500 });
    }
}