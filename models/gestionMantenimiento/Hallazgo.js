const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const Hallazgo = sequelize.define('Hallazgo', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  prioridad: {
    type: DataTypes.ENUM('Baja', 'Media', 'Alta', 'Critica'),
    defaultValue: 'Media'
  },
  estado: {
    type: DataTypes.ENUM('Pendiente', 'En Proceso', 'Corregido', 'Descartado'),
    defaultValue: 'Pendiente'
  },
  fechaDeteccion: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
}, {
  tableName: 'hallazgos',
  timestamps: true
});

Hallazgo.associate = function(models) {
  Hallazgo.belongsTo(models.Inspeccion, {
    foreignKey: 'inspeccionId',
    as: 'inspeccion'
  });
  Hallazgo.belongsTo(models.Mantenimiento, {
    foreignKey: 'mantenimientoId',
    as: 'mantenimiento'
  });
};


module.exports = Hallazgo;