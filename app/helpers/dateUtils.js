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