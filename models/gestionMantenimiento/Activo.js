const { DataTypes } = require ('sequelize');
const CategoriaActivo = require ('./CategoriaActivo.js');
const sequelize = require ('../../sequelize.js');
const ModeloActivo = require('./ModeloActivo.js');

const Activo = sequelize.define('Activo', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  nombre: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  codigo: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  parentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'activos',
      key: 'id',
    }
  },
  status: {
    type: DataTypes.ENUM('operativo', 'en_mantenimiento', 'en_espera_de_repuesto', 'fuera_de_servicio'),
    defaultValue: 'operativo',
  },
  atributos_dinamicos: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  modeloActivoId: {
    type: DataTypes.INTEGER,
    references: { model: 'modelos_activos', key: 'id' }
  },
  
  // Almacena solo los valores que son únicos de esta unidad
  atributos_instancia: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  imagen_url: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'URL de la imagen específica de este activo'
  },
  well_latitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: true,
  },
  well_longitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: true,
  },
}, {
  tableName: 'activos',
  timestamps: true,
});

// Relaciones existentes...
Activo.belongsTo(Activo, { as: 'parent', foreignKey: 'parentId' });
Activo.hasMany(Activo, { as: 'children', foreignKey: 'parentId' });
Activo.belongsTo(CategoriaActivo, {
  foreignKey: 'categoriaId',
  as: 'categoria',
});
CategoriaActivo.hasMany(Activo, {
  foreignKey: 'categoriaId',
  as: 'activos',
});
Activo.belongsTo(ModeloActivo, { foreignKey: 'modeloActivoId' });
ModeloActivo.hasMany(Activo, { foreignKey: 'modeloActivoId' });

module.exports= Activo;