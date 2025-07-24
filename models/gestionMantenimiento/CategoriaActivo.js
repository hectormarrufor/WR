import { DataTypes } from 'sequelize';
import sequelize from '../../sequelize';

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
}, {
  tableName: 'categorias_activos',
  timestamps: true,
});

export default CategoriaActivo;