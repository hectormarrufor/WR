// models/inventario/ConsumibleUsado.js (Modificado)
const { DataTypes, Op } = require('sequelize');
const sequelize = require('../../sequelize');

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
    cantidad: {
      type: DataTypes.DECIMAL(15, 3),
      allowNull: false,
    },
    fechaUso: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
    // <--- CAMBIO CLAVE AQUI: AHORA APUNTA A TareaMantenimiento
    tareaMantenimientoId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'TareaMantenimientos', // Asegúrate que sea el nombre de la tabla de TareaMantenimiento
        key: 'id',
      },
      allowNull: true, // Puede ser null si el uso no es para una tarea específica (ej. para un trabajo extra)
    },
    trabajoExtraId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'TrabajosExtra',
        key: 'id',
      },
      allowNull: true,
    },
    empleadoId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Empleados',
        key: 'id',
      },
      allowNull: true,
    },
    destinoUso: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    notas: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    tableName: 'ConsumiblesUsados',
    timestamps: true,
    indexes: [
        {
            fields: ['tareaMantenimientoId'],
            where: { tareaMantenimientoId: { [Op.ne]: null } }
        },
        {
            fields: ['trabajoExtraId'],
            where: { trabajoExtraId: { [Op.ne]: null } }
        }
    ]
  });

  ConsumibleUsado.associate = (models) => {
    ConsumibleUsado.belongsTo(models.Consumible, { foreignKey: 'consumibleId', as: 'consumible' });
    ConsumibleUsado.belongsTo(models.TareaMantenimiento, { foreignKey: 'tareaMantenimientoId', as: 'tareaMantenimiento' }); // <--- NUEVA ASOCIACIÓN
    ConsumibleUsado.belongsTo(models.TrabajoExtra, { foreignKey: 'trabajoExtraId', as: 'trabajoExtra' });
    ConsumibleUsado.belongsTo(models.Empleado, { foreignKey: 'empleadoId', as: 'empleado' });
  };

  module.exports = ConsumibleUsado;
