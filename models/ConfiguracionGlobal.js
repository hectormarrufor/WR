const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');

const ConfiguracionGlobal = sequelize.define('ConfiguracionGlobal', {
  // --- 1. RESGUARDO Y SEGURIDAD (Módulo Resguardo) ---
  cantidadVigilantes: { type: DataTypes.INTEGER, defaultValue: 4 },
  sueldoMensualVigilante: { type: DataTypes.FLOAT, defaultValue: 250 },
  horasDiurnas: { type: DataTypes.INTEGER, defaultValue: 12 },
  horasNocturnas: { type: DataTypes.INTEGER, defaultValue: 12 },
  diasGuardia: { type: DataTypes.INTEGER, defaultValue: 6 },
  diasDescanso: { type: DataTypes.INTEGER, defaultValue: 1 },
  factorHoraNocturna: { type: DataTypes.FLOAT, defaultValue: 1.35 }, // 135%
  
  // Gastos Adicionales de Seguridad
  costoSistemaCCTV: { type: DataTypes.FLOAT, defaultValue: 50 }, // Mensual
  costoMonitoreoSatelital: { type: DataTypes.FLOAT, defaultValue: 100 }, // Mensual Global

  // --- 2. GASTOS ADMINISTRATIVOS Y OPERATIVOS (Módulo C.F Mano de Obra) ---
  // Estos gastos se suman y se dividen entre las horas productivas de la flota
  gastosOficinaMensual: { 
    type: DataTypes.FLOAT, 
    defaultValue: 500,
    comment: 'Alquiler, Luz, Internet, Papelería, Artículos limpieza'
  },
  pagosGestoriaPermisos: {
    type: DataTypes.FLOAT,
    defaultValue: 200,
    comment: 'Permisos RACDA, Trimestres, etc. (Promedio mensual)'
  },
  
  // Nómina Fija (Gerentes, Admin, Limpieza) - Totalizado
  nominaAdministrativaTotal: { type: DataTypes.FLOAT, defaultValue: 1500 },
  nominaOperativaFijaTotal: { type: DataTypes.FLOAT, defaultValue: 2000 }, // Mecánicos de planta

  // --- 3. PARÁMETROS FINANCIEROS (Módulo Posesión) ---
  tasaInteresAnual: { type: DataTypes.FLOAT, defaultValue: 5.0 }, // Costo Oportunidad
  horasAnualesOperativas: { type: DataTypes.INTEGER, defaultValue: 2000 }, // Base de cálculo depreciación

}, { tableName: 'ConfiguracionGlobal' });

module.exports = ConfiguracionGlobal;