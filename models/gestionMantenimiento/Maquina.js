const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const Maquina = sequelize.define('Maquina', {
  marca: { type: DataTypes.STRING, allowNull: false },
  modelo: { type: DataTypes.STRING, allowNull: false },
  anio: { type: DataTypes.INTEGER, allowNull: true },
  peso: { type: DataTypes.FLOAT, allowNull: true },
  capacidadLevante: { type: DataTypes.FLOAT, allowNull: true },
  capacidadCucharon: { type: DataTypes.FLOAT, allowNull: true },
  alcanceMaximo: { type: DataTypes.FLOAT, allowNull: true },
  traccion: { type: DataTypes.ENUM('oruga', 'ruedas'), allowNull: true },
  tipo: { type: DataTypes.ENUM('Retroexcavadora', 'Taladro', 'Montacargas', 'Jumbo', 'Grua'), allowNull: false }, // Ej: "soldadora"
  potencia: { type: DataTypes.STRING, allowNull: true }
});

Maquina.associate = (models) => {
  Maquina.hasMany(models.MaquinaInstancia, { foreignKey: 'maquinaId', as: 'instancias' });
  Maquina.hasMany(models.Subsistema, { foreignKey: 'maquinaId', as: 'subsistemas' });
  Maquina.belongsTo(models.Activo, { foreignKey: 'activoId' });
  
}

module.exports = Maquina;