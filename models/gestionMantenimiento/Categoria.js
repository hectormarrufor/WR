const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

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
  acronimo: {
    type: DataTypes.STRING,
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
      model: 'Categorias',
      key: 'id'
    },
  }
}, {
  tableName: 'Categorias',
  timestamps: true,
  hooks: {
    /**
     * afterCreate hook: si la nueva categoría tiene parentId y no tiene asociaciones
     * explícitas (se asume que el flujo de creación de la API no añadió asociaciones),
     * copia las filas de CategoriaGrupos del padre al nuevo registro.
     */
    async afterCreate(categoria, options) {
      // si no hay parent, nada que copiar
      if (!categoria.parentId) return;

      // options.transaction puede venir de la creación; úsalo si está presente
      const transaction = options.transaction || null;

      // Intentamos acceder a la tabla intermedia a través de sequelize.models
      const CategoriaGrupos = categoria.sequelize.models.CategoriaGrupos;

      if (!CategoriaGrupos) {
        // si no existe el modelo, no hacemos nada (fallback silencioso)
        return;
      }

      // Buscar asociaciones del padre
      const rows = await CategoriaGrupos.findAll({
        where: { categoriaId: categoria.parentId },
        transaction
      });

      if (!rows || rows.length === 0) return;

      // Insertar asociaciones para la nueva categoria (evitar duplicados)
      const inserts = rows.map(r => ({
        categoriaId: categoria.id,
        grupoId: r.grupoId
      }));

      // bulkCreate con ignoreDuplicates si tu driver lo soporta; aquí usamos bulkCreate por simplicidad
      try {
        await CategoriaGrupos.bulkCreate(inserts, { transaction });
      } catch (err) {
        // Si hay conflicto por unique constraint, lo ignoramos (no queremos fallar la creación)
        // Puedes loguearlo para auditoría
        console.error('Error copiando CategoriaGrupos en afterCreate:', err);
      }
    }
  }
});

Categoria.associate = (models) => {
  // Relación Many-to-Many con Grupo
  Categoria.belongsToMany(models.Grupo, {
    through: 'CategoriaGrupos',
    foreignKey: 'categoriaId',
    otherKey: 'grupoId',
    as: 'gruposBase'
  });

  // Asociaciones para la jerarquía de categorías
  Categoria.hasMany(Categoria, { as: 'subCategorias', foreignKey: 'parentId' });
  Categoria.belongsTo(Categoria, { as: 'parent', foreignKey: 'parentId' });
};

module.exports = Categoria;