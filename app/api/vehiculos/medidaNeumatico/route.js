import MedidaNeumatico from "../../../../models/medidaNeumatico";

export async function GET() {
    try {
        const tipos = await MedidaNeumatico.findAll();
        return Response.json(tipos);
    } catch (error) {
        console.error("Error al obtener las medidas: ", error)
        throw new Error ('error al obtener las medidas: ', error)
    }
}

export async function POST(request) {
    
    const { medida, peso } = await request.json();

    try {
        const nuevo = await MedidaNeumatico.create({ medida, peso });
        return Response.json(nuevo)
    } catch (err) {
        console.error('error al crear tipo: ', err);
        throw new Error ('error al crear tipo: ', err)
    }
}
