import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import db from '@/models'; // Asegúrate de que esto apunta a tu index de modelos

export async function POST(request) {
    try {
        const { observaciones, fecha } = await request.json();

        // 1. Validaciones
        if (!fecha) {
            return NextResponse.json({ error: "Fecha es requerida" }, { status: 400 });
        }
        
        // Formateamos la fecha para asegurar consistencia (YYYY-MM-DD)
        // Cortamos el string ISO para quedarnos solo con la fecha
        const fechaKey = new Date(fecha).toISOString().split('T')[0];

        // ---------------------------------------------------------
        // 2. ESTRATEGIA DE CACHÉ (AHORRO DE DINERO)
        // ---------------------------------------------------------
        
        // A. Buscamos si ya existe en DB
        const resumenGuardado = await db.ResumenDiario.findOne({
            where: { fecha: fechaKey }
        });

        // B. Si existe, lo devolvemos y NO tocamos la API de Google
        if (resumenGuardado) {
            // (Opcional) Si hay muchas más observaciones nuevas que antes, podríamos regenerar,
            // pero para ahorrar al máximo, devolvemos lo guardado siempre.
            return NextResponse.json({ resumen: resumenGuardado.contenido, source: 'cache' });
        }

        // C. Si no hay observaciones, no gastamos IA, guardamos un default
        if (!observaciones || observaciones.length === 0) {
             return NextResponse.json({ resumen: "Sin actividad registrada." });
        }

        // ---------------------------------------------------------
        // 3. LLAMADA A GEMINI (SOLO SI NO ESTABA EN CACHÉ)
        // ---------------------------------------------------------
        const apiKey = process.env.GOOGLE_API_KEY;
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
        Actúa como Supervisor de Operaciones.
        Resume estas actividades diarias de planta en una frase corta, profesional y en pasado (máximo 15 palabras).
        Actividades:
        ${observaciones.join("\n")}
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const textoIA = response.text().replace(/\*/g, '').trim();

        // 4. GUARDAR EN BASE DE DATOS PARA EL FUTURO
        try {
            await db.ResumenDiario.create({
                fecha: fechaKey,
                contenido: textoIA,
                cantidadRegistros: observaciones.length
            });
        } catch (dbError) {
            // Si falla el guardado (ej: condición de carrera), no rompemos la respuesta
            console.error("Error guardando caché:", dbError);
        }

        return NextResponse.json({ resumen: textoIA, source: 'api' });

    } catch (error) {
        console.error("Error Gemini/DB:", error);
        
        // Si es error de cuota (429), devolvemos un mensaje amigable
        if (error.message?.includes('429') || error.status === 429) {
             return NextResponse.json({ resumen: "Cuota diaria excedida (IA)." }, { status: 429 });
        }

        return NextResponse.json({ resumen: "Operaciones en planta." }, { status: 500 });
    }
}