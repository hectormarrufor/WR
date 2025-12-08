// models/inventario/ConsumibleUsado.js (Modificado)
const { DataTypes, Op } = require('sequelize');
const sequelize = require('../../sequelize');
const { Consumible } = require('./Consumible');

  const ConsumibleUsado = sequelize.define('ConsumibleUsado', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    consumibleId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Consumibles',
        key: 'id',
      },
      allowNull: false,
    },
    activoId:{
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Activos',
        key: 'id',
      },
    },
    fechaInstalacion: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
    // <--- CAMBIO CLAVE AQUI: AHORA APUNTA A TareaMantenimiento
    tareaMantenimientoId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'TareasMantenimiento', // Asegúrate que sea el nombre de la tabla de TareaMantenimiento
        key: 'id',
      },
      allowNull: true, // Puede ser null si el uso no es para una tarea específica (ej. para un trabajo extra)
    },

  }, {
    tableName: 'ConsumiblesUsados',
    timestamps: true,
  });

  ConsumibleUsado.associate = (models) => {
    ConsumibleUsado.belongsTo(models.Consumible, { foreignKey: 'consumibleId', as: 'consumible' });
    ConsumibleUsado.belongsTo(models.TareaMantenimiento, { foreignKey: 'tareaMantenimientoId', as: 'tareaMantenimiento' }); // <--- NUEVA ASOCIACIÓN
    ConsumibleUsado.belongsTo(models.Activo, { foreignKey: 'activoId', as: 'activo' });
  };

  module.exports = ConsumibleUsado;
