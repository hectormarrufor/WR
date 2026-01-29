const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const Inmueble = sequelize.define('Inmueble', {
  nombre: { type: DataTypes.STRING, allowNull: false }, // Ej: "Oficina Tipo A", "Galpón Depósito"
  tipo: { 
    type: DataTypes.ENUM('Edificio', 'Galpón', 'Oficina', 'Terreno', 'Casa', 'Puesto de Control'),
    allowNull: false 
  },
  descripcion: { type: DataTypes.TEXT },
  areaPromedio: { type: DataTypes.FLOAT, comment: "Metros cuadrados aproximados" }
});

Inmueble.associate = (models) => {
  // Un modelo de inmueble (Ej: Oficina) tiene subsistemas estándar (Ej: Iluminación, Baños)
  Inmueble.hasMany(models.Subsistema, { foreignKey: 'inmuebleId', as: 'subsistemas', onDelete: 'CASCADE' });
  
  // Instancias reales creadas a partir de esta plantilla
  Inmueble.hasMany(models.InmuebleInstancia, { foreignKey: 'inmuebleId', as: 'instancias', onDelete: 'CASCADE' });
}

module.exports = Inmueble;