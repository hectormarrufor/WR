const { DataTypes } = require("sequelize");
const sequelize = require("../../sequelize");

const DocumentoActivo = sequelize.define("DocumentoActivo", {
  tipo: {
    type: DataTypes.ENUM(
        "Cedula Catastral", 
        "Documento de Propiedad", 
        "Permiso de Bomberos", 
        "RIF", 
        "Derecho de Frente", 
        "Solvencia de Aseo",
        "Solvencia Municipal",
        "Solvencia de Servicios Publicos",
        "RACDA",
        "RUNSAI", // 🔥 NUEVO
        "DAEX",   // 🔥 NUEVO
        "Poliza de Seguro",
        "Trimestres Municipales",
        "ROTC",
        "Otro"
    ),
    allowNull: false,
  },
  // Solo aplica si tipo es 'Licencia' (1, 2, 3, 4, 5)
  numeroDocumento: {
    type: DataTypes.STRING,
    allowNull: true, // A veces es el mismo que la cédula, pero por si acaso
  },
  fechaVencimiento: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  imagen: {
    type: DataTypes.STRING, // URL de Vercel Blob
    allowNull: true,
  },
});

// Definir Relaciones
DocumentoActivo.associate = (models) => {
    DocumentoActivo.belongsTo(models.Activo, { foreignKey: "activoId", as: "activo" });
};

module.exports = DocumentoActivo;