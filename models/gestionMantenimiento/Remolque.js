const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const Remolque = sequelize.define('Remolque', {
    marca: { type: DataTypes.STRING, allowNull: false },
    modelo: { type: DataTypes.STRING, allowNull: false },
    anio: { type: DataTypes.INTEGER, allowNull: false },
    imagen: { type: DataTypes.STRING, allowNull: true },
    nroEjes: { type: DataTypes.INTEGER, allowNull: false },
    esDual: { type: DataTypes.BOOLEAN, defaultValue: false }, // Si es Dual, cada eje cuenta con 4 ruedas para efectos de mantenimiento
    capacidadCarga: { type: DataTypes.STRING, allowNull: true },
    peso: { type: DataTypes.STRING, allowNull: true },
    tipoRemolque: { type: DataTypes.ENUM('Batea', 'Plataforma', 'Lowboy', 'Cisterna', 'Vaccum', 'Tolva'), allowNull: true },
    
}, {
    tableName: 'Remolques',
    timestamps: true,
});

Remolque.associate = (models) => {
    Remolque.hasMany(models.RemolqueInstancia, { foreignKey: 'remolqueId', as: 'instancias', onDelete: 'CASCADE' });
    Remolque.hasMany(models.Subsistema, { foreignKey: 'remolqueId', as: 'subsistemas' , onDelete: 'CASCADE' });
}

module.exports = Remolque;