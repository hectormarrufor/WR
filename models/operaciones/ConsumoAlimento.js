// models/ConsumoAlimento.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');


  const ConsumoAlimento = sequelize.define('ConsumoAlimento', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    renglonContratoId: { // A qué pozo/proyecto se asocia el consumo
      type: DataTypes.INTEGER,
      references: {
        model: 'RenglonesContrato',
        key: 'id',
      },
      allowNull: false,
    },
    fechaConsumo: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    tipoServicio: { // Ej: "Desayuno", "Almuerzo", "Cena", "Snack", "Agua Potable"
      type: DataTypes.ENUM('Desayuno', 'Almuerzo', 'Cena', 'Merienda', 'Agua Potable'),
      allowNull: false,
    },
    cantidadPersonas: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    notas: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // Opcional: Si quieres registrar qué empleados específicos recibieron la comida ese día
    // Puedes usar una tabla intermedia ConsumoAlimentoEmpleado
  }, {
    tableName: 'ConsumosAlimento',
    timestamps: true,
  });

  ConsumoAlimento.associate = (models) => {
    ConsumoAlimento.belongsTo(models.RenglonContrato, { foreignKey: 'renglonContratoId', as: 'renglonContrato' });
    // ConsumoAlimento.belongsToMany(models.Empleado, { through: 'ConsumoAlimentoEmpleado', foreignKey: 'consumoAlimentoId', otherKey: 'empleadoId', as: 'personalServido' });
  };

module.exports= ConsumoAlimento