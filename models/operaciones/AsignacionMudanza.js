// models/AsignacionPersonalMudanza.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');



  const AsignacionPersonalMudanza = sequelize.define('AsignacionPersonalMudanza', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    mudanzaId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Mudanzas',
        key: 'id',
      },
      allowNull: false,
    },
    empleadoId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Empleados',
        key: 'id',
      },
      allowNull: false,
    },
    rolEnMudanza: { // Ej: "Chofer", "Ayudante", "Supervisor de Carga"
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Rol específico del empleado en esta mudanza.',
    },
    // Puedes añadir fecha de inicio/fin de asignación si el personal no está toda la mudanza
  }, {
    tableName: 'AsignacionesPersonalMudanza',
    timestamps: true,
  });

  AsignacionPersonalMudanza.associate = (models) => {
    AsignacionPersonalMudanza.belongsTo(models.Mudanza, { foreignKey: 'mudanzaId', as: 'mudanza' });
    AsignacionPersonalMudanza.belongsTo(models.Empleado, { foreignKey: 'empleadoId', as: 'empleado' });
  };

module.exports = AsignacionPersonalMudanza