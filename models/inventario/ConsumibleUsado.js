// models/inventario/ConsumibleUsado.js (Modificado)
const { DataTypes, Op } = require('sequelize');
const sequelize = require('../../sequelize');

const ConsumibleUsado = sequelize.define('ConsumibleUsado', {
  cantidad: {
    type: DataTypes.FLOAT, // Float por si usas litros de aceite, etc.
    allowNull: false,
    defaultValue: 1, // Para serializados siempre es 1. Para fungibles, la cantidad descontada.
  },
  fechaInstalacion: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false,
  },
  vidaUtilInicial: {
    type: DataTypes.FLOAT, // Vida útil en horas o kilómetros al momento de la instalación
  }


}, {
  tableName: 'ConsumiblesUsados',
  timestamps: true,
  indexes: [
    {
      fields: ['subsistemaInstanciaId']
    },
    {
      fields: ['consumibleSerializadoId'],
      unique: true, // Un ítem serializado físico no puede estar en dos sitios a la vez (mientras esté activo)
      where: {
        consumibleSerializadoId: { [DataTypes.Op.ne]: null }
      }
    }
  ]
});

ConsumibleUsado.associate = (models) => {
  ConsumibleUsado.belongsTo(models.ConsumibleSerializado, { foreignKey: 'consumibleSerializadoId', as: 'serializado' });
  ConsumibleUsado.belongsTo(models.SubsistemaInstancia, { foreignKey: 'subsistemaInstanciaId' });
  ConsumibleUsado.belongsTo(models.Consumible, { foreignKey: 'consumibleId' , as: 'consumible'});
  ConsumibleUsado.belongsTo(models.TareaMantenimiento, { foreignKey: 'tareaMantenimientoId' });
};

module.exports = ConsumibleUsado;
