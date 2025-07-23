// models/flota/equipoEspecial.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize'); // Asegúrate que la ruta es correcta

const EquipoEspecial = sequelize.define('EquipoEspecial', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  nombre: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  numeroSerie: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  placa: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
  },
  // CAMBIO: Ahora es una clave foránea a TipoEquipoEspecial
  tipoEquipoEspecialId: { 
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'TiposEquiposEspeciales', // Nombre de la tabla
      key: 'id',
    },
  },
  horometroActual: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
  },
  kilometrajeActual: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
  },
  estadoOperativoGeneral: {
    type: DataTypes.ENUM('Operativo', 'Operativo con Advertencias', 'No Operativo', 'En Taller', 'Inactivo'),
    defaultValue: 'Operativo',
    allowNull: false,
  },
  esMovil: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
  },
  vehiculoRemolqueId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Vehiculos',
      key: 'id',
    },
  },
}, {
  tableName: 'EquiposEspeciales',
  timestamps: true,
});

EquipoEspecial.associate = (models) => {
  EquipoEspecial.hasOne(models.FichaTecnicaEquipoEspecial, { foreignKey: 'equipoEspecialId', as: 'fichaTecnica' });
  EquipoEspecial.belongsTo(models.Vehiculo, { foreignKey: 'vehiculoRemolqueId', as: 'vehiculoRemolque' });
  // NUEVA ASOCIACIÓN: Un EquipoEspecial pertenece a un TipoEquipoEspecial
  EquipoEspecial.belongsTo(models.TipoEquipoEspecial, { foreignKey: 'tipoEquipoEspecialId', as: 'tipoEquipo' });
};

module.exports = EquipoEspecial;