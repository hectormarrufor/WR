const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const Subsistema = sequelize.define('Subsistema', {
  nombre: { type: DataTypes.STRING, allowNull: false }, // Ej: Motor, Iluminación delantera
  categoria: { type: DataTypes.ENUM('motor', 'transmision', 'frenos', 'tren de rodaje', 'suspension', 'electrico', 'iluminacion', 'sistema de escape', 'sistema hidraulico', 'sistema de direccion','sistema de combustible', 'otros'), allowNull: false },


});

Subsistema.associate = (models) => {
  Subsistema.belongsTo(models.Vehiculo, { foreignKey: 'vehiculoId', as: 'vehiculo' });
  Subsistema.belongsTo(models.Maquina, { foreignKey: 'maquinaId', as: 'maquina' });
  Subsistema.belongsTo(models.Remolque, { foreignKey: 'remolqueId', as: 'remolque' });
  Subsistema.hasMany(models.SubsistemaInstancia, { foreignKey: 'subsistemaId', as: 'instancias' });
  Subsistema.hasMany(models.ConsumibleRecomendado, { foreignKey: 'subsistemaId', as: 'listaRecomendada' });
}

module.exports = Subsistema;