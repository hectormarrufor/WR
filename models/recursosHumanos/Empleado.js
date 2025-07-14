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
      type: DataTypes.STRING,
      allowNull: false,
      unique: true, // La cédula debe ser única por empleado
      comment: 'Número de cédula de identidad del empleado.',
    },
    nombre: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Nombre del empleado.',
    },
    apellido: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Apellido del empleado.',
    },
    fechaNacimiento: {
      type: DataTypes.DATEONLY, // Solo fecha, sin hora
      allowNull: true,
      comment: 'Fecha de nacimiento del empleado.',
    },
    genero: {
      type: DataTypes.ENUM('Masculino', 'Femenino', 'Otro'),
      allowNull: true,
    },
    direccion: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Dirección de residencia del empleado.',
    },
    telefono: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Número de teléfono de contacto.',
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true, // El email también puede ser único
      validate: {
        isEmail: true,
      },
      comment: 'Correo electrónico del empleado.',
    },
    sueldo: { // Sueldo total del empleado, independiente de los puestos
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      comment: 'Sueldo mensual bruto del empleado.',
    },
    fechaIngreso: {
      type: DataTypes.DATEONLY,
      defaultValue: DataTypes.NOW, // Fecha actual por defecto, pero modificable
      allowNull: false,
      comment: 'Fecha de ingreso del empleado a la empresa.',
    },
    estado: {
      type: DataTypes.ENUM('Activo', 'Inactivo', 'Suspendido', 'Vacaciones'),
      defaultValue: 'Activo',
      allowNull: false,
      comment: 'Estado actual del empleado en la empresa.',
    },
    notas: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notas adicionales sobre el empleado (ej. historial laboral interno).',
    },
    // No hay "trabajoAsignado" directamente aquí, se gestionará a través de asignaciones a Proyectos/Contratos/Mudanzas/Operaciones.
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

    // Un Empleado puede ser el Supervisor de muchas Operaciones de Campo
    Empleado.hasMany(models.OperacionCampo, { foreignKey: 'supervisorId', as: 'operacionesSupervisadas' });
    // Un Empleado puede ser el Mecánico asignado a muchas Operaciones de Campo
    Empleado.hasMany(models.OperacionCampo, { foreignKey: 'mecanicoId', as: 'operacionesMecanico' });
    // Y así sucesivamente para cada rol en OperacionCampo, Mudanza, etc.
    // Esto lo definiremos en los modelos de OperacionCampo y Mudanza donde se asignan.
  };

  module.exports = Empleado;
