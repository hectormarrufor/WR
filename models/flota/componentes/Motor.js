const { DataTypes } = require('sequelize');
const sequelize = require('../../../sequelize'); // Asegúrate de que la ruta sea correcta

const Motor = sequelize.define('Motor', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  // --- Clave Foránea Opcional para la Asociación ---
  vehiculoId: {
    type: DataTypes.INTEGER,
    allowNull: true, // <-- CAMBIO CLAVE: El motor puede no estar en un vehículo.
    unique: true,    // Un vehículo solo puede tener UN motor asignado a la vez.
  },

  // --- Identificación del Motor ---
  marca: { type: DataTypes.STRING, allowNull: false },
  modelo: { type: DataTypes.STRING, allowNull: false },
  serial: { type: DataTypes.STRING, allowNull: false, unique: true },
  
  // --- Especificaciones Técnicas ---
  tipoCombustible: {
    type: DataTypes.ENUM('Diesel', 'Gasolina', 'Gas Natural', 'Otro'),
    defaultValue: 'Diesel',
  },
  configuracion: { type: DataTypes.STRING },
  cilindradaLitros: { type: DataTypes.FLOAT },
  potenciaHP: { type: DataTypes.INTEGER },
  torqueLibrasPie: { type: DataTypes.INTEGER },

  // --- Fluidos y Capacidades ---
  capacidadAceiteLitros: { type: DataTypes.FLOAT, allowNull: false },
  tipoAceiteRecomendado: { type: DataTypes.STRING, allowNull: false },
  capacidadRefrigeranteLitros: { type: DataTypes.FLOAT, allowNull: false },
  tipoRefrigeranteRecomendado: { type: DataTypes.STRING, allowNull: false },

  // --- Parámetros Operativos ---
  rpmRalenti: { type: DataTypes.INTEGER },
  // El campo rpmGobernado ha sido eliminado según tu solicitud.

  // --- Campos de Mantenimiento para Cambio de Aceite ---
  intervaloCambioAceiteKm: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  intervaloCambioAceiteHoras: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  kmUltimoCambioAceite: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
  },
  horasUltimoCambioAceite: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
  },

  // --- Otros Registros ---
  fechaUltimoOverhaul: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  notasGenerales: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

}, {
  tableName: 'Motores',
  timestamps: true,
});

// --- Definición de Asociaciones ---
Motor.associate = (models) => {
  // Una ficha técnica de motor PERTENECE A UN Vehiculo (opcionalmente)
  Motor.belongsTo(models.Vehiculo, {
    foreignKey: 'vehiculoId',
    as: 'vehiculo',
  });
};

module.exports = Motor;