import { DataTypes } from 'sequelize';
import sequelize from '../../sequelize';

const Repuesto = sequelize.define('Repuesto', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  nombre: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  sku: { // Stock Keeping Unit
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  descripcion: {
    type: DataTypes.TEXT,
  },
  // Puedes añadir más campos como proveedor, etc.
}, {
  tableName: 'repuestos',
  timestamps: true,
});

export default Repuesto;