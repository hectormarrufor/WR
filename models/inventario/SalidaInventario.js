// models/inventario/SalidaInventario.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');
  const SalidaInventario = sequelize.define('SalidaInventario', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    consumibleId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Consumibles',
        key: 'id',
      },
      allowNull: false,
    },
    cantidad: {
      type: DataTypes.DECIMAL(15, 3),
      allowNull: false,
    },
    fechaSalida: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
    tipoSalida: {
      type: DataTypes.ENUM('Venta', 'Despacho', 'Ajuste Negativo', 'Transferencia', 'Descarte'),
      allowNull: false,
    },
    documentoReferencia: { // Nro de factura de venta, guía de despacho, etc.
      type: DataTypes.STRING,
      allowNull: true,
    },
    entregadoPorId: { // Quién gestionó la salida
      type: DataTypes.INTEGER,
      references: {
        model: 'Empleados',
        key: 'id',
      },
      allowNull: true,
    },
    recibidoPor: { // Quién recibió la salida (si aplica, ej. cliente)
      type: DataTypes.STRING,
      allowNull: true,
    },
    destinoSalida: { // Ej: "Cliente X", "Almacén B", "Descarte por Daño"
      type: DataTypes.STRING,
      allowNull: true,
    },
    notas: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // Si la salida es por venta de servicios, vincularla a un Contrato/Factura de Venta
    contratoServicioId: { // Si se vende como parte de un contrato de servicio
        type: DataTypes.INTEGER,
        references: {
            model: 'ContratosServicio',
            key: 'id'
        },
        allowNull: true
    },
  }, {
    tableName: 'SalidasInventario',
    timestamps: true,
  });

  SalidaInventario.associate = (models) => {
    SalidaInventario.belongsTo(models.Consumible, { foreignKey: 'consumibleId', as: 'consumible' });
    SalidaInventario.belongsTo(models.Empleado, { foreignKey: 'entregadoPorId', as: 'entregadoPor' });
    SalidaInventario.belongsTo(models.ContratoServicio, { foreignKey: 'contratoServicioId', as: 'contratoServicio' });
  };

  module.exports = SalidaInventario;
