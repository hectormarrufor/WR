const { DataTypes } = require('sequelize');
const sequelize = require('../../../sequelize');

const ComponenteMayor = sequelize.define('ComponenteMayor', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  tipoComponente: {
    type: DataTypes.ENUM('Skid de Bombeo', 'Power Pack', 'Winche', 'Carrete', 'Cabria', 'BOP'),
    allowNull: false,
  },
  marca: { type: DataTypes.STRING, allowNull: false },
  modelo: { type: DataTypes.STRING, allowNull: false },
  serial: { type: DataTypes.STRING, allowNull: false, unique: true },
  
  // Puedes añadir campos de mantenimiento específicos si lo deseas
  horasDeUso: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
  fechaUltimoServicio: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  notasMantenimiento: {
    type: DataTypes.TEXT,
  }
}, {
  tableName: 'ComponentesMayores',
  timestamps: true,
});

ComponenteMayor.associate = (models) => {
  // Un Componente Mayor puede pertenecer a MUCHAS Unidades Operativas (a través de la tabla de unión)
  ComponenteMayor.hasMany(models.ActivoDeUnidad, {
    foreignKey: 'activoId',
    constraints: false, // Requerido para asociaciones polimórficas
    scope: {
      activoTipo: 'componenteMayor' // Define el tipo para la tabla polimórfica
    },
    as: 'asignacionesDeUnidad'
  });
  ComponenteMayor.hasMany(models.Mantenimiento, {
  foreignKey: 'activoId', constraints: false, scope: { activoTipo: 'componenteMayor' }, as: 'historialMantenimiento'
});
ComponenteMayor.hasMany(models.Inspeccion, {
  foreignKey: 'inspeccionableId', constraints: false, scope: { inspeccionableTipo: 'componenteMayor' }, as: 'historialInspecciones'
});
};

module.exports = ComponenteMayor;