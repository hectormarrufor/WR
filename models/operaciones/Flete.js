const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const Flete = sequelize.define('Flete', {
  nroFlete: { type: DataTypes.STRING, unique: true }, // Frontend envía nroFlete
  descripcion: { type: DataTypes.STRING, allowNull: true },
  clienteId: { type: DataTypes.INTEGER, allowNull: false },

  // Recursos Asignados
  choferId: { type: DataTypes.INTEGER, allowNull: false },
  ayudanteId: { type: DataTypes.INTEGER, allowNull: true },
  activoPrincipalId: { type: DataTypes.INTEGER, allowNull: false }, 
  remolqueId: { type: DataTypes.INTEGER, allowNull: true }, 

  // Ruta y Logística
  origen: { type: DataTypes.STRING, defaultValue: 'Base DADICA - Tía Juana' },
  destino: { type: DataTypes.STRING, allowNull: false },
  coordenadasDestino: { type: DataTypes.JSON, allowNull: true }, 
  distanciaKm: { type: DataTypes.FLOAT }, 
  cantidadPeajes: { type: DataTypes.INTEGER, defaultValue: 0 },
  costoPeajesTotal: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  
  // 🔥 MAPAS Y TRAMOS 🔥
  waypoints: { type: DataTypes.JSON, allowNull: true },
  tramos: { type: DataTypes.JSON, allowNull: true },

  // Tiempos
  fechaSalida: { type: DataTypes.DATE, allowNull: false },
  fechaRetorno: { type: DataTypes.DATE, allowNull: true }, 

  estado: { type: DataTypes.ENUM('programado', 'en_ruta', 'completado', 'cancelado'), defaultValue: 'programado' },
  observaciones: { type: DataTypes.TEXT, allowNull: true },

  // 🔥 FINANZAS Y COTIZACIÓN 🔥
  costoEstimado: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  precioSugerido: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  tonelaje: { type: DataTypes.FLOAT, allowNull: true },
  tipoCarga: { type: DataTypes.STRING, defaultValue: 'general' }, 
  horasEstimadas: { type: DataTypes.FLOAT, allowNull: true },
  
  // 🔥 EL SNAPSHOT FINANCIERO 🔥
  breakdown: { type: DataTypes.JSON, allowNull: true }, 
  
  // Auditoría
  creadoPor: { type: DataTypes.INTEGER, allowNull: true }
});

// Relaciones
Flete.associate = (models) => {
  Flete.belongsTo(models.Cliente, { foreignKey: 'clienteId' });
  Flete.belongsTo(models.Empleado, { as: 'chofer', foreignKey: 'choferId' });
  Flete.belongsTo(models.Empleado, { as: 'ayudante', foreignKey: 'ayudanteId' });
  Flete.belongsTo(models.Activo, { as: 'vehiculo', foreignKey: 'activoPrincipalId' });
  Flete.belongsTo(models.Activo, { as: 'remolque', foreignKey: 'remolqueId' });
  
  // Si User está definido en tus modelos, lo enlazamos al creador
  if (models.User) {
      Flete.belongsTo(models.User, { foreignKey: 'creadoPor', as: 'creador' });
  }

  // Relaciones extra (Mantenlas si las usas en otros lados)
  if (models.GastoVariable) Flete.hasMany(models.GastoVariable, { foreignKey: 'fleteId' });
  if (models.CostEstimate) Flete.hasOne(models.CostEstimate, { foreignKey: 'fleteId' });

  // Relaciones con los gastos operativos del viaje
  if (models.TicketPeaje) Flete.hasMany(models.TicketPeaje, { foreignKey: 'fleteId', as: 'peajes' });
  if (models.CargaCombustible) Flete.hasMany(models.CargaCombustible, { foreignKey: 'fleteId', as: 'cargasCombustible' });
};

module.exports = Flete;