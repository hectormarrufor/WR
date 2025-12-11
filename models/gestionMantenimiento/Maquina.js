const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const Maquina = sequelize.define('Maquina', {
  tipo: { type: DataTypes.STRING, allowNull: false }, // Ej: "soldadora"
  potencia: { type: DataTypes.STRING, allowNull: true }
});

Maquina.associate = (models) => {
  Maquina.hasMany(models.MaquinaInstancia, { foreignKey: 'maquinaId', as: 'instancias' });
  Maquina.hasMany(models.Subsistema, { foreignKey: 'maquinaId', as: 'subsistemas' });
  Maquina.belongsTo(models.Activo, { foreignKey: 'activoId' });
  
}

module.exports = Maquina;