import { DataTypes } from 'sequelize';
import Activo from './Activo.js';
import sequelize from '../../sequelize.js';

const Componente = sequelize.define('Componente', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  nombre: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  descripcion: {
    type: DataTypes.TEXT,
  },
  numero_serie: {
    type: DataTypes.STRING,
    unique: true,
  },
}, {
  tableName: 'componentes',
  timestamps: true,
});

Activo.hasMany(Componente, {
  foreignKey: 'activoId',
  as: 'componentes',
});

Componente.belongsTo(Activo, {
  foreignKey: 'activoId',
  as: 'activo',
});

export default Componente;