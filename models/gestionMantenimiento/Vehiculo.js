const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const Vehiculo = sequelize.define('Vehiculo', {
  marca: { type: DataTypes.STRING, allowNull: false },
  modelo: { type: DataTypes.STRING, allowNull: false },
  anio: { type: DataTypes.INTEGER, allowNull: true },
  numeroEjes: { type: DataTypes.INTEGER, allowNull: true },
  tipoVehiculo: { type: DataTypes.ENUM('Chuto', 'Carro', 'Camioneta', 'Moto', 'Bus', "Van", "Volqueta", "Camion"), allowNull: true },
  peso: { type: DataTypes.FLOAT, allowNull: true },
  imagen: { type: DataTypes.STRING, allowNull: true },
  capacidadArrastre: { type: DataTypes.FLOAT, allowNull: true },
  pesoMaximoCombinado: { type: DataTypes.FLOAT, allowNull: true },
  tipoCombustible: { type: DataTypes.ENUM('Gasolina', 'Diesel', 'Eléctrico', 'Híbrido', "Gas"), allowNull: true },
  consumoTeoricoLleno: { // Consumo teórico en litros por kilómetro cuando el vehículo está cargado al máximo
    type: DataTypes.FLOAT, 
    allowNull: true,
  },
  consumoTeoricoVacio: { // Consumo teórico en litros por kilómetro cuando el vehículo está vacío
    type: DataTypes.FLOAT, 
    allowNull: true,
  },
});

Vehiculo.associate = (models) => {
  Vehiculo.hasMany(models.VehiculoInstancia, { foreignKey: 'vehiculoId', as: 'instancias' , onDelete: 'CASCADE' });
  Vehiculo.hasMany(models.Subsistema, { foreignKey: 'vehiculoId', as: 'subsistemas', onDelete: 'CASCADE' });
}
module.exports = Vehiculo;