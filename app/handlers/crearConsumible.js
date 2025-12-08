async function crearConsumibleEspecifico(tipo, datos) {
  let modeloEspecifico;
  let categoria;
  let unidadMedida;
  let nombre;

  switch (tipo) {
    case 'aceiteMotor':
      modeloEspecifico = AceiteMotor;
      categoria = 'aceiteMotor';
      unidadMedida = 'litros';
      nombre = `Aceite Motor ${datos.marca} ${datos.viscosidad} ${datos.tipo}`;
      break;

    case 'neumatico':
      modeloEspecifico = Neumatico;
      categoria = 'neumatico';
      unidadMedida = 'unidades';
      nombre = `Neumático ${datos.medida} ${datos.tipo}`;
      break;

    case 'sensor':
      modeloEspecifico = Sensor;
      categoria = 'sensor';
      unidadMedida = 'unidades';
      nombre = `Sensor ${datos.modelo}`;
      break;

    default:
      throw new Error('Tipo de consumible no soportado');
  }

  // 1. Crear el consumible
  const consumible = await Consumible.create({
    nombre,
    categoria,
    unidadMedida,
    stockActual: 0,
    stockMinimo: 0,
    costoPromedio: 0
  });

  // 2. Crear el modelo específico vinculado
  const especifico = await modeloEspecifico.create({
    ...datos,
    consumibleId: consumible.id
  });

  return { consumible, especifico };
}