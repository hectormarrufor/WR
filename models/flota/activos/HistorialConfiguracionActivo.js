const { DataTypes } = require('sequelize');
const sequelize = require('../../../sequelize');

const HistorialConfiguracionActivo = sequelize.define('HistorialConfiguracionActivo', {
  id_historial_configuracion: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  punto_montaje: {
    type: DataTypes.STRING(255),
    comment: 'Ej: "Montaje de Skid Principal", "Posición de Grúa 1"',
  },
  fecha_montaje: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  fecha_desmontaje: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Nulo si todavía está montado.',
  },
}, {
  tableName: 'HistorialConfiguracionActivo',
  timestamps: false,
});

HistorialConfiguracionActivo.associate = (models) => {
  HistorialConfiguracionActivo.belongsTo(models.Activo, { as: 'ActivoBase', foreignKey: 'id_activo_base' });
  HistorialConfiguracionActivo.belongsTo(models.Activo, { as: 'ActivoModular', foreignKey: 'id_activo_modular' });
};

module.exports = HistorialConfiguracionActivo;