import { NextResponse } from 'next/server';
import { 
    Consumible, Filtro, Neumatico, Aceite, Bateria, Correa, Sensor, 
    ConsumibleRecomendado, ConsumibleSerializado // <--- Importamos el modelo
} from '@/models';
import { Op } from 'sequelize';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const recomendacionId = searchParams.get('recomendacionId');

    if (!recomendacionId) return NextResponse.json({ success: false, error: 'Falta ID' }, { status: 400 });
    
    try {
        const regla = await ConsumibleRecomendado.findByPk(recomendacionId);
        if (!regla) return NextResponse.json({ success: false, error: 'Regla no encontrada' }, { status: 404 });

        let includeModels = [];
        let whereGeneral = {};

        // --- ESTRATEGIA DE BÚSQUEDA (Igual que antes) ---
        if (regla.tipoCriterio === 'grupo' && regla.grupoEquivalenciaId) {
            includeModels.push({
                model: Filtro,
                where: { grupoEquivalenciaId: regla.grupoEquivalenciaId },
                required: true 
            });
        } else if (regla.tipoCriterio === 'tecnico') {
            const estrategia = {
                'neumatico':   { model: Neumatico, col: 'medida' },
                'aceite':      { model: Aceite,    col: 'viscosidad' },
                'bateria':     { model: Bateria,   col: 'codigo' }, 
                'correa':      { model: Correa,    col: 'codigo' },
                'sensor':      { model: Sensor,    col: 'codigo' }
            }[regla.categoria.toLowerCase()];

            if (estrategia) {
                let whereTecnico = {};
                whereTecnico[estrategia.col] = regla.valorCriterio; 
                includeModels.push({
                    model: estrategia.model,
                    where: whereTecnico,
                    required: true
                });
            }
        } else if (regla.tipoCriterio === 'individual' && regla.consumibleId) {
            whereGeneral.id = regla.consumibleId;
        }

        if (includeModels.length === 0 && !whereGeneral.id) {
             whereGeneral.categoria = regla.categoria;
        }

        // --- CONSULTA OPTIMIZADA ---
        const compatibles = await Consumible.findAll({
            where: whereGeneral,
            include: [
                ...includeModels,
                // Tablas de detalles técnicos
                { model: Aceite },
                { model: Neumatico },
                { model: Filtro },
                
                // AQUÍ ESTÁ LA OPTIMIZACIÓN: TRAEMOS LOS SERIALES DE UNA VEZ
                { 
                    model: ConsumibleSerializado,
                    as: 'serializados', // Asegúrate que en tu modelo Consumible.js definiste este alias
                    where: { estado: 'almacen' }, // Solo traemos los que podemos instalar
                    required: false, // LEFT JOIN: Si no tiene seriales (es fungible o stock 0), trae el producto igual
                    attributes: ['id', 'serial'] // Solo lo necesario
                }
            ]
        });

        // Formateamos para el Frontend
        const itemsFormateados = compatibles.map(c => ({
            value: c.id.toString(),
            label: `${c.nombre} (Stock: ${c.stockAlmacen || 0})`,
            stockActual: parseFloat(c.stockAlmacen || 0),
            categoria: c.categoria,
            disabled: parseFloat(c.stockAlmacen || 0) <= 0,
            
            // Enviamos la lista de seriales PRE-CARGADA
            serialesDisponibles: c.serializados ? c.serializados.map(s => ({
                value: s.serial,
                label: s.serial,
                id: s.id
            })) : []
        }));

        console.log('Compatibles encontrados:', itemsFormateados);

        return NextResponse.json({ success: true, data: itemsFormateados });

    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}