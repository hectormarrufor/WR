export function normalizarMedida(input) {
 
    const parts = input.trim().split(/[^\d.]+/);
    if (parts.length >= 3) {
      return `${parts[0]}/${parts[1]}R${parts[2]}`;
    }
    return input;

}

