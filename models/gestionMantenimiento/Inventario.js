import { DataTypes } from 'sequelize';
import Repuesto from './Repuesto.js';
import sequelize from '../../sequelize.js';

const Inventario = sequelize.define('Inventario', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  cantidad: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  ubicacion: { // Bodega, Almacén principal, etc.
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  tableName: 'inventario',
  timestamps: true,
});

Repuesto.hasOne(Inventario, { foreignKey: 'repuestoId', as: 'stock' });
Inventario.belongsTo(Repuesto, { foreignKey: 'repuestoId', as: 'repuesto' });

export default Inventario;