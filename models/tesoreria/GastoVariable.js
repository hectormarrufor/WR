// models/tesoreria/GastoVariable.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const GastoVariable = sequelize.define('GastoVariable', {
  fechaGasto: {
    type: DataTypes.DATEONLY, // Usamos DATEONLY si solo importa el día del gasto
    defaultValue: DataTypes.NOW,
    allowNull: false,
  },
  monto: {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: false,
  },
  moneda: {
    type: DataTypes.STRING(5),
    defaultValue: 'USD',
    allowNull: false,
  },
  // ESTADO: Clave para tu requerimiento de "quizás no tengo la cuenta bancaria aún"
  estado: {
    type: DataTypes.ENUM('Pendiente', 'Pagado', 'Anulado'),
    defaultValue: 'Pendiente', 
    allowNull: false,
  },
  // TIPO DE GASTO (Origen)
  tipoOrigen: {
    type: DataTypes.ENUM(
      'Nomina',           // Relacionado a Empleado
      'Compra Repuestos', // Relacionado a OrdenCompra
      'Servicio Externo', // Mantenimientos en talleres externos
      'Combustible',      // Vital para transporte
      'Viaticos',         // Dinero para el chofer en ruta
      'Impuestos', 
      'Gastos Adm',       // Papelería, oficina
      'Otros'
    ),
    allowNull: false,
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  // Referencia externa (nro factura del proveedor, nro de recibo, etc)
  referenciaExterna: {
    type: DataTypes.STRING,
    allowNull: true,
  }
}, {
  tableName: 'GastosVariables',
  timestamps: true,
});

GastoVariable.associate = (models) => {
  // 1. RELACIÓN NOMINA: Si el gasto es un pago de salario
  GastoVariable.belongsTo(models.Empleado, { foreignKey: 'empleadoId', as: 'empleado' });

  // 2. RELACIÓN COMPRAS: Si el gasto viene de una orden de compra (repuestos)
  GastoVariable.belongsTo(models.OrdenCompra, { foreignKey: 'ordenCompraId', as: 'ordenCompra' });

  // 3. RELACIÓN TRANSPORTE (OPCIONAL PERO RECOMENDADA): Saber qué camión generó el gasto
  // Si tienes un modelo Vehiculo o Activo, descomenta esto:
  // GastoVariable.belongsTo(models.Vehiculo, { foreignKey: 'vehiculoId', as: 'vehiculo' });

  // 4. RELACIÓN TESORERÍA: Con qué dinero se pagó este gasto
  // Un gasto puede tener un movimiento asociado (el pago)
  GastoVariable.belongsTo(models.MovimientoTesoreria, { 
    foreignKey: 'movimientoTesoreriaId', 
    as: 'pagoAsociado' 
  });
};

module.exports = GastoVariable;