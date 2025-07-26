const { DataTypes } = require('sequelize');
const sequelize =require('../../sequelize');

const Categoria = sequelize.define('Categoria', {
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
  definicion: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  parentId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'GG_Categorias', // Se referencia a sí mismo
            key: 'id'
        },
    }
}, {
  tableName: 'GG_Categorias',
  timestamps: true,
  underscored: true,
});

Categoria.associate = (models) => {
    // Relación Many-to-Many con Grupo
    Categoria.belongsToMany(models.Grupo, {
        through: 'GG_CategoriaGrupos',
        foreignKey: 'categoriaId',
        otherKey: 'grupoId',
        as: 'gruposBase'
    });

    // Asociaciones para la jerarquía de categorías
    Categoria.hasMany(Categoria, { as: 'subCategorias', foreignKey: 'parentId' });
    Categoria.belongsTo(Categoria, { as: 'parent', foreignKey: 'parentId' });
};
module.exports = Categoria;