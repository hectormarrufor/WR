const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const MaquinaInstancia = sequelize.define('MaquinaInstancia', {
  tipo: { type: DataTypes.STRING, allowNull: false }, // Ej: "soldadora"
  potencia: { type: DataTypes.STRING, allowNull: true }
});

MaquinaInstancia.associate = (models) => {
  MaquinaInstancia.hasMany(models.MaquinaInstanciaInstancia, { foreignKey: 'MaquinaInstanciaId', as: 'instancias' });
  MaquinaInstancia.hasMany(models.Subsistema, { foreignKey: 'MaquinaInstanciaId', as: 'subsistemas' });
  MaquinaInstancia.belongsTo(models.Activo, { foreignKey: 'activoId' });
  
}

module.exports = MaquinaInstancia;