const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');

const GastoFijoGlobal = sequelize.define('GastoFijoGlobal', {
    descripcion: { 
        type: DataTypes.STRING, 
        allowNull: false 
    },
    montoAnual: { 
        type: DataTypes.FLOAT, 
        allowNull: false, 
        defaultValue: 0 
    }
}, { tableName: 'GastosFijosGlobales' });

GastoFijoGlobal.associate = (models) => {
    GastoFijoGlobal.belongsTo(models.ConfiguracionGlobal, { 
        foreignKey: 'configuracionId' 
    });
};

module.exports = GastoFijoGlobal;