export function sueldoSemanalDesdeMes(sueldoMensual) {
  return (sueldoMensual / 30) * 7;
}

export function sueldoDiarioDesdeMes(sueldoMensual) {
  return (sueldoMensual / 30);
}

export function sueldoXHora(sueldoDiario) {
    return (sueldoDiario / 8);
}