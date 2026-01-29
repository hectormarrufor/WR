const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const InmuebleInstancia = sequelize.define('InmuebleInstancia', {
  // Datos específicos que no están en la tabla Activo general
  direccionEspecifica: { type: DataTypes.STRING, comment: "Ej: Ala Norte, Piso 2" },
  catastro: { type: DataTypes.STRING, allowNull: true },
  areaReal: { type: DataTypes.FLOAT },
}, {
  tableName: 'InmueblesInstancias'
});

InmuebleInstancia.associate = (models) => {
  // Relación con su Plantilla
  InmuebleInstancia.belongsTo(models.Inmueble, { foreignKey: 'inmuebleId', as: 'plantilla' });
  
  // Relación 1 a 1 con Activo (El papá de los helados)
  InmuebleInstancia.hasOne(models.Activo, { foreignKey: 'inmuebleInstanciaId', as: 'activo', onDelete: 'CASCADE' });
}

module.exports = InmuebleInstancia;