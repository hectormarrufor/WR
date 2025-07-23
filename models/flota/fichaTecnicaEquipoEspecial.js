// models/flota/fichaTecnicaEquipoEspecial.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize'); // Asegúrate que la ruta es correcta

const FichaTecnicaEquipoEspecial = sequelize.define('FichaTecnicaEquipoEspecial', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  equipoEspecialId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    references: {
      model: 'EquiposEspeciales',
      key: 'id',
    },
  },
  especificaciones: { // ¡NUEVO CAMPO! Contendrá todo el árbol de clave:valor dinámico
    type: DataTypes.JSONB,
    defaultValue: {}, // Se inicializa como un objeto JSON vacío
    allowNull: false, // Debe existir, aunque esté vacío
  },
}, {
  tableName: 'FichasTecnicasEquiposEspeciales',
  timestamps: true,
});

FichaTecnicaEquipoEspecial.associate = (models) => {
  FichaTecnicaEquipoEspecial.belongsTo(models.EquipoEspecial, { foreignKey: 'equipoEspecialId'});
};

module.exports = FichaTecnicaEquipoEspecial;