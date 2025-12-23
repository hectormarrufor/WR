// models/Recauchado.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const Recauchado = sequelize.define('Recauchado', {
    fecha: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    garantiaHasta: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    costo: { // Opcional: útil para reportes de gastos
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0
    },
    
}, {
    tableName: 'Recauchados',
    timestamps: true,
});

Recauchado.associate = (models) => {
    // Un recauchado pertenece a UN serial específico
    Recauchado.belongsTo(models.ConsumibleSerializado, { 
        foreignKey: 'consumibleSerializadoId',
        as: 'neumatico'
    });
    // Un recauchado puede estar asociado a un taller registrado
    Recauchado.belongsTo(models.Taller, { 
        foreignKey: 'tallerId',
        as: 'taller'
    });
};

module.exports = Recauchado;