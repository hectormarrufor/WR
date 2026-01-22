// app/api/ocr/route.js
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) return NextResponse.json({ error: "Sin archivo" }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = buffer.toString("base64");
    
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
      Analiza esta imagen de un documento legal venezolano (Transporte/Identidad).
      
      Tareas:
      1. Identifica el TIPO: "Cedula", "RIF", "Licencia" o "CertificadoMedico".
      2. Si es Licencia o Certificado Médico, identifica el GRADO numérico (1, 2, 3, 4, 5). 
         - Ejemplo: "Quinto Grado" -> 5. "3ra" -> 3.
      3. Extrae la FECHA DE VENCIMIENTO (Formato YYYY-MM-DD) siendo el primer dia del mes siguiente a su vencimiento.
      4. Extrae el NÚMERO DE DOCUMENTO (Cédula o RIF).
         - Si es numero de cedula: responde numeroDocumento sin puntos ni guiones ni la V.
         - Si es RIF: responde numeroDocumento con el formato completo (Ej: J-12345678-9).
      
      Responde SOLO este JSON:
      {
        "tipo": "string",
        "numeroDocumento": "string",
        "fechaVencimiento": "YYYY-MM-DD" | null,
        "gradoLicencia": "string" (Ej: "1", "2", "3", "4", "5") | null
      }
    `;

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64Image, mimeType: file.type } },
    ]);

    const text = result.response.text().replace(/```json|```/g, "").trim();
    return NextResponse.json(JSON.parse(text));

  } catch (error) {
    console.error("OCR Error:", error);
    return NextResponse.json({ error: "Error procesando imagen" }, { status: 500 });
  }
}