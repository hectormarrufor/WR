import db from '@/models';
import { NextResponse } from 'next/server';
import { Op } from 'sequelize';

/**
 * Busca modelos que tengan un atributo cuyo 'selectOptions' (en el JSONB)
 * contenga el término de búsqueda proporcionado.
 */
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const searchTerm = searchParams.get('term');

    if (!searchTerm || searchTerm.trim().length < 3) {
        return NextResponse.json({ message: 'Se requiere un término de búsqueda de al menos 3 caracteres' }, { status: 400 });
    }

    try {
        // Obtenemos todos los modelos para procesarlos.
        // En una base de datos muy grande, esto podría optimizarse con funciones JSON de la BD.
        const todosLosModelos = await db.Modelo.findAll({
            attributes: ['id', 'nombre', 'especificaciones']
        });

        const compatibilidadesEncontradas = [];

        // Iteramos sobre cada modelo y sus especificaciones en el servidor.
        for (const modelo of todosLosModelos) {
            const especificaciones = modelo.especificaciones || {};

            function buscarEnEspecificaciones(specs) {
                for (const attrId in specs) {
                    const atributo = specs[attrId];
                    // Buscamos en los atributos que tienen opciones seleccionables
                    if (Array.isArray(atributo.selectOptions)) {
                        // Comprobamos si alguna de las opciones coincide (insensible a mayúsculas)
                        const tieneCoincidencia = atributo.selectOptions.some(
                            option => option.toLowerCase().includes(searchTerm.toLowerCase())
                        );

                        if (tieneCoincidencia) {
                            compatibilidadesEncontradas.push({
                                modeloId: modelo.id,
                                modeloNombre: modelo.nombre,
                                atributoId: atributo.id,
                                atributoLabel: atributo.label,
                            });
                        }
                    }

                    // Búsqueda recursiva para componentes anidados
                    if (atributo.componente?.especificaciones) {
                        buscarEnEspecificaciones(atributo.componente.especificaciones);
                    }
                    // Búsqueda recursiva para objetos anidados
                    if(atributo.dataType === 'object' && atributo.definicion) {
                        buscarEnEspecificaciones(atributo.definicion)
                    }
                }
            }

            buscarEnEspecificaciones(especificaciones);
        }
        
        // Eliminamos duplicados si un mismo modelo es encontrado varias veces
        const resultadosUnicos = Array.from(new Set(compatibilidadesEncontradas.map(c => JSON.stringify(c)))).map(s => JSON.parse(s));

        return NextResponse.json(resultadosUnicos);

    } catch (error) {
        console.error('Error al buscar compatibilidades:', error);
        return NextResponse.json({ message: 'Error en el servidor' }, { status: 500 });
    }
}