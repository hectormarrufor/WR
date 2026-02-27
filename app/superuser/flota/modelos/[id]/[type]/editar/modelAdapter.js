// utils/modelAdapter.js

export function adaptarModeloParaFormulario(dataAPI) {
    if (!dataAPI) return null;

    // 1. Mapeo de campos base (Vehículo, Máquina o Remolque)
    const valoresBase = {
        marca: dataAPI.marca, // Si es relación
        modelo: dataAPI.modelo, // Si es texto plano (legacy)
        anio: dataAPI.anio,
        tipoVehiculo: dataAPI.tipoVehiculo,
        tipoRemolque: dataAPI.tipoRemolque,
        tipoMaquina: dataAPI.tipoMaquina, 
        peso: dataAPI.peso,
        ejes: dataAPI.numeroEjes,
        tipoCombustible: dataAPI.tipoCombustible,
        imagen: dataAPI.imagen,
        capacidadArrastre: dataAPI.capacidadArrastre,
        pesoMaximoCombinado: dataAPI.pesoMaximoCombinado,
        potenciaMotor: dataAPI.potenciaMotor,
        capacidadTanque: dataAPI.capacidadTanque,
        consumoTeoricoLleno: dataAPI.consumoTeoricoLleno,
        consumoTeoricoVacio: dataAPI.consumoTeoricoVacio,
        
        // Agrega aquí otros campos específicos si existen en dataAPI
    };

    // 2. Mapeo de Subsistemas y Recomendaciones
    const subsistemasAdaptados = (dataAPI.subsistemas || []).map(sub => ({
        id: sub.id, // Importante para saber que es edición
        nombre: sub.nombre,
        categoria: sub.categoria, // 'motor', 'frenos', etc.
        
        // AQUÍ ESTÁ LA MAGIA: Traducir ConsumibleRecomendado -> UI del Selector
        recomendaciones: (sub.listaRecomendada || []).map(rec => {
            
            // Reconstruimos el objeto que espera ConsumibleSelector
            let criterioId = null;
            let labelOriginal = '';

            // Recuperamos el ID correcto según el tipo de criterio guardado
            if (rec.tipoCriterio === 'grupo') {
                criterioId = rec.grupoEquivalenciaId;
                // Intentamos reconstruir un label amigable
                labelOriginal = `Grupo #${rec.grupoEquivalenciaId}`; 
            } else if (rec.tipoCriterio === 'tecnico') {
                criterioId = rec.valorCriterio;
                labelOriginal = `${rec.valorCriterio}`; // Ej: "15W40"
            } else if (rec.tipoCriterio === 'individual') {
                criterioId = rec.consumibleId;
                labelOriginal = rec.valorCriterio || 'Repuesto Específico';
            }

            return {
                id: rec.id, // ID de la recomendación en BD (para actualizar/borrar)
                categoria: rec.categoria,
                cantidad: parseFloat(rec.cantidad),
                tipoCriterio: rec.tipoCriterio,
                criterioId: criterioId,
                
                // Reconstruimos el label visual para el Badge
                label: rec.label || `${rec.categoria} ${labelOriginal}`,
                labelOriginal: labelOriginal
            };
        })
    }));

    return {
        ...valoresBase,
        subsistemas: subsistemasAdaptados
    };
}