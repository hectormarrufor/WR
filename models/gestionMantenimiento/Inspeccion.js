import { DataTypes } from 'sequelize';
import Activo from './Activo.js';
import Usuario from './Usuario.js';
import ChecklistTemplate from './ChecklistTemplate.js';
import OrdenTrabajo from './OrdenTrabajo.js';
import sequelize from '../../sequelize.js';


const Inspeccion = sequelize.define('Inspeccion', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    fecha: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    resultado_general: {
        type: DataTypes.ENUM('aprobado', 'rechazado', 'con_hallazgos'),
        allowNull: false
    },
    observaciones_generales: {
        type: DataTypes.TEXT
    },
    // Almacena los resultados del checklist como un objeto JSON
    // Ej: { "Nivel de aceite": "ok", "Fugas hidráulicas": "falla" }
    resultados_checklist: {
        type: DataTypes.JSON,
        allowNull: false,
    }
}, {
    tableName: 'inspecciones',
    timestamps: true,
});

// Relaciones
Inspeccion.belongsTo(Activo, { foreignKey: 'activoId', as: 'activo' });
Inspeccion.belongsTo(Usuario, { foreignKey: 'inspectorId', as: 'inspector' });
Inspeccion.belongsTo(ChecklistTemplate, { foreignKey: 'templateId', as: 'template' });

// Una inspección puede generar UNA orden de trabajo
Inspeccion.hasOne(OrdenTrabajo, { foreignKey: 'origen_id', constraints: false, scope: { tipo_origen: 'inspeccion' } });
OrdenTrabajo.belongsTo(Inspeccion, { foreignKey: 'origen_id', constraints: false, as: 'inspeccion_origen' });

export default Inspeccion;