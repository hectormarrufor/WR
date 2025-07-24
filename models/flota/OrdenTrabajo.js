const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const OrdenTrabajo = sequelize.define('OrdenTrabajo', {
  id_orden_trabajo: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  prioridad: {
    type: DataTypes.ENUM('Critica', 'Alta', 'Media', 'Baja'),
    defaultValue: 'Media',
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  fecha_solicitud: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  fecha_completado: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'OrdenesTrabajo',
  timestamps: true,
});

OrdenTrabajo.associate = (models) => {
  OrdenTrabajo.belongsTo(models.Activo, { foreignKey: 'id_activo' });
  OrdenTrabajo.belongsTo(models.TipoOrdenTrabajo, { foreignKey: 'id_tipo_orden_trabajo' });
  OrdenTrabajo.belongsTo(models.EstadoOrdenTrabajo, { foreignKey: 'id_estado_orden_trabajo' });
  OrdenTrabajo.belongsTo(models.Usuario, { as: 'Solicitante', foreignKey: 'id_usuario_solicitante' });
  OrdenTrabajo.belongsTo(models.CodigoFalla, { foreignKey: 'id_codigo_falla' });

  // Relación muchos a muchos con Partes y Técnicos
  OrdenTrabajo.belongsToMany(models.ParteInventario, { through: models.PartesOrdenTrabajo, foreignKey: 'id_orden_trabajo' });
  OrdenTrabajo.belongsToMany(models.Tecnico, { through: models.ManoDeObraOrdenTrabajo, foreignKey: 'id_orden_trabajo' });
};

module.exports = OrdenTrabajo;