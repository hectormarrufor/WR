import TipoVehiculo from "../../../../models/tipoVehiculo";

export async function GET() {
    try {
        const tipos = await TipoVehiculo.findAll();
        return Response.json(tipos);
    } catch (error) {
        console.error("Error al obtener tipos de vehiculo: ", error)
        throw new Error ('error al obtener los tipos de vehiculos: ', error)
    }
}

export async function POST(request) {
    
    const { label, peso } = await request.json();
    const value = label.toLowerCase().replace(/\s+/g, '-');

    try {
        const nuevo = await TipoVehiculo.create({ label, value, peso });
        return Response.json(nuevo)
    } catch (err) {
        console.error('error al crear tipo: ', err);
        throw new Error ('error al crear tipo: ', err)
    }
}
