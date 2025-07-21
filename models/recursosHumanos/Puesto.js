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
    unique: true,
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  requisitos: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  esCampo: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  salarioBaseSugerido: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
  },
  // ✨ Mantenemos este campo para saber el tipo general de horario
  tipoHorario: {
    type: DataTypes.ENUM('Oficina', 'Guardia 3x3', 'Guardia 7x7', 'Otro'),
    allowNull: false,
    defaultValue: 'Oficina',
  },
  // 🗑️ Eliminamos horarioOficinaDetalle, ahora es global
}, {
  tableName: 'Puestos',
  timestamps: true,
});

Puesto.associate = (models) => {
  Puesto.belongsToMany(models.Empleado, {
    through: 'EmpleadoPuesto',
    foreignKey: 'puestoId',
    otherKey: 'empleadoId',
    as: 'empleados',
  });
};

module.exports = Puesto;