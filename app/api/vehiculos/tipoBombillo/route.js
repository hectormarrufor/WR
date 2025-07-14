import {TipoBombillo} from "../../../../models";

export async function GET() {
    try {
        const tipos = await TipoBombillo.findAll();
        return Response.json(tipos);
    } catch (error) {
        console.error("Error al obtener los bombillos: ", error.message)
        throw new Error ('error al obtener los bombillos: ', error.message)
    }
}

export async function POST(request) {
    
    const { tipo } = await request.json();
    console.log(tipo);
    
    try {
        const nuevo = await TipoBombillo.create({ tipo });
        return Response.json(nuevo)
    } catch (err) {
        console.error('error al crear bombillo: ', err.message);
        throw new Error ('error al crear bombillo: ', err.message)
    }
}
