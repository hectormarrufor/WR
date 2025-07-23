// models/flota/featureEquipoEspecial.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize'); // Asegúrate que la ruta es correcta

const FeatureEquipoEspecial = sequelize.define('FeatureEquipoEspecial', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  nombre: { // El nombre de la clave/propiedad (ej. "Motor", "Capacidad", "Certificaciones", "Fecha Adquisición")
    type: DataTypes.STRING,
    allowNull: false,
    unique: true, // Cada nombre de feature debe ser único
  },
  descripcion: { // Descripción para el usuario sobre qué representa esta característica
    type: DataTypes.TEXT,
    allowNull: true,
  },
  tipoValorEsperado: { // Guía para el frontend sobre qué tipo de input renderizar
    type: DataTypes.ENUM('string', 'integer', 'float', 'boolean', 'date', 'jsonb_object', 'jsonb_array', 'array_string'), // Añadir array_string si quieres listas simples de strings
    allowNull: false,
  },
  esRequerido: { // Si esta característica es obligatoria para un equipo
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  },
  orden: { // Para ordenar cómo aparecen en el formulario
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
  },
  parentFeatureId: { // Clave foránea para la recursión (si es una sub-propiedad de otra feature)
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'FeatureEquiposEspeciales', // Referencia a sí mismo
      key: 'id',
    },
  },
}, {
  tableName: 'FeatureEquiposEspeciales', // Nombre de la tabla para gestionar las features/características
  timestamps: true,
});

FeatureEquipoEspecial.associate = (models) => {
  // Relación recursiva para sub-características
  FeatureEquipoEspecial.hasMany(models.FeatureEquipoEspecial, {
    as: 'subFeatures',
    foreignKey: 'parentFeatureId',
    onDelete: 'CASCADE',
  });
  FeatureEquipoEspecial.belongsTo(models.FeatureEquipoEspecial, {
    as: 'parentFeature',
    foreignKey: 'parentFeatureId',
  });
};

module.exports = FeatureEquipoEspecial;