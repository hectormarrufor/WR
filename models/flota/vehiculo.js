const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const Vehiculo = sequelize.define(
  'Vehiculo',
  {
    marca: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    modelo: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    imagen: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    placa: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    vin: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    ano: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    color: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    estadoOperativoGeneral: { // <-- Nuevo campo para el estado general
      type: DataTypes.ENUM('Operativo', 'Operativo con Advertencias', 'No Operativo', 'En Taller', 'Desconocido'),
      defaultValue: 'Desconocido',
      allowNull: false,
    },


  },
  {
    tableName: 'Vehiculos',
    timestamps: true,
  }
);

Vehiculo.associate = (models) => {
  Vehiculo.hasOne(models.FichaTecnica, { foreignKey: 'vehiculoId', as: 'fichaTecnica' });
  Vehiculo.hasMany(models.Kilometraje, { foreignKey: 'vehiculoId', as: 'kilometrajes' });
  Vehiculo.hasMany(models.Horometro, { foreignKey: 'vehiculoId', as: 'horometros' });
  Vehiculo.hasMany(models.EstadoSistemaVehiculo, { foreignKey: 'vehiculoId', as: 'estadosSistemas' }); // Nueva asociación
  Vehiculo.hasMany(models.AsignacionVehiculoMudanza, { foreignKey: 'vehiculoId', as: 'asignacionesMudanza' });
  Vehiculo.hasMany(models.AsignacionVehiculoOperacion, { foreignKey: 'vehiculoId', as: 'asignacionesOperacion' });
  Vehiculo.hasMany(models.Mantenimiento, {
    foreignKey: 'activoId', constraints: false, scope: { activoTipo: 'vehiculo' }, as: 'historialMantenimiento'
  });
  Vehiculo.hasMany(models.Inspeccion, {
    foreignKey: 'inspeccionableId', constraints: false, scope: { inspeccionableTipo: 'vehiculo' }, as: 'historialInspecciones'
  });
  // ... dentro del método Vehiculo.associate = (models) => { ... }

  Vehiculo.hasOne(models.Motor, { foreignKey: 'vehiculoId', as: 'Motor' });
  Vehiculo.hasOne(models.Transmision, { foreignKey: 'vehiculoId', as: 'Transmision' });
  Vehiculo.hasOne(models.PTO, { foreignKey: 'vehiculoId', as: 'PTO' });
  Vehiculo.hasOne(models.BombaDireccion, { foreignKey: 'vehiculoId', as: 'BombaDireccion' });
  Vehiculo.hasOne(models.CompresorAire, { foreignKey: 'vehiculoId', as: 'CompresorAire' });

  Vehiculo.hasMany(models.ActivoDeUnidad, {
    foreignKey: 'activoId',
    constraints: false, // Requerido para asociaciones polimórficas
    scope: {
      activoTipo: 'vehiculo' // Define el tipo para la tabla polimórfica
    },
    as: 'asignacionesDeUnidad'
  });
  Vehiculo.hasOne(models.TipoVehiculo, { foreignKey: 'vehiculoId' });
  // ... resto de tus asociaciones ...

};

module.exports = Vehiculo;