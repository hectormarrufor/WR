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
  Subsistema.hasMany(models.ConsumibleRecomendado, { foreignKey: 'subsistemaId', as: 'recomendados' });
}

Subsistema.afterCreate(async (subsistema, options) => {
  const { VehiculoInstancia, SubsistemaInstancia } = subsistema.sequelize.models;

  const instancias = await VehiculoInstancia.findAll({
    where: { vehiculoId: subsistema.vehiculoId },
    transaction: options.transaction
  });

  for (const instancia of instancias) {
    await SubsistemaInstancia.create({
      vehiculoInstanciaId: instancia.id,
      subsistemaId: subsistema.id,
      nombre: subsistema.nombre
    }, { transaction: options.transaction });
  }
});


module.exports = Subsistema;