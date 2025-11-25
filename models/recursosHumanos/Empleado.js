// models/recursosHumanos/Empleado.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');


const Empleado = sequelize.define('Empleado', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  cedula: {
    type: DataTypes.STRING(15),
    allowNull: false,
    unique: true,
  },
  imagen: {
    type: DataTypes.TEXT, // Usamos TEXT para almacenar la imagen en formato Base64
    allowNull: true,
  },
  nombre: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  apellido: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  fechaNacimiento: {
    type: DataTypes.DATEONLY, // Solo fecha, sin hora
    allowNull: true,
  },
  genero: {
    type: DataTypes.ENUM('Masculino', 'Femenino', 'Otro'),
    allowNull: true,
  },
  direccion: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  telefono: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  sueldo: { // Sueldo total del empleado, independiente de los puestos
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
  },
  fechaIngreso: {
    type: DataTypes.DATEONLY,
    defaultValue: DataTypes.NOW, // Fecha actual por defecto, pero modificable
    allowNull: false,
  },
  estado: {
    type: DataTypes.ENUM('Activo', 'Inactivo', 'Suspendido', 'Vacaciones'),
    defaultValue: 'Activo',
    allowNull: false,
  },

}, {
  tableName: 'Empleados',
  timestamps: true, // createdAt, updatedAt
});

Empleado.associate = (models) => {
  // Un Empleado puede tener varios Puestos (a través de la tabla intermedia EmpleadoPuesto)
  Empleado.belongsToMany(models.Puesto, {
    through: 'EmpleadoPuesto',
    foreignKey: 'empleadoId',
    otherKey: 'puestoId',
    as: 'puestos',
  });
  Empleado.hasOne(models.User, { foreignKey: 'empleadoId', as: 'usuario' });

  // Un Empleado puede ser el Supervisor de muchas Operaciones de Campo
  // Empleado.hasMany(models.OperacionCampo, { foreignKey: 'supervisorId', as: 'operacionesSupervisadas' });
  // Un Empleado puede ser el Mecánico asignado a muchas Operaciones de Campo
  // Empleado.hasMany(models.OperacionCampo, { foreignKey: 'mecanicoId', as: 'operacionesMecanico' });
  // Y así sucesivamente para cada rol en OperacionCampo, Mudanza, etc.
};

module.exports = Empleado;