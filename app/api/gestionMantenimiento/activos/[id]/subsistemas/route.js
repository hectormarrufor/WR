import { NextResponse } from 'next/server';
import db from '@/models';

export async function POST(req, { params }) {
    const { id } = await params;
    
    try {
        const body = await req.json();
        // Recibimos los datos. Puede venir subsistemaId (existente) o nuevoNombre/nuevaCategoria (nuevo)
        const { subsistemaId, nuevoNombre, nuevaCategoria } = body; 

        // Traemos el activo completo para saber a qué plantilla pertenece (Vehiculo, Remolque o Maquina)
        const activo = await db.Activo.findByPk(id, {
            include: [
                { model: db.VehiculoInstancia, as: 'vehiculoInstancia' },
                { model: db.RemolqueInstancia, as: 'remolqueInstancia' },
                { model: db.MaquinaInstancia, as: 'maquinaInstancia' }
            ]
        });

        if (!activo) throw new Error("Activo no encontrado");

        let targetSubId = subsistemaId;
        let nombreInstancia = '';

        // 🔥 ESCENARIO A: EL USUARIO ESTÁ CREANDO UN SUBSISTEMA DESDE CERO 🔥
        if (nuevoNombre && nuevaCategoria) {
            // Identificamos el ID de la plantilla maestra a la que pertenece este activo
            let templateData = {};
            if (activo.vehiculoInstancia) templateData.vehiculoId = activo.vehiculoInstancia.vehiculoId;
            else if (activo.remolqueInstancia) templateData.remolqueId = activo.remolqueInstancia.remolqueId;
            else if (activo.maquinaInstancia) templateData.maquinaId = activo.maquinaInstancia.maquinaId;

            // Creamos el subsistema en la plantilla maestra (Así los demás camiones iguales ya lo tendrán)
            const nuevoSubMaestro = await db.Subsistema.create({
                nombre: nuevoNombre,
                categoria: nuevaCategoria,
                ...templateData
            });

            targetSubId = nuevoSubMaestro.id;
            nombreInstancia = nuevoSubMaestro.nombre;
        } 
        // 🔥 ESCENARIO B: EL SUBSISTEMA YA EXISTÍA EN LA PLANTILLA 🔥
        else {
            const plantillaSub = await db.Subsistema.findByPk(subsistemaId);
            if (!plantillaSub) throw new Error('Plantilla de subsistema no encontrada');
            nombreInstancia = plantillaSub.nombre;
        }

        // 2. Verificamos que no se lo hayan instalado ya a ESTE camión específico (evita duplicados)
        const existe = await db.SubsistemaInstancia.findOne({
            where: { activoId: id, subsistemaId: targetSubId }
        });

        if (existe) throw new Error(`El subsistema "${nombreInstancia}" ya está habilitado en este equipo.`);

        // 3. Creamos la instancia en el camión
        const nuevaInstancia = await db.SubsistemaInstancia.create({
            nombre: nombreInstancia,
            activoId: id,
            subsistemaId: targetSubId
        });

        return NextResponse.json({ success: true, data: nuevaInstancia });
    } catch (error) {
        console.error("Error creando subsistema:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}