const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const HallazgoInspeccion = sequelize.define('HallazgoInspeccion', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    descripcion: { // Ej: "Fuga de aceite en el cárter", "Pastillas de freno delanteras desgastadas"
      type: DataTypes.STRING,
      allowNull: false,
    },
    gravedad: { // Ej: 'Baja', 'Media', 'Alta', 'Crítica'
      type: DataTypes.ENUM('Baja', 'Media', 'Alta', 'Crítica'),
      allowNull: true,
    },
    recomendacion: { // Ej: "Reemplazar inmediatamente", "Monitorear"
      type: DataTypes.TEXT,
      allowNull: true,
    },
    estaResuelto: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    inspeccionId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Inspecciones',
        key: 'id',
      },
      allowNull: false,
    },
    // Opcional: Podrías añadir un campo para vincular directamente a un Vehiculo si un hallazgo se registra sin una inspección formal
    vehiculoId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Vehiculos',
        key: 'id',
      },
      allowNull: false, // Todo hallazgo debe pertenecer a un vehículo
    },
    
  },
  {
    tableName: 'HallazgoInspecciones',
    timestamps: true,
  }
);

  HallazgoInspeccion.associate = (models) => {
    HallazgoInspeccion.belongsTo(models.Inspeccion, { foreignKey: 'inspeccionId', as: 'inspeccion' });
    HallazgoInspeccion.belongsTo(models.Vehiculo, { foreignKey: 'vehiculoId', as: 'vehiculo' });
    HallazgoInspeccion.hasOne(models.TareaMantenimiento, { foreignKey: 'hallazgoInspeccionId', as: 'tareaAsociada' }); // Un hallazgo puede dar origen a una tarea
  };

  module.exports = HallazgoInspeccion;