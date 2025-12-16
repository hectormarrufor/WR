import { NextResponse } from 'next/server';
import sequelize from '@/sequelize';
import { 
    Activo, 
    VehiculoInstancia, 
    RemolqueInstancia, 
    MaquinaInstancia,
    Vehiculo, Remolque, Maquina
} from '@/models';

// ----------------------------------------------------------------------
// GET: Listar todos los activos (Vehículos, Remolques, Máquinas mezclados)
// ----------------------------------------------------------------------
export async function GET(request) {
    try {
        const activos = await Activo.findAll({
            include: [
                {
                    model: VehiculoInstancia,
                    as: 'detalleVehiculo',
                    include: [{ model: Vehiculo, as: 'plantilla' }]
                },
                {
                    model: RemolqueInstancia,
                    as: 'detalleRemolque',
                    include: [{ model: Remolque, as: 'plantilla' }]
                },
                {
                    model: MaquinaInstancia,
                    as: 'detalleMaquina',
                    include: [{ model: Maquina, as: 'plantilla' }]
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        return NextResponse.json({ success: true, data: activos });
    } catch (error) {
        console.error("Error obteniendo activos:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// ----------------------------------------------------------------------
// POST: Crear Activo + Instancia Específica
// ----------------------------------------------------------------------
export async function POST(request) {
    const t = await sequelize.transaction();

    try {
        const body = await request.json();
        
        const { 
            codigoInterno, 
            tipoActivo, 
            estado = 'Operativo', 
            ubicacionActual, 
            imagen, // URL string que viene del Frontend
            plantillaId, // ID del modelo base
            // Campos específicos de las instancias:
            placa, serialCarroceria, serialMotor, color, anioFabricacion, 
            kilometrajeActual, horometroActual 
        } = body;

        let nuevaInstancia = null;
        let campoId = '';

        // 1. Crear la Instancia Específica
        if (tipoActivo === 'Vehiculo') {
            campoId = 'vehiculoInstanciaId';
            nuevaInstancia = await VehiculoInstancia.create({
                vehiculoId: plantillaId,
                placa,
                serialCarroceria,
                serialMotor,
                color,
                anioFabricacion,
                kilometrajeActual: kilometrajeActual || 0,
                horometroActual: horometroActual || 0,
            }, { transaction: t });

        } else if (tipoActivo === 'Remolque') {
            campoId = 'remolqueInstanciaId';
            nuevaInstancia = await RemolqueInstancia.create({
                remolqueId: plantillaId,
                placa,
                serialCarroceria,
                anioFabricacion,
                color,
            }, { transaction: t });

        } else if (tipoActivo === 'Maquina') {
            campoId = 'maquinaInstanciaId';
            nuevaInstancia = await MaquinaInstancia.create({
                maquinaId: plantillaId,
                serialCarroceria,
                serialMotor,
                anioFabricacion,
                horometroActual: horometroActual || 0,
            }, { transaction: t });
        } else {
            throw new Error('Tipo de activo no válido');
        }

        // 2. Crear el Activo (Padre/Wrapper)
        const nuevoActivo = await Activo.create({
            codigoInterno,
            tipoActivo,
            estado,
            ubicacionActual,
            imagen: imagen || null, 
            [campoId]: nuevaInstancia.id
        }, { transaction: t });

        await t.commit();

        return NextResponse.json({ 
            success: true, 
            message: 'Activo creado exitosamente', 
            data: nuevoActivo 
        }, { status: 201 });

    } catch (error) {
        await t.rollback();
        console.error("Error creando activo:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}