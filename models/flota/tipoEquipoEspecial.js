// models/flota/tipoEquipoEspecial.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize'); // Asegúrate que la ruta es correcta

const TipoEquipoEspecial = sequelize.define('TipoEquipoEspecial', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  nombre: { // Ej: "Coiled Tubing Unit (CTU)", "Taladro de Perforación", "Unidad de Snubbing"
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'TiposEquiposEspeciales',
  timestamps: true,
});

// No hay asociaciones directas aquí, pero EquipoEspecial hará referencia a este modelo.
TipoEquipoEspecial.associate = (models) => {
  // Un TipoEquipoEspecial puede tener muchos EquiposEspeciales
  TipoEquipoEspecial.hasMany(models.EquipoEspecial, { foreignKey: 'tipoEquipoEspecialId', as: 'equiposEspeciales' });
};

module.exports = TipoEquipoEspecial;