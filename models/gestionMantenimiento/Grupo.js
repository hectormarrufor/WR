const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize.js');

const Grupo = sequelize.define('Grupo', {
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
  // La plantilla del formulario para este grupo:
  definicion: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
  },
  parentId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'Grupos', // Se referencia a sí mismo
            key: 'id'
        },
    }
}, {
  tableName: 'Grupos',
  timestamps: true,
});

// Definimos la asociación para la jerarquía
Grupo.hasMany(Grupo, { as: 'subGrupos', foreignKey: 'parentId' });
Grupo.belongsTo(Grupo, { as: 'parent', foreignKey: 'parentId' });

module.exports = Grupo;