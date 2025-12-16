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
  // Origen del hallazgo
  inspeccionId: { 
    type: DataTypes.INTEGER,
    allowNull: true, // Puede venir de una inspección formal...
    references: { model: 'inspecciones', key: 'id' }
  },
  reportadoPorId: { // ...o ser un reporte manual de un conductor
    type: DataTypes.INTEGER,
    allowNull: true
  },
  // Ubicación del problema (CRUCIAL para tu lógica nueva)
  subsistemaInstanciaId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'subsistema_instancias', key: 'id' }
  },
  // Resolución
  ordenMantenimientoId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: "La orden que se creó para corregir este hallazgo",
    references: { model: 'ordenes_mantenimiento', key: 'id' }
  }
}, {
  tableName: 'hallazgos',
  timestamps: true
});

Hallazgo.associate = function(models) {
  Hallazgo.belongsTo(models.Inspeccion, {
    foreignKey: 'inspeccionId',
    as: 'inspeccion'
  });
  Hallazgo.belongsTo(models.OrdenMantenimiento, {
    foreignKey: 'ordenMantenimientoId',
    as: 'ordenMantenimiento'
  });
};


module.exports = Hallazgo;