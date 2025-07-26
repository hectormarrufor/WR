const { DataTypes } = require('sequelize');
const sequelize =require('../../sequelize');

const CategoriaActivo = sequelize.define('CategoriaActivo', {
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
  descripcion: {
    type: DataTypes.TEXT,
  },
  parentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'categorias_activos', key: 'id' }
  },
  definicion_formulario_propia: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  valores_predeterminados: {
      type: DataTypes.JSONB,
      allowNull: true,
  }
}, {
  tableName: 'categorias_activos',
  timestamps: true,
});

CategoriaActivo.belongsTo(CategoriaActivo, { as: 'parent', foreignKey: 'parentId' });
CategoriaActivo.hasMany(CategoriaActivo, { as: 'children', foreignKey: 'parentId' });

module.exports = CategoriaActivo;