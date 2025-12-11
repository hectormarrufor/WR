const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const Remolque = sequelize.define('Remolque', {
    tipo: { type: DataTypes.STRING, allowNull: false },
    marca: { type: DataTypes.STRING, allowNull: false },
    modelo: { type: DataTypes.STRING, allowNull: false },
    anio: { type: DataTypes.INTEGER, allowNull: false },
    nroEjes: { type: DataTypes.INTEGER, allowNull: false },
    capacidadCarga: { type: DataTypes.STRING, allowNull: true },
    
}, {
    tableName: 'Remolques',
    timestamps: true,
});

Remolque.associate = (models) => {
    Remolque.hasMany(models.RemolqueInstancia, { foreignKey: 'remolqueId', as: 'instancias' });
    Remolque.hasMany(models.Subsistema, { foreignKey: 'remolqueId', as: 'subsistemas' });
}

module.exports = Remolque;