// models/TrabajoExtra.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');


  const TrabajoExtra = sequelize.define('TrabajoExtra', {
    // ... (campos existentes) ...
    // Si hay un repuesto o material involucrado
    consumibleId: { // <--- CAMBIADO de 'repuestoId' a 'consumibleId'
      type: DataTypes.INTEGER,
      references: {
        model: 'Consumibles', // <--- Nombre de tu tabla de consumibles/inventario
        key: 'id',
      },
      allowNull: true,
    },
    cantidadConsumible: { // <--- CAMBIADO de 'cantidadRepuesto'
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    notasSalidaConsumible: { // <--- CAMBIADO de 'notasSalidaRepuesto'
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    tableName: 'TrabajosExtra',
    timestamps: true,
  });

  TrabajoExtra.associate = (models) => {
    // ... (otras asociaciones) ...
    TrabajoExtra.belongsTo(models.Consumible, { foreignKey: 'consumibleId', as: 'consumibleSolicitado' }); // Renombre el alias para claridad
    TrabajoExtra.hasMany(models.ConsumibleUsado, { foreignKey: 'trabajoExtraId', as: 'consumiblesUsados' }); // Para registrar usos múltiples
  };

  module.exports= TrabajoExtra;