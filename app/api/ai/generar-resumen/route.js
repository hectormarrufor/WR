import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(request) {
    try {
        const { observaciones } = await request.json();

        if (!observaciones || observaciones.length === 0) {
            return NextResponse.json({ resumen: "Sin actividad registrada." });
        }

        const apiKey = process.env.GOOGLE_API_KEY;
        const genAI = new GoogleGenerativeAI(apiKey);
        
        // Usamos el modelo rápido y económico que pediste
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
        Actúa como un Supervisor de Operaciones experto.
        Tengo una lista de reportes diarios de varios empleados en una planta industrial.
        
        Instrucciones:
        1. Analiza las siguientes observaciones.
        2. Genera un resumen ejecutivo ÚNICO, en TIEMPO PASADO, de máximo 15 palabras.
        3. Elimina redundancias (ej: si todos dicen "Limpieza", di "Jornada de limpieza general").
        4. No uses introducciones como "El resumen es". Ve directo al grano.
        
        Observaciones:
        ${observaciones.join("\n")}
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        return NextResponse.json({ resumen: text.replace(/\*/g, '').trim() });

    } catch (error) {
        console.error("Error Gemini:", error);
        return NextResponse.json({ resumen: "Mantenimiento general en planta." }, { status: 500 }); // Fallback
    }
}