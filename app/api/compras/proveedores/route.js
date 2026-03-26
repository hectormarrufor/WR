import { NextResponse } from "next/server";
import db from "@/models";

// GET: Obtener lista de proveedores para el Select
export async function GET() {
    try {
        const proveedores = await db.Proveedor.findAll({
            order: [['nombre', 'ASC']], // Ordenamos alfabéticamente
            attributes: ['id', 'nombre', 'rif', 'contacto', 'telefono', 'email'] 
        });

        return NextResponse.json({ success: true, data: proveedores });
    } catch (error) {
        console.error("Error obteniendo proveedores:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// POST: Crear un nuevo proveedor desde el modal rápido
export async function POST(request) {
    try {
        const body = await request.json();
        const { nombre, rif, contacto, telefono, email, direccion, notas } = body;

        // 1. Validación básica
        if (!nombre || nombre.trim() === '') {
            return NextResponse.json({ success: false, error: 'El nombre del proveedor es obligatorio.' }, { status: 400 });
        }

        // 2. Creación en base de datos
        const nuevoProveedor = await db.Proveedor.create({
            nombre: nombre.trim(),
            rif: rif ? rif.trim() : null, // El RIF es opcional en el modal rápido
            contacto,
            telefono,
            email,
            direccion,
            notas
        });

        // Retornamos el proveedor creado para que el frontend lo seleccione automáticamente
        return NextResponse.json({ success: true, data: nuevoProveedor });

    } catch (error) {
        console.error("Error creando proveedor:", error);
        
        // 3. Manejo de errores de campos únicos (Sequelize)
        if (error.name === 'SequelizeUniqueConstraintError') {
            const campoDuplicado = error.errors[0].path;
            const mensaje = campoDuplicado === 'rif' 
                ? 'Ya existe un proveedor registrado con este RIF.' 
                : 'Ya existe un proveedor con este Nombre Comercial.';
                
            return NextResponse.json({ success: false, error: mensaje }, { status: 400 });
        }

        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}