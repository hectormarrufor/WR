const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const Inspeccion = sequelize.define('Inspeccion', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  // --- MODIFICACIÓN POLIMÓRFICA ---
  inspeccionableId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  inspeccionableTipo: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  // ------------------------------------

  // Tus campos existentes se mantienen intactos
  fecha: { type: DataTypes.DATEONLY, allowNull: false },
  tipoInspeccion: { type: DataTypes.ENUM('Pre-Uso', 'Rutinaria', 'Pre-Arranque', 'Post-Operacional'), allowNull: false },
  resultado: { type: DataTypes.ENUM('Aprobado', 'Aprobado con Observaciones', 'Rechazado'), allowNull: false },
  observaciones: { type: DataTypes.TEXT, allowNull: true },
  usuarioId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Empleados', key: 'id' },
  },
}, {
  tableName: 'Inspecciones',
  timestamps: true,
});

Inspeccion.associate = (models) => {
  // La asociación a Usuario se mantiene
  Inspeccion.belongsTo(models.Empleado, { foreignKey: 'usuarioId', as: 'inspector' });

  // ¡IMPORTANTE! La asociación con el modelo HIJO se mantiene exactamente igual.
  Inspeccion.hasMany(models.HallazgoInspeccion, { foreignKey: 'inspeccionId', as: 'hallazgos' });
};

module.exports = Inspeccion;