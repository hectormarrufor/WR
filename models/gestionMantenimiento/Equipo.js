const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const Equipo = sequelize.define('Equipo', {
  marca: { type: DataTypes.STRING, allowNull: false },
  modelo: { type: DataTypes.STRING, allowNull: false },
  tipoEquipo: { 
    type: DataTypes.ENUM('Aire Acondicionado', 'Planta Eléctrica', 'Bomba de Agua', 'Compresor', 'Sistema CCTV', 'Portón Eléctrico', 'Otro'),
    allowNull: false 
  },
  // Guardamos specs técnicas flexibles en un JSON para no llenar la tabla de columnas nulas
  especificaciones: { 
    type: DataTypes.JSON, 
    defaultValue: {}, 
    comment: "Ej: { btu: 18000, voltaje: 220, hp: 2.5 }" 
  },
  imagen: { type: DataTypes.STRING }
});

Equipo.associate = (models) => {
  // Un Equipo (Ej: Aire Split) tiene subsistemas internos (Ej: Unidad Condensadora, Evaporadora)
  Equipo.hasMany(models.Subsistema, { foreignKey: 'equipoId', as: 'subsistemas', onDelete: 'CASCADE' });
  
  Equipo.hasMany(models.EquipoInstancia, { foreignKey: 'equipoId', as: 'instancias', onDelete: 'CASCADE' });
}

module.exports = Equipo;