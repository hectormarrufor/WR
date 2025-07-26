const { DataTypes } = require('sequelize');
const CategoriaActivo = require('./CategoriaActivo.js');
const sequelize = require('../../sequelize.js');


const ModeloActivo = sequelize.define('ModeloActivo', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  nombre: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  parentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'modelos_activos', key: 'id' }
  },
  // Almacena los valores predefinidos para este modelo
  propiedades_definidas: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
}, {
  tableName: 'modelos_activos',
  timestamps: true,
});

ModeloActivo.belongsTo(ModeloActivo, { as: 'parent', foreignKey: 'parentId' });
ModeloActivo.hasMany(ModeloActivo, { as: 'children', foreignKey: 'parentId' });
ModeloActivo.belongsTo(CategoriaActivo, { foreignKey: 'categoriaId' });
// CategoriaActivo.hasMany(ModeloActivo, { foreignKey: 'categoriaId' }); DUDOOOOOOSOOOOO

module.exports = ModeloActivo;