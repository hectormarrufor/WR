const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const Subsistema = sequelize.define('Subsistema', {
  nombre: { type: DataTypes.STRING, allowNull: false }, // Ej: Motor, Iluminación delantera
  categoria: { type: DataTypes.ENUM('motor', 'transmision', 'frenos', 'tren de rodaje', 'suspension', 'electrico', 'iluminacion', 'sistema de escape', 'sistema hidraulico', 'sistema de direccion','sistema de combustible', 'otros'), allowNull: false },


});

Subsistema.associate = (models) => {
  Subsistema.belongsTo(models.Vehiculo, { foreignKey: 'vehiculoId', as: 'vehiculo', onDelete: 'CASCADE' });
  Subsistema.belongsTo(models.Maquina, { foreignKey: 'maquinaId', as: 'maquina', onDelete: 'CASCADE' });
  Subsistema.belongsTo(models.Remolque, { foreignKey: 'remolqueId', as: 'remolque', onDelete: 'CASCADE' });
  Subsistema.belongsTo(models.Inmueble, { foreignKey: 'inmuebleId', as: 'inmueble', onDelete: 'CASCADE' });
  Subsistema.belongsTo(models.Equipo, { foreignKey: 'equipoId', as: 'equipo', onDelete: 'CASCADE' });
  Subsistema.hasMany(models.SubsistemaInstancia, { foreignKey: 'subsistemaId', as: 'instancias' , onDelete: 'CASCADE' });
  Subsistema.hasMany(models.ConsumibleRecomendado, { foreignKey: 'subsistemaId', as: 'listaRecomendada', onDelete: 'CASCADE' });
}

module.exports = Subsistema;