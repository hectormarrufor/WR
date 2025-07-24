const { DataTypes } = require('sequelize');
const sequelize = require('../../../sequelize');

const Activo = sequelize.define('Activo', {
  id_activo: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  etiqueta_activo: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    comment: 'Identificador legible por humanos (NIV, S/N, etc.).',
  },
  nombre_activo: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  modelo: {
    type: DataTypes.STRING(100),
  },
  fecha_compra: {
    type: DataTypes.DATE,
  },
}, {
  tableName: 'Activos',
  timestamps: true,
});

Activo.associate = (models) => {
  // Relación con TipoActivo
  Activo.belongsTo(models.TipoActivo, { foreignKey: 'id_tipo_activo' });
  // Relación con Fabricante
  Activo.belongsTo(models.Fabricante, { foreignKey: 'id_fabricante' });
  // Relación con EstadoActivo
  Activo.belongsTo(models.EstadoActivo, { foreignKey: 'id_estado_activo' });
  // Relación con Ubicacion
  Activo.belongsTo(models.Ubicacion, { foreignKey: 'id_ubicacion' });

  // Jerarquía (Padre-Hijo) - Relación muchos a muchos consigo mismo
  Activo.belongsToMany(models.Activo, {
    as: 'Hijos',
    through: models.JerarquiaActivos,
    foreignKey: 'id_activo_padre',
  });
  Activo.belongsToMany(models.Activo, {
    as: 'Padres',
    through: models.JerarquiaActivos,
    foreignKey: 'id_activo_hijo',
  });

  // Relaciones con Historial de Configuración (para modularidad)
  Activo.hasMany(models.HistorialConfiguracionActivo, { as: 'ConfiguracionesComoBase', foreignKey: 'id_activo_base' });
  Activo.hasMany(models.HistorialConfiguracionActivo, { as: 'ConfiguracionesComoModular', foreignKey: 'id_activo_modular' });

  // Relación con Ordenes de Trabajo
  Activo.hasMany(models.OrdenTrabajo, { foreignKey: 'id_activo' });
};

module.exports = Activo;