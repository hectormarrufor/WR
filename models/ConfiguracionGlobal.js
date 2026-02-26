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

  // --- 2. GASTOS ADMINISTRATIVOS Y OPERATIVOS (Estáticos Mensuales) ---
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
  
  // Nómina Fija
  nominaAdministrativaTotal: { type: DataTypes.FLOAT, defaultValue: 1500 },
  nominaOperativaFijaTotal: { type: DataTypes.FLOAT, defaultValue: 2000 }, 

  // --- 3. PARÁMETROS FINANCIEROS (Módulo Posesión) ---
  tasaInteresAnual: { type: DataTypes.FLOAT, defaultValue: 5.0 }, 
  horasAnualesOperativas: { type: DataTypes.INTEGER, defaultValue: 2000 }, 

 // ==========================================================
  // --- 4. NUEVOS: PARÁMETROS DE MERCADO Y OPERACIONES ---
  // ==========================================================
  precioGasoil: { type: DataTypes.FLOAT, defaultValue: 0.50 },
  precioPeajePromedio: { type: DataTypes.FLOAT, defaultValue: 20.00 },
  viaticoAlimentacionDia: { type: DataTypes.FLOAT, defaultValue: 15.00 },
  viaticoHotelNoche: { type: DataTypes.FLOAT, defaultValue: 20.00 },

  // Referencias para Batch Update de Matrices (Mínimos y Máximos)
  precioAceiteMotorMin: { type: DataTypes.FLOAT, defaultValue: 7.50 },
  precioAceiteMotorMax: { type: DataTypes.FLOAT, defaultValue: 9.50 },
  
  precioAceiteCajaMin: { type: DataTypes.FLOAT, defaultValue: 10.00 },
  precioAceiteCajaMax: { type: DataTypes.FLOAT, defaultValue: 12.00 },
  
  precioCauchoMin: { type: DataTypes.FLOAT, defaultValue: 350.00 },
  precioCauchoMax: { type: DataTypes.FLOAT, defaultValue: 450.00 },
  
  precioBateriaMin: { type: DataTypes.FLOAT, defaultValue: 150.00 },
  precioBateriaMax: { type: DataTypes.FLOAT, defaultValue: 210.00 },

  utilizacionFlotaPorcentaje: { type: DataTypes.FLOAT, defaultValue: 30.0 },
  // --- 5. RESULTADO DEL PRORRATEO DINÁMICO ---
  costoAdministrativoPorHora: { 
    type: DataTypes.FLOAT, 
    defaultValue: 0,
    comment: 'Suma de gastos de la tabla dinámica anual dividida entre la flota'
  }

}, { tableName: 'ConfiguracionGlobal' });

// AGREGAMOS LA ASOCIACIÓN A LA TABLA DINÁMICA
ConfiguracionGlobal.associate = (models) => {
    ConfiguracionGlobal.hasMany(models.GastoFijoGlobal, { 
        foreignKey: 'configuracionId', 
        as: 'gastosFijos', 
        onDelete: 'CASCADE' 
    });
};

module.exports = ConfiguracionGlobal;