import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import db from '@/models';
import crypto from 'crypto'; // 1. Importamos librería nativa de criptografía

export async function POST(request) {
    try {
        const { observaciones, fecha } = await request.json();

        if (!fecha) return NextResponse.json({ error: "Fecha requerida" }, { status: 400 });
        if (!observaciones || observaciones.length === 0) return NextResponse.json({ resumen: "Sin actividad." });

        const fechaKey = new Date(fecha).toISOString().split('T')[0];

        // ---------------------------------------------------------
        // 2. GENERAR HUELLA DIGITAL (HASH) DE LOS DATOS ENTRANTES
        // ---------------------------------------------------------
        // Convertimos el array de observaciones a un string único y creamos su firma
        // Si cambia una sola letra en una observación, este hash cambiará totalmente.
        const stringData = JSON.stringify(observaciones.sort()); // Ordenamos para que el orden no afecte
        const incomingHash = crypto.createHash('md5').update(stringData).digest('hex');

        // ---------------------------------------------------------
        // 3. ESTRATEGIA DE CACHÉ INTELIGENTE (INVALIDACIÓN)
        // ---------------------------------------------------------
        
        // Buscamos si existe registro
        let registroDB = await db.ResumenDiario.findOne({ where: { fecha: fechaKey } });

        // VERIFICACIÓN:
        // Si existe Y el hash guardado es IGUAL al hash nuevo -> Retornamos caché (Ahorro)
        if (registroDB && registroDB.hashContenido === incomingHash) {
            console.log(`[AI-CACHE] Hit válido para ${fechaKey}`);
            return NextResponse.json({ resumen: registroDB.contenido, source: 'cache' });
        }

        if (registroDB) {
            console.log(`[AI-CACHE] Stale (Obsoleto) para ${fechaKey}. Regenerando...`);
        } else {
            console.log(`[AI-LIVE] Nuevo registro para ${fechaKey}`);
        }

        // ---------------------------------------------------------
        // 4. LLAMADA A GEMINI (Si no existe o si cambió el hash)
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

        // 5. GUARDAR O ACTUALIZAR (UPSERT)
        // Si ya existía el registro (pero el hash era viejo), actualizamos. Si no, creamos.
        if (registroDB) {
            registroDB.contenido = textoIA;
            registroDB.hashContenido = incomingHash;
            await registroDB.save();
        } else {
            await db.ResumenDiario.create({
                fecha: fechaKey,
                contenido: textoIA,
                hashContenido: incomingHash
            });
        }

        return NextResponse.json({ resumen: textoIA, source: 'api-updated' });

    } catch (error) {
        console.error("Error Gemini/DB:", error);
        if (error.message?.includes('429') || error.status === 429) {
             return NextResponse.json({ resumen: "Cuota IA excedida." }, { status: 429 });
        }
        return NextResponse.json({ resumen: "Operaciones en planta." }, { status: 500 });
    }
}