import db from "../../../../models";
const {TipoAceiteMotor } = db
export async function GET() {
    try {
        const tipos = await TipoAceiteMotor.findAll();
        return Response.json(tipos);
    } catch (error) {
        console.error("Error al obtener los tipos de aceite: ", error.message)
        throw new Error ('error al obtener los tipos de aceite: ', error.message)
    }
}

export async function POST(request) {
    
    const { tipo } = await request.json();
    console.log(tipo);
    
    try {
        const nuevo = await TipoAceiteMotor.create({ tipo });
        return Response.json(nuevo)
    } catch (err) {
        console.error('error al crear tipo de aceite: ', err.message);
        throw new Error ('error al crear tipo de aceite: ', err.message)
    }
}
