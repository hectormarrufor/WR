export function normalizarMedida(medida) {
  return medida
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[^0-9A-Z/]/g, '')
    .replace(/\/R?/, '/R')
    .replace(/\/{2,}/g, '/');
}
