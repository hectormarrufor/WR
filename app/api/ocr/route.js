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
    
    // Gemini 2.5 Flash es rapidísimo y excelente para esto
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
      Analiza esta imagen de un documento legal o administrativo venezolano (Puede ser de Recursos Humanos, Flota Vehicular o Inmuebles).
      
      Tareas:
      1. Identifica el TIPO de documento, debes elegir ESTRICTAMENTE una de estas opciones: 
         "Cedula", "Licencia", "CertificadoMedico", "RIF", "Documento de Propiedad", "Cedula Catastral", "Permiso de Bomberos", "Derecho de Frente", "Solvencia de Aseo", "Solvencia Municipal", "Solvencia de Servicios Publicos", "RACDA", "RUNSAI", "DAEX", "Poliza de Seguro", "Trimestres Municipales", "ROC", "Otro".
         - Reglas de clasificación:
           * Carnet de Circulación INTT o Certificado de Registro de Vehículo -> "Documento de Propiedad"
           * Cuadro Póliza de Seguros / RCV -> "Poliza de Seguro"
           * Registro de Operadoras de Transporte de Carga -> "ROC"
           * Permisos del MinEc para desechos -> "RACDA"
           * Permisos del INSAI para agro/alimentos -> "RUNSAI"
           * Armas, explosivos o químicos controlados -> "DAEX"

      2. Si es Licencia o Certificado Médico, identifica el GRADO numérico (1, 2, 3, 4, 5). 
         - Ejemplo: "Quinto Grado" -> "5". "3ra" -> "3". Si no aplica, devuelve null.

      3. Extrae la FECHA DE VENCIMIENTO (Formato YYYY-MM-DD):
         - Si es la cédula: el primer dia del mes siguiente a su vencimiento, a menos que tenga el día exacto.
         - Si el documento NO TIENE fecha de vencimiento (Ej: "Documento de Propiedad" o "Cedula Catastral"), debes devolver null.

      4. Extrae el NÚMERO DE DOCUMENTO o REFERENCIA:
         - Si es Cédula: número sin puntos, ni guiones, ni la letra V.
         - Si es RIF: formato completo (Ej: J-12345678-9 o V-12345678-0).
         - Si es Documento de Propiedad (Vehículo): Extrae la PLACA. Si no hay placa, extrae el SERIAL DE CARROCERÍA.
         - Si es Póliza, ROC, RACDA, RUNSAI o DAEX: Extrae el número de certificado, póliza o registro principal.
      
      Responde SOLO este JSON válido:
      {
        "tipo": "string",
        "numeroDocumento": "string" | null,
        "fechaVencimiento": "YYYY-MM-DD" | null,
        "gradoLicencia": "string" | null
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