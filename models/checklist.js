const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');

const Checklist = sequelize.define(
  'Checklist',
  {
    fecha: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    kilometraje: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    horometro: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    // Bombillos
    bombilloDelBaja: DataTypes.BOOLEAN,
    bombilloDelAlta: DataTypes.BOOLEAN,
    intermitenteDelFrizq: DataTypes.BOOLEAN,
    intermitenteDelFder: DataTypes.BOOLEAN,
    intermitenteLateral: DataTypes.BOOLEAN,
    bombilloTrasero: DataTypes.BOOLEAN,

    // Filtros, correa, neumático
    filtroAireOk: DataTypes.BOOLEAN,
    filtroAceiteOk: DataTypes.BOOLEAN,
    filtroCombustibleOk: DataTypes.BOOLEAN,
    correaOk: DataTypes.BOOLEAN,
    neumaticoOk: DataTypes.BOOLEAN,

    // Combustible y sistema de inyección
    inyectoresOk: DataTypes.BOOLEAN,

    // Estado aceite calculado
    aceiteUltimoCambioKm: DataTypes.INTEGER,
    aceiteEstado: {
      type: DataTypes.ENUM('OK', 'Próximo a cambio', 'Cambio requerido'),
      defaultValue: 'OK',
    },

    // Relación con Vehículo
    vehiculoId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Vehiculos',
        key: 'id',
      },
    },
  },
  {
    tableName: 'Checklists',
    timestamps: true,
  }
);

module.exports = Checklist;