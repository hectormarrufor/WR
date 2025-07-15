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
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    requisitos: {
      type: DataTypes.JSONB, // O TEXT si no necesitas una estructura JSON
      allowNull: true,
    },
    esCampo: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    salarioBaseSugerido: {
      type: DataTypes.DECIMAL(15, 2), // Sugerencia de salario, no el salario real del empleado
      allowNull: true,
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
