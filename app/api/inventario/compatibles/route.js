import { NextResponse } from 'next/server';
import { Op } from 'sequelize';
import { 
    Consumible, Filtro, Neumatico, Aceite, Bateria, Correa, Sensor, ConsumibleRecomendado 
} from '@/models';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const recomendacionId = searchParams.get('recomendacionId');
    
    // 1. Obtenemos la Regla
    const regla = await ConsumibleRecomendado.findByPk(recomendacionId);
    if (!regla) return NextResponse.json([]);

    let whereCondition = {};
    let includeModels = [];

    // --- ESTRATEGIA DE BÚSQUEDA ---
    if (regla.tipoCriterio === 'grupo') {
        includeModels.push({
            model: Filtro,
            where: { grupoEquivalenciaId: regla.grupoEquivalenciaId },
            required: true
        });
    } 
    else if (regla.tipoCriterio === 'tecnico') {
        
        // MAPA DE ESTRATEGIAS: Define qué Modelo y qué Columna usar según la categoría
        const estrategia = {
            'neumatico':   { model: Neumatico, col: 'medida' },
            'aceite':      { model: Aceite,    col: 'viscosidad' },
            'bateria':     { model: Bateria,   col: 'codigo' }, // o 'grupo' según tu modelo
            'correa':      { model: Correa,    col: 'codigo' },
            'sensor':      { model: Sensor,    col: 'codigo' }
        }[regla.categoria];

        if (estrategia) {
            // Construimos la consulta dinámica
            let whereTecnico = {};
            whereTecnico[estrategia.col] = regla.valorCriterio; // Ej: medida = '11R22.5'

            includeModels.push({
                model: estrategia.model,
                where: whereTecnico,
                required: true
            });
        }
    }
    else if (regla.tipoCriterio === 'individual') {
        if (regla.consumibleId) whereCondition.id = regla.consumibleId;
    }

    // 2. Ejecutar consulta
    const compatibles = await Consumible.findAll({
        where: whereCondition,
        include: includeModels
    });

    return NextResponse.json(compatibles);
}