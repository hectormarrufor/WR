import { NextResponse } from 'next/server';
import sequelize from '@/sequelize';
import { 
    Vehiculo, 
    VehiculoInstancia, 
    Subsistema, 
    SubsistemaInstancia 
} from '@/models';

export async function POST(request) {
    const t = await sequelize.transaction();

    try {
        const body = await request.json();
        
        // 1. Validar que la plantilla existe
        // body.vehiculoId es el ID del "Iveco Stralis 2015" (La plantilla)
        const plantilla = await Vehiculo.findByPk(body.vehiculoId, { transaction: t });
        if (!plantilla) throw new Error('La plantilla de vehículo especificada no existe.');

        // 2. Crear el Vehículo Físico (Instancia)
        const nuevaInstancia = await VehiculoInstancia.create({
            vehiculoId: body.vehiculoId, // Link a la plantilla
            placa: body.placa,
            serialCarroceria: body.serialCarroceria,
            serialMotor: body.serialMotor,
            color: body.color,
            anioFabricacion: body.anioFabricacion || plantilla.anio,
            estado: 'Activo', // 'En Mantenimiento', 'Inactivo'
            kilometrajeActual: body.kilometrajeInicial || 0,
            horometroActual: body.horometroInicial || 0,
            // Otros campos propios de la instancia (fecha compra, etc.)
        }, { transaction: t });

        // 3. CLONAR LA ESTRUCTURA (La magia)
        // Buscamos todos los subsistemas definidos en la plantilla (Motor, Frenos, Transmisión...)
        const subsistemasPlantilla = await Subsistema.findAll({
            where: { vehiculoId: plantilla.id },
            transaction: t
        });

        if (subsistemasPlantilla.length > 0) {
            // Preparamos los datos para insertar en lote
            const instanciasDeSubsistema = subsistemasPlantilla.map(subPlantilla => ({
                subsistemaId: subPlantilla.id, // Referencia a qué es (ej. "Motor")
                vehiculoInstanciaId: nuevaInstancia.id, // Referencia a quién pertenece (al camión placa X)
                estado: 'Operativo', // Estado inicial
                fechaUltimoMantenimiento: new Date(),
                // Aquí NO se copian los consumibles. Los consumibles quedan en la definición (Subsistema).
                // Aquí se crean los "huecos" vacíos.
            }));

            // Bulk Create es mucho más rápido que un loop
            await SubsistemaInstancia.bulkCreate(instanciasDeSubsistema, { transaction: t });
        }

        await t.commit();

        return NextResponse.json({ 
            success: true, 
            message: 'Vehículo registrado y estructura de subsistemas inicializada.',
            data: nuevaInstancia 
        }, { status: 201 });

    } catch (error) {
        await t.rollback();
        console.error("Error creando instancia:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}