import db from '@/models';
import { NextResponse } from 'next/server';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const modeloId = searchParams.get('modeloId'); // El parámetro ahora es 'modeloId'

    if (!modeloId) {
        return NextResponse.json({ message: 'El ID del modelo es requerido' }, { status: 400 });
    }

    try {
        // ✨ --- INICIO DE LA CORRECCIÓN --- ✨
        // 1. Buscamos el modelo seleccionado para encontrar su categoría.
        const modelo = await db.Modelo.findByPk(modeloId, {
            include: [{
                model: db.Categoria,
                as: 'categoria',
                attributes: ['id', 'acronimo'] // Traemos el ID y el acrónimo de la categoría
            }]
        });

        console.log("MODELOOOOO: ", modelo);

        if (!modelo || !modelo.categoria) {
            throw new Error(`El modelo con ID ${modeloId} no fue encontrado o no tiene una categoría asociada.`);
        }
        
        const categoria = modelo.categoria;
        const acronimo = categoria.acronimo?.toUpperCase();
        console.log("CATEGORIA: ", categoria);
        if (!acronimo) {
            throw new Error(`La categoría "${categoria.nombre}" no tiene un acrónimo definido.`);
        }
        // ✨ --- FIN DE LA CORRECCIÓN --- ✨

        // 2. Contamos cuántos activos existen ya para esa categoría específica.
        const count = await db.Activo.count({
            include: [{
                model: db.Modelo,
                as: 'modelo',
                where: { categoriaId: categoria.id },
                attributes: []
            }]
        });

        // 3. Calculamos el siguiente número correlativo.
        const nextNumber = count + 1;
        const correlativo = nextNumber.toString().padStart(4, '0');

        // 4. Construimos y devolvemos el código final.
        const nuevoCodigo = `WRWS-${acronimo}-${correlativo}`;

        return NextResponse.json({ nextCode: nuevoCodigo });

    } catch (error) {
        console.error("Error al generar el siguiente código de activo:", error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}