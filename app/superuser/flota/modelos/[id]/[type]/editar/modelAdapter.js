export function adaptarModeloParaFormulario(dataAPI) {
    if (!dataAPI) return null;

    // Detectamos qué tipo de modelo es para mapear correctamente
    // Suponemos que la API devuelve un objeto con campos específicos
    const valoresBase = {
        id: dataAPI.id,
        marca: dataAPI.marca,
        modelo: dataAPI.modelo,
        anio: dataAPI.anio,
        imagen: dataAPI.imagen,
        
        // Mapeo inteligente de Ejes (Vehiculo usa numeroEjes, Remolque nroEjes)
        ejes: dataAPI.numeroEjes || dataAPI.nroEjes || 0,
        
        // Vehículo
        tipoVehiculo: dataAPI.tipoVehiculo,
        tipoCombustible: dataAPI.tipoCombustible,
        capacidadArrastre: dataAPI.capacidadArrastre,
        pesoMaximoCombinado: dataAPI.pesoMaximoCombinado,
        potenciaMotor: dataAPI.potenciaMotor || dataAPI.potencia, // Maquina usa potencia
        capacidadTanque: dataAPI.capacidadTanque || dataAPI.capacidadTanqueEstandar, // Maquina usa Estandar
        consumoTeoricoLleno: dataAPI.consumoTeoricoLleno,
        consumoTeoricoVacio: dataAPI.consumoTeoricoVacio,
        peso: dataAPI.peso,

        // Remolque
        tipoRemolque: dataAPI.tipoRemolque,
        capacidadCarga: dataAPI.capacidadCarga,

        // Maquina
        tipoMaquina: dataAPI.tipo, // En tu modelo Maquina el campo se llama 'tipo'
        traccion: dataAPI.traccion,
        capacidadLevante: dataAPI.capacidadLevante,
        capacidadCucharon: dataAPI.capacidadCucharon,
        alcanceMaximo: dataAPI.alcanceMaximo,

        // Inmueble / Equipo
        tipoInmueble: dataAPI.tipoInmueble,
        area: dataAPI.area,
        pisos: dataAPI.pisos,
        habitaciones: dataAPI.habitaciones,
        banios: dataAPI.banios,
        direccion: dataAPI.direccion,
        especificacion: dataAPI.especificacion,
    };

    const subsistemasAdaptados = (dataAPI.subsistemas || []).map(sub => ({
        id: sub.id,
        nombre: sub.nombre,
        categoria: sub.categoria,
        recomendaciones: (sub.listaRecomendada || []).map(rec => ({
            id: rec.id,
            categoria: rec.categoria,
            cantidad: parseFloat(rec.cantidad),
            tipoCriterio: rec.tipoCriterio,
            criterioId: rec.tipoCriterio === 'grupo' ? rec.grupoEquivalenciaId : 
                        (rec.tipoCriterio === 'individual' ? rec.consumibleId : rec.valorCriterio),
            label: rec.label || 'Repuesto',
            labelOriginal: rec.valorCriterio || ''
        }))
    }));

    return {
        ...valoresBase,
        subsistemas: subsistemasAdaptados
    };
}