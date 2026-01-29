const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const EquipoInstancia = sequelize.define('EquipoInstancia', {
  serialFabrica: { type: DataTypes.STRING, allowNull: true },
  fechaInstalacion: { type: DataTypes.DATE },
  voltajeOperacion: { type: DataTypes.STRING, comment: "110v, 220v, 440v" }
}, {
  tableName: 'EquiposInstancias'
});

EquipoInstancia.associate = (models) => {
  EquipoInstancia.belongsTo(models.Equipo, { foreignKey: 'equipoId', as: 'plantilla' });
  EquipoInstancia.hasOne(models.Activo, { foreignKey: 'equipoInstanciaId', as: 'activo', onDelete: 'CASCADE' });
}

module.exports = EquipoInstancia;