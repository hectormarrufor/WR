const { DataTypes } =  require('sequelize');
const sequelize =  require('../../sequelize');

const ChecklistTemplate = sequelize.define('ChecklistTemplate', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    nombre: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    descripcion: {
        type: DataTypes.TEXT
    },
    // Puntos a verificar, almacenados como un JSON array de strings
    puntos_de_chequeo: {
        type: DataTypes.JSON,
        allowNull: false,
    }
}, {
    tableName: 'checklistTemplates',
    timestamps: true,
});

module.exports = ChecklistTemplate;