const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const SubsistemaInstancia = sequelize.define('SubsistemaInstancia', {
  nombre: { type: DataTypes.STRING, allowNull: false }, // Copia del nombre del subsistema
},
{
  tableName: 'SubsistemaInstancias'
});


SubsistemaInstancia.associate = (models) => {
  SubsistemaInstancia.belongsTo(models.Activo, { foreignKey: 'activoId', as: 'activo' });
  SubsistemaInstancia.belongsTo(models.Subsistema, { foreignKey: 'subsistemaId', as: 'subsistemaPlantilla' });
  SubsistemaInstancia.hasMany(models.ConsumibleUsado, { foreignKey: 'subsistemaInstanciaId', as: 'instalaciones' , onDelete: 'CASCADE' });
};
module.exports = SubsistemaInstancia;