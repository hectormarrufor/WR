// models/recursosHumanos/Puesto.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

  const Puesto = sequelize.define('Puesto', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    nombre: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true, // Cada puesto debe tener un nombre único
      comment: 'Nombre del puesto (Ej: "Supervisor de Operaciones", "Mecánico Diesel", "Perforador", "Chofer de Grúa", "Montacargista", "Encargado de Logística", "Administrador de Contratos", etc.)',
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Descripción detallada de las responsabilidades del puesto.',
    },
    requisitos: {
      type: DataTypes.JSONB, // O TEXT si no necesitas una estructura JSON
      allowNull: true,
      comment: 'Requisitos para ocupar el puesto (Ej: { "educacion": "Ingeniero", "experiencia_anos": 5, "certificaciones": ["API-RP 2D", "Primeros Auxilios"] })',
    },
    esCampo: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Indica si el puesto requiere trabajar en campo (pozo, mudanza).',
    },
    salarioBaseSugerido: {
      type: DataTypes.DECIMAL(15, 2), // Sugerencia de salario, no el salario real del empleado
      allowNull: true,
      comment: 'Salario base sugerido para el puesto (referencia interna).',
    },
  }, {
    tableName: 'Puestos',
    timestamps: true, // createdAt, updatedAt
  }
);

  Puesto.associate = (models) => {
    // Un Puesto puede ser ocupado por muchos Empleados (a través de la tabla intermedia EmpleadoPuesto)
    Puesto.belongsToMany(models.Empleado, {
      through: 'EmpleadoPuesto',
      foreignKey: 'puestoId',
      otherKey: 'empleadoId',
      as: 'empleados',
    });
  };

  module.exports = Puesto;
