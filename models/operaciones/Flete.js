const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');


  const Flete = sequelize.define('Flete', {
    codigo: { type: DataTypes.STRING, unique: true }, // Ej: FL-2026-001
    clienteId: { type: DataTypes.INTEGER, allowNull: false },
    
    // Recursos Asignados
    choferId: { type: DataTypes.INTEGER, allowNull: false },
    ayudanteId: { type: DataTypes.INTEGER }, // Opcional
    activoPrincipalId: { type: DataTypes.INTEGER, allowNull: false }, // El Chuto/Camión
    remolqueId: { type: DataTypes.INTEGER }, // La batea/tanque (Opcional)

    // Ruta
    origen: { type: DataTypes.STRING, defaultValue: 'Base DADICA - Tía Juana' },
    destino: { type: DataTypes.STRING, allowNull: false },
    coordenadasDestino: { type: DataTypes.JSON }, // { lat: ..., lng: ... }
    distanciaKm: { type: DataTypes.FLOAT }, // Ida y vuelta
    cantidadPeajes: { type: DataTypes.INTEGER, defaultValue: 0 },
    costoPeajesTotal: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },

    // Tiempos
    fechaSalida: { type: DataTypes.DATE, allowNull: false },
    fechaRetorno: { type: DataTypes.DATE }, // Se llena al finalizar
    
    estado: { type: DataTypes.ENUM('programado', 'en_ruta', 'completado', 'cancelado'), defaultValue: 'programado' },
    observaciones: { type: DataTypes.TEXT }
  });

  Flete.associate = (models) => {
    Flete.belongsTo(models.Cliente, { foreignKey: 'clienteId' });
    Flete.belongsTo(models.Empleado, { as: 'chofer', foreignKey: 'choferId' });
    Flete.belongsTo(models.Empleado, { as: 'ayudante', foreignKey: 'ayudanteId' });
    Flete.belongsTo(models.Activo, { as: 'vehiculo', foreignKey: 'activoPrincipalId' });
    Flete.belongsTo(models.Activo, { as: 'remolque', foreignKey: 'remolqueId' });
    
    // Relación con tu módulo existente
    Flete.hasMany(models.GastoVariable, { foreignKey: 'fleteId' });
  };

  module.exports = Flete;
