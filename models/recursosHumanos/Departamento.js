// models/recursosHumanos/Departamento.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const Departamento = sequelize.define('Departamento', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    nombre: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    descripcion: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    codigo: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: true,
    }
}, {
    tableName: 'Departamentos',
    timestamps: true,
});

Departamento.associate = (models) => {
    // Un Departamento tiene muchos Empleados
    Departamento.hasMany(models.Empleado, {
        foreignKey: 'departamentoId',
        as: 'empleados',
    });
};

module.exports = Departamento;