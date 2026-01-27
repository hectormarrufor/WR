import { NextResponse } from 'next/server';
import { 
    Consumible, Filtro, Neumatico, Aceite, Bateria, Correa, Sensor, 
    ConsumibleRecomendado, ConsumibleSerializado // <--- Importamos el modelo
} from '@/models';
import { Op } from 'sequelize'; // <--- IMPORTANTE: Necesitamos Op

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const recomendacionId = searchParams.get('recomendacionId');

    if (!recomendacionId) return NextResponse.json({ success: false, error: 'Falta ID' }, { status: 400 });
    
    try {
        const regla = await ConsumibleRecomendado.findByPk(recomendacionId);
        if (!regla) return NextResponse.json({ success: false, error: 'Regla no encontrada' }, { status: 404 });

        let includeModels = [];
        let whereGeneral = {};

        // --- LÓGICA DE GRUPO ---
        if (regla.tipoCriterio === 'grupo' && regla.grupoEquivalenciaId) {
            includeModels.push({
                model: Filtro,
                where: { grupoEquivalenciaId: regla.grupoEquivalenciaId },
                required: true 
            });

        // --- LÓGICA TÉCNICA (MODIFICADA PARA MULTI-VALOR) ---
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

                // 1. Convertimos "315/80R22.5,295/80R22.5" en un array ["315/80R22.5", "295/80R22.5"]
                // El .split sirve incluso si solo hay un valor (devuelve array de 1)
                const valoresPosibles = regla.valorCriterio
                    ? regla.valorCriterio.split(',').map(v => v.trim()) 
                    : [];

                // 2. Usamos el operador IN de SQL para buscar cualquiera de ellos
                whereTecnico[estrategia.col] = { [Op.in]: valoresPosibles };

                includeModels.push({
                    model: estrategia.model,
                    where: whereTecnico,
                    required: true
                });
            }
        
        // --- LÓGICA INDIVIDUAL ---
        } else if (regla.tipoCriterio === 'individual' && regla.consumibleId) {
            whereGeneral.id = regla.consumibleId;
        }

        // Resto de tu código (FindAll, mapeo, etc.) sigue igual...
        if (includeModels.length === 0 && !whereGeneral.id) {
             whereGeneral.categoria = regla.categoria;
        }

        const compatibles = await Consumible.findAll({
            where: whereGeneral,
            include: [
                ...includeModels,
                { model: Aceite }, { model: Neumatico }, { model: Filtro },
                { 
                    model: ConsumibleSerializado,
                    as: 'serializados',
                    where: { estado: 'almacen' },
                    required: false,
                    attributes: ['id', 'serial']
                }
            ]
        });

        // Mapeo para frontend (Igual que antes)
        const itemsFormateados = compatibles.map(c => ({
            value: c.id.toString(),
            // Mostramos la medida específica en el label para que el usuario sepa cuál es
            label: `${c.nombre} (${c.Neumatico?.medida || c.Aceite?.viscosidad || ''}) - Stock: ${c.stockAlmacen || 0}`,
            stockActual: parseFloat(c.stockAlmacen || 0),
            categoria: c.categoria,
            // disabled: parseFloat(c.stockAlmacen || 0) <= 0,
            serialesDisponibles: c.serializados ? c.serializados.map(s => ({
                value: s.id,
                label: s.serial,
                id: s.id
            })) : []
        }));

        return NextResponse.json({ success: true, data: itemsFormateados });

    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}