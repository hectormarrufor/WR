const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const ConsumibleSerializado = sequelize.define('ConsumibleSerializado', {
    serial: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    }, // serial único de la pieza
    fechaAsignacion: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    fechaRetiro: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    fechaCompra: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    fechaVencimientoGarantia: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    estado: {
        type: DataTypes.ENUM('almacen', 'asignado', 'retirado', 'reutilizable'),
        allowNull: false,
        defaultValue: 'almacen'
    },
    recauchado: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },


}, {
    tableName: 'ConsumiblesSerializados',
    timestamps: true,
    indexes: [
    // Garantiza que una unidad "asignada" no esté en dos activos a la vez
    { unique: true, fields: ['serial'] },
    { fields: ['activoId', 'estado'] }
  ]

});

ConsumibleSerializado.associate = (models) => {
    ConsumibleSerializado.belongsTo(models.Consumible, { foreignKey: 'consumibleId', as: 'consumible' });
    ConsumibleSerializado.belongsTo(models.Activo, { foreignKey: 'activoId', as: 'activo' });
    ConsumibleSerializado.belongsTo(models.SubsistemaInstancia, { foreignKey: 'subsistemaInstanciaId', as: 'subsistemaInstancia' });
    ConsumibleSerializado.hasOne(models.ConsumibleInstalado, { foreignKey: 'consumibleSerializadoId' });
    ConsumibleSerializado.hasMany(models.Recauchado, { foreignKey: 'consumibleSerializadoId', as: 'historialRecauchado' });
}
module.exports = ConsumibleSerializado;