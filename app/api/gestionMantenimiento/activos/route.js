import { NextResponse } from 'next/server';
import sequelize from '@/sequelize';
import { 
    Activo, 
    VehiculoInstancia, RemolqueInstancia, MaquinaInstancia,
    Vehiculo, Remolque, Maquina,
    Subsistema, SubsistemaInstancia,
    ConsumibleUsado // <--- IMPORTANTE
} from '@/models';

// GET: Listar (Sin cambios)
export async function GET(request) {
    try {
        const activos = await Activo.findAll({
            include: [
                { model: VehiculoInstancia, as: 'vehiculoInstancia', include: [{ model: Vehiculo, as: 'plantilla' }] },
                { model: RemolqueInstancia, as: 'remolqueInstancia', include: [{ model: Remolque, as: 'plantilla' }] },
                { model: MaquinaInstancia, as: 'maquinaInstancia', include: [{ model: Maquina, as: 'plantilla' }] }
            ],
            order: [['createdAt', 'DESC']]
        });
        return NextResponse.json({ success: true, data: activos });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// POST: Crear Activo + Inicialización de Subsistemas + Instalación de Piezas
export async function POST(request) {
    const t = await sequelize.transaction();

    try {
        const body = await request.json();
        const { 
            codigoInterno, tipoActivo, estado = 'Operativo', ubicacionActual, imagen, plantillaId,
            placa, serialCarroceria, serialMotor, color, anioFabricacion, kilometrajeActual, horometroActual,
            // NUEVO CAMPO: Array de objetos { subsistemaId (Abstracto), consumibleId (Real), fechaInstalacion }
            instalacionesIniciales = [] 
        } = body;

        let nuevaInstancia = null;
        let campoId = '';

        // 1. CREAR LA INSTANCIA FÍSICA ESPECÍFICA
        if (tipoActivo === 'Vehiculo') {
            campoId = 'vehiculoInstanciaId';
            nuevaInstancia = await VehiculoInstancia.create({
                vehiculoId: plantillaId, placa, serialCarroceria, serialMotor, color, anioFabricacion,
                kilometrajeActual: kilometrajeActual || 0, horometroActual: horometroActual || 0
            }, { transaction: t });
        } else if (tipoActivo === 'Remolque') {
            campoId = 'remolqueInstanciaId';
            nuevaInstancia = await RemolqueInstancia.create({
                remolqueId: plantillaId, placa, serialCarroceria, anioFabricacion, color
            }, { transaction: t });
        } else if (tipoActivo === 'Maquina') {
            campoId = 'maquinaInstanciaId';
            nuevaInstancia = await MaquinaInstancia.create({
                maquinaId: plantillaId, serialCarroceria, serialMotor, anioFabricacion, 
                horometroActual: horometroActual || 0
            }, { transaction: t });
        }

        // 2. CREAR EL ACTIVO PADRE
        const nuevoActivo = await Activo.create({
            codigoInterno, tipoActivo, estado, ubicacionActual, imagen,
            [campoId]: nuevaInstancia.id
        }, { transaction: t });

        // 3. COPIAR SUBSISTEMAS Y APLICAR INSTALACIONES
        let whereCondition = {};
        if (tipoActivo === 'Vehiculo') whereCondition = { vehiculoId: plantillaId };
        else if (tipoActivo === 'Remolque') whereCondition = { remolqueId: plantillaId };
        else if (tipoActivo === 'Maquina') whereCondition = { maquinaId: plantillaId };

        const subsistemasTeoricos = await Subsistema.findAll({ where: whereCondition, transaction: t });

        if (subsistemasTeoricos.length > 0) {
            
            for (const subTeorico of subsistemasTeoricos) {
                // A. Crear el hueco vacío (SubsistemaInstancia)
                const nuevaSubInstancia = await SubsistemaInstancia.create({
                    activoId: nuevoActivo.id,
                    subsistemaId: subTeorico.id,
                    estado: 'Operativo',
                    fechaUltimoMantenimiento: new Date()
                }, { transaction: t });

                // B. Verificar si el usuario mandó una pieza para instalar AQUÍ
                const instalacion = instalacionesIniciales.find(i => i.subsistemaId === subTeorico.id);
                
                if (instalacion) {
                    await ConsumibleUsado.create({
                        subsistemaInstanciaId: nuevaSubInstancia.id,
                        consumibleId: instalacion.consumibleId, // El ID del filtro real (Inventario)
                        consumibleSerializadoId: instalacion.consumibleSerializadoId || null,
                        cantidad: instalacion.cantidad || 1,
                        fechaInstalacion: instalacion.fechaInstalacion || new Date(),
                        instaladoPorId: null // O el ID del usuario actual si lo tienes en el request
                    }, { transaction: t });
                    
                    // OJO: Aquí podrías descontar stock si tu lógica de negocio lo exige al "nacer" el activo.
                }
            }
        }

        await t.commit();
        return NextResponse.json({ success: true, data: nuevoActivo }, { status: 201 });

    } catch (error) {
        await t.rollback();
        console.error("Error creando activo:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}