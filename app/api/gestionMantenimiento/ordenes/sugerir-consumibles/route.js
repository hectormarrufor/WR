import db from '@/models';
import { NextResponse } from 'next/server';
import { Op } from 'sequelize';

// Función recursiva para buscar profundamente en un objeto de especificaciones.
const findSpecsRecursively = (specsObject, keyword) => {
    let results = [];
    // Nos aseguramos de que siempre trabajemos con un array de atributos.
    const specArray = Array.isArray(specsObject) ? specsObject : Object.values(specsObject);

    for (const attr of specArray) {
        // Salto de seguridad por si hay un atributo nulo o sin 'label'.
        if (!attr || !attr.label) continue;

        // Si el label del atributo actual contiene la palabra clave, lo añadimos.
        if (attr.label.toLowerCase().includes(keyword)) {
            results.push(attr);
        }

        // Búsqueda recursiva en 'definicion' (para atributos de tipo 'object').
        if (attr.definicion) {
            results = [...results, ...findSpecsRecursively(attr.definicion, keyword)];
        }
        // Búsqueda recursiva en 'componente.especificaciones' (para atributos de tipo 'grupo').
        if (attr.componente?.especificaciones) {
            results = [...results, ...findSpecsRecursively(attr.componente.especificaciones, keyword)];
        }
    }
    return results;
};

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const activoId = searchParams.get('activoId');
    const descripcion = searchParams.get('descripcion')?.toLowerCase();
    console.log(process.env.NEXT_PUBLIC_BASE_URL)
    if (!activoId || !descripcion) {
        return NextResponse.json({ message: 'activoId y descripcion son requeridos' }, { status: 400 });
    }

    try {
        // Obtenemos el activo con su modelo y la jerarquía de componentes ya poblada.
        const activoResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/gestionMantenimiento/activos/${activoId}`);
        if (!activoResponse.ok) throw new Error('Activo no encontrado');
        const activo = await activoResponse.json();

        const especificaciones = activo.modelo.especificaciones;
        let sugerencias = [];

        // --- LÓGICA DE BÚSQUEDA INTELIGENTE ---

        // CASO 1: La tarea es sobre "aceite"
        if (descripcion.includes('aceite')) {
            const specAceite = findSpecsRecursively(especificaciones, 'aceite')[0];
            console.log("Especificación de aceite encontrada:", specAceite);
            // Si encontramos una especificación de aceite, buscamos los consumibles relacionados.

            if (specAceite?.definicion) {
                // Extraemos los detalles del objeto 'aceite' que encontramos.
                const tipo = specAceite.definicion.tipoAceite?.defaultValue;
                const viscosidad = specAceite.definicion.viscosidad?.defaultValue;
                const cantidad = specAceite.definicion.litros?.defaultValue || 'No definido';

                if (tipo && viscosidad) {
                    const consumibles = await db.Consumible.findAll({
                        where: { tipo: 'Aceite', especificaciones: { tipoAceite: tipo, viscosidad: viscosidad } }
                    });
                    sugerencias.push({
                        tarea: 'Suministro de Aceite',
                        cantidadRequerida: cantidad,
                        opciones: consumibles
                    });
                }
            }
        }

        // CASO 2: La tarea es sobre "filtro"
        if (descripcion.includes('filtro')) {
            // Buscamos TODOS los atributos que sean filtros (de aceite, de aire, etc.)
            const specsFiltros = findSpecsRecursively(especificaciones, 'filtro');

            for (const filtro of specsFiltros) {
                // `selectOptions` contiene los códigos de filtros compatibles definidos en el Modelo.
                const codigosCompatibles = filtro.selectOptions;
                if (codigosCompatibles && codigosCompatibles.length > 0) {
                    // Buscamos en el inventario los consumibles cuyo SKU o nombre coincida.
                    const consumibles = await db.Consumible.findAll({
                        where: {
                            tipo: 'Filtro',
                            [Op.or]: [
                                { sku: { [Op.in]: codigosCompatibles } },
                                { nombre: { [Op.in]: codigosCompatibles } }
                            ]
                        }
                    });
                    sugerencias.push({
                        tarea: `Suministro para "${filtro.label}"`,
                        cantidadRequerida: 1, // Asumimos 1 por defecto para filtros
                        opciones: consumibles
                    });
                }
            }
        }

        // CASO 3: La tarea es sobre "correa"
        if (descripcion.includes('correa')) {
            const specsCorrea = findSpecsRecursively(especificaciones, 'correa');
            for (const correa of specsCorrea) {
                const codigosCompatibles = correa.selectOptions;
                if (codigosCompatibles && codigosCompatibles.length > 0) {
                    const consumibles = await db.Consumible.findAll({
                        where: {
                            tipo: 'Correa',
                            [Op.or]: [
                                { sku: { [Op.in]: codigosCompatibles } },
                                { nombre: { [Op.in]: codigosCompatibles } }
                            ]
                        }
                    });
                    sugerencias.push({
                        tarea: `Suministro para "${correa.label}"`,
                        cantidadRequerida: 1,
                        opciones: consumibles
                    });
                }
            }
        }

        // CASO 4: La tarea es sobre "bujía"
        if (descripcion.includes('bujia') || descripcion.includes('bujias') || descripcion.includes('bujías') || descripcion.includes('bujía')) {
            const specsBujia = findSpecsRecursively(especificaciones, 'bujia');
            for (const bujia of specsBujia) {
                const codigosCompatibles = bujia.selectOptions;
                if (codigosCompatibles && codigosCompatibles.length > 0) {
                    const consumibles = await db.Consumible.findAll({
                        where: {
                            tipo: 'Bujía',
                            [Op.or]: [
                                { sku: { [Op.in]: codigosCompatibles } },
                                { nombre: { [Op.in]: codigosCompatibles } }
                            ]
                        }
                    });
                    sugerencias.push({
                        tarea: `Suministro para "${bujia.label}"`,
                        cantidadRequerida: 1,
                        opciones: consumibles
                    });
                }
            }
        }

        return NextResponse.json(sugerencias);

    } catch (error) {
        console.error("Error al sugerir consumibles:", error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}