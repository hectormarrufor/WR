// lib/dateUtils.js

// Retorna la fecha actual en zona horaria de Caracas
export const getCaracasDate = () => {
    return new Date(new Date().toLocaleString("en-US", { timeZone: "America/Caracas" }));
};

// Suma días a una fecha
export const addDays = (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};

// Compara si una fecha (mes/día) coincide con otra (para cumpleaños)
export const isSameMonthDay = (date1, date2) => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return d1.getUTCMonth() === d2.getUTCMonth() && d1.getUTCDate() === d2.getUTCDate();
};

// Calcula antiguedad en años
export const getYearsDiff = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    let years = end.getFullYear() - start.getFullYear();
    const m = end.getMonth() - start.getMonth();
    if (m < 0 || (m === 0 && end.getDate() < start.getDate())) {
        years--;
    }
    return years;
};

// app/helpers/dateUtils.js
import { format } from "date-fns";
import { es } from "date-fns/locale";

// 1. Convertir String BD (YYYY-MM-DD) a Date Local (00:00:00 VET)
// Úsalo cuando recibas datos de la API antes de ponerlos en un DateInput
export const parseDateToLocal = (dateString) => {
  if (!dateString) return null;
  // Divide y vence: evita que el navegador asuma UTC
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

// 2. Formato Corto: "02-feb-26"
export const formatDateShort = (date) => {
  if (!date) return "S/F"; // Sin Fecha
  const d = typeof date === 'string' ? parseDateToLocal(date) : date;
  
  // dd = día, MMM = mes abreviado, yy = año 2 dígitos
  return format(d, "dd-MMM-yy", { locale: es }).toLowerCase();
};

// 3. Formato Largo con día: "lunes 02-feb-26"
export const formatDateLong = (date) => {
  if (!date) return "S/F";
  const d = typeof date === 'string' ? parseDateToLocal(date) : date;

  // EEEE = nombre del día completo
  return format(d, "EEEE dd-MMM-yy", { locale: es }).toLowerCase();
};