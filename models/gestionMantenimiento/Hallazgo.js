const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const Hallazgo = sequelize.define('Hallazgo', {
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: false // "Ruido en tren delantero", "Caucho liso", etc.
  },
  // El semáforo que decide si el activo sigue rodando
  impacto: {
    type: DataTypes.ENUM('Operativo', 'Advertencia', 'No Operativo'),
    allowNull: false,
    defaultValue: 'Operativo'
  },
  // Ciclo de vida del problema
  estado: {
    type: DataTypes.ENUM('Pendiente', 'En Diagnostico', 'En Reparacion', 'Cerrado', 'Descartado'),
    defaultValue: 'Pendiente'
  },
  imagenEvidencia: {
    type: DataTypes.STRING, // URL o path de la foto del daño
    allowNull: true
  }
}, {
  tableName: 'Hallazgos'
});

Hallazgo.associate = (models) => {
  Hallazgo.belongsTo(models.Inspeccion, { foreignKey: 'inspeccionId', as: 'inspeccion' });
  // Relacionamos con el subsistema específico (ej: Motor, Frenos) para saber qué falla más
  Hallazgo.belongsTo(models.SubsistemaInstancia, { foreignKey: 'subsistemaInstanciaId', as: 'subsistema' });
  // Un hallazgo se resuelve a través de una Orden de Mantenimiento
  Hallazgo.belongsTo(models.OrdenMantenimiento, { foreignKey: 'ordenMantenimientoId', as: 'ordenResolucion' });
};

module.exports = Hallazgo;