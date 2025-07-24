const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const Tecnico = sequelize.define('Tecnico', {
  id_tecnico: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  nombre_completo: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  especialidad: {
    type: DataTypes.STRING(100),
  },
}, {
  tableName: 'Tecnicos',
  timestamps: true,
});

Tecnico.associate = (models) => {
  Tecnico.belongsToMany(models.OrdenTrabajo, { through: models.ManoDeObraOrdenTrabajo, foreignKey: 'id_tecnico' });
};

module.exports = Tecnico;