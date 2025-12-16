const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const Subsistema = sequelize.define('Subsistema', {
  activoId: { type: DataTypes.INTEGER, allowNull: false },
  nombre: { type: DataTypes.STRING, allowNull: false } // Ej: Motor, Iluminación delantera
});

Subsistema.associate = (models) => {
  Subsistema.belongsTo(models.Vehiculo, { foreignKey: 'vehiculoId', as: 'vehiculo' });
  Subsistema.belongsTo(models.Maquina, { foreignKey: 'maquinaId', as: 'maquina' });
  Subsistema.belongsTo(models.Remolque, { foreignKey: 'remolqueId', as: 'remolque' });
  Subsistema.hasMany(models.SubsistemaInstancia, { foreignKey: 'subsistemaId', as: 'instancias' });
  Subsistema.hasMany(models.ConsumibleRecomendado, { foreignKey: 'subsistemaId', as: 'listaRecomendada' });
}

module.exports = Subsistema;