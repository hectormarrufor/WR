// models/ConsumibleInstalado.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const ConsumibleInstalado = sequelize.define('ConsumibleInstalado', {
  cantidad: { type: DataTypes.DECIMAL(10, 2), defaultValue: 1 },
  serialActual: { type: DataTypes.STRING, allowNull: true, comment: 'Serial del componente físico instalado' },
  fechaInstalacion: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  vidaUtilRestante: { type: DataTypes.INTEGER, comment: 'Porcentaje o KM restantes' },
  estado: { type: DataTypes.ENUM('instalado', 'pendiente_retiro'), defaultValue: 'instalado' }
}, {
  tableName: 'ConsumiblesInstalados'
});

ConsumibleInstalado.associate = (models) => {
  // 1. ¿Dónde está puesto? (Físico)
  ConsumibleInstalado.belongsTo(models.SubsistemaInstancia, { foreignKey: 'subsistemaInstanciaId', as: 'subsistema' });

  // 2. ¿Qué es? (Ficha de Inventario)
  ConsumibleInstalado.belongsTo(models.Consumible, { foreignKey: 'consumibleId', as: 'fichaTecnica' });
  
  // 3. ¿Cuál serial es? (Si es serializado)
  ConsumibleInstalado.belongsTo(models.ConsumibleSerializado, { foreignKey: 'serialId', as: 'serialFisico' });

  // 4. ¿Cumple qué regla? (Vínculo con la Plantilla)
  // ESTO ES CLAVE PARA SABER EN QUÉ SLOT ESTÁ
  ConsumibleInstalado.belongsTo(models.ConsumibleRecomendado, { foreignKey: 'recomendacionId', as: 'reglaPlantilla' });
};

module.exports = ConsumibleInstalado;