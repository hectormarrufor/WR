//calcular peso transmitido al eje delantero del tractor
//Esta funcion sirve para calcular el peso que se transfiere al eje delantero del tractor
//cuando se conecta un remolque al tractor. El peso transmitido depende del peso del remolque
//y de la carga que lleva el remolque. El porcentaje de transferencia es un valor entre 0 y 1
//que indica la fraccion del peso total del remolque y su carga que se transfiere al eje delantero del tractor.
//Por defecto, se asume que el 10% del peso total se transfiere al eje delantero del tractor.

export function calcularPesoTransmitido(pesoRemolqueKg, pesoCargaKg, porcentajeTransferencia = 0.1) {
  return (pesoRemolqueKg + pesoCargaKg) * porcentajeTransferencia;
}


//calcular factor de carga de neumaticos
//Esta funcion sive para calcular el desgaste adicional que sufren los neumaticos
//cuando el peso soportado por el eje es mayor a la capacidad de carga de los neumaticos
//El resultado es un numero entre 0 y 1, donde 1 significa que el peso soportado es igual a la capacidad de carga de los neumaticos
//y 0 significa que el peso soportado es mucho menor a la capacidad de carga de los neumaticos

export function calcularFactorCargaNeumaticos(pesoSoportadoKg, cantidadNeumaticos, capacidadPorNeumaticoKg) {
  const capacidadTotal = cantidadNeumaticos * capacidadPorNeumaticoKg;
  return parseFloat((pesoSoportadoKg / capacidadTotal).toFixed(2));
}

//calcular desgaste por resistencia al avance
//Esta funcion sirve para calcular el desgaste adicional que sufren los neumaticos
//cuando el remolque se desplaza sobre una superficie con cierta resistencia al avance

export function calcularDesgastePorResistencia(pesoRemolqueCargadoKg, coeficienteResistencia, factorTerreno, distanciaKm) {
  return parseFloat((pesoRemolqueCargadoKg * coeficienteResistencia * factorTerreno * distanciaKm).toFixed(2));
}

//calcular desgaste por neumaticos
//Esta funcion sirve para calcular el desgaste que sufren los neumaticos
//en funcion de la distancia recorrida, el costo del juego de neumaticos, la vida util de los neumaticos y el factor de carga

function calcularDesgasteNeumaticos(distanciaKm, costoJuegoNeumaticos, vidaUtilKm, factorCarga) {
  const desgastePorKm = (costoJuegoNeumaticos / vidaUtilKm) * factorCarga;
  return parseFloat((desgastePorKm * distanciaKm).toFixed(2));
}


//calcular consumo de combustible
//Esta funcion sirve para calcular el consumo de combustible en litros
//en funcion de la distancia recorrida, el consumo base del tractor en litros por 100 km,
//el peso de la carga en toneladas y un factor que indica el incremento del consumo por tonelada de carga

export function calcularConsumoCombustible(distanciaKm, consumoBaseLitrosPor100Km, pesoCargaToneladas, factorCarga) {
  const consumoBasePorKm = consumoBaseLitrosPor100Km / 100;
  const consumoPorKm = consumoBasePorKm * (1 + (pesoCargaToneladas * factorCarga));
  return parseFloat((consumoPorKm * distanciaKm).toFixed(2));
}


//calcular costo total del viaje
//Esta funcion sirve para calcular el costo total del viaje
//en funcion del desgaste de los neumaticos en la ida, el desgaste de los neumaticos en el retorno,
//el desgaste por resistencia al avance, el consumo de combustible, el precio del combustible y el porcentaje de ganancia

export function calcularCostoTotal({
  desgasteIda,
  desgasteRetorno,
  desgasteExtra,
  consumoLitros,
  precioCombustible,
  porcentajeGanancia
}) {
  const costoCombustible = consumoLitros * precioCombustible;
  const costoBase = desgasteIda + desgasteRetorno + desgasteExtra + costoCombustible;
  const costoFinal = costoBase * (1 + porcentajeGanancia);
  return parseFloat(costoFinal.toFixed(2));
}