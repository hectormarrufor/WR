import { DataTypes } from 'sequelize';
import Activo from './Activo.js';
import sequelize from '../../sequelize.js';

const Horometro = sequelize.define('Horometro', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    fecha_registro: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
    },
    valor: {
        type: DataTypes.FLOAT,
        allowNull: false,
    },
}, {
    tableName: 'horometros',
    timestamps: true,
});

Horometro.belongsTo(Activo, { foreignKey: 'activoId' });
Activo.hasMany(Horometro, { foreignKey: 'activoId', as: 'historial_horometros' });

export default Horometro;