import { DataTypes } from 'sequelize';
import CategoriaActivo from './CategoriaActivo.js';
import sequelize from '../../sequelize.js';

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

export default Activo;