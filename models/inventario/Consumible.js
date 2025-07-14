// models/inventario/Consumible.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

  const Consumible = sequelize.define('Consumible', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    nombre: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true, // Cada consumible/repuesto debe tener un nombre único
      comment: 'Nombre del ítem (Ej: Aceite 15W40, Filtro de Aire XYZ, Motor Diesel CAT C7, Bomba Hidráulica).',
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Descripción detallada del ítem y sus especificaciones.',
    },
    codigoSku: { // Stock Keeping Unit - Identificador único de inventario
      type: DataTypes.STRING,
      allowNull: true,
      unique: true, // Opcional, pero recomendado si usas SKUs
      comment: 'Código SKU o número de parte del fabricante/interno.',
    },
    fabricante: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Fabricante del ítem.',
    },
    modeloFabricante: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Modelo o número de serie del fabricante (si aplica).',
    },
    tipoItem: {
      type: DataTypes.ENUM(
        'Lubricante',     // Aceites, grasas
        'Filtro',         // Aceite, aire, combustible
        'Neumático',      // Llantas
        'Repuesto Mecánico', // Componentes de motor, transmisión, frenos
        'Repuesto Hidráulico', // Bombas, válvulas, cilindros
        'Repuesto Eléctrico', // Baterías, alternadores, cableado
        'Herramienta',    // Herramientas que se controlan en inventario
        'Suministro',     // Limpieza, seguridad, oficina
        'Combustible',    // Diesel, gasolina (aunque el registro de combustible puede ser un modelo aparte)
        'Otro'
      ),
      allowNull: false,
      comment: 'Categoría general del ítem para clasificación de inventario.',
    },
    unidadMedida: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'unidad',
      comment: 'Unidad de medida del ítem (Ej: Litros, Galones, Unidades, Metros, Kg).',
    },
    cantidadDisponible: {
      type: DataTypes.DECIMAL(15, 3), // Permite decimales para líquidos o peso
      defaultValue: 0,
      allowNull: false,
      comment: 'Cantidad actual disponible en inventario.',
    },
    ubicacionAlmacen: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Ubicación física del ítem en el almacén (Ej: Aisle 3, Rack 2, Bin 1).',
    },
    precioUnitarioPromedio: { // Precio promedio ponderado de compra
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      comment: 'Precio unitario promedio de adquisición del ítem.',
    },
    puntoReorden: { // Cantidad mínima para activar una nueva orden de compra
      type: DataTypes.DECIMAL(15, 3),
      defaultValue: 0,
      allowNull: false,
      comment: 'Cantidad mínima para activar una alerta de reorden.',
    },
    fechaUltimaEntrada: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha de la última entrada de este ítem al inventario.',
    },
  }, {
    tableName: 'Consumibles',
    timestamps: true, // createdAt, updatedAt
  });

  Consumible.associate = (models) => {
    // Un Consumible puede ser usado en múltiples ocasiones
    Consumible.hasMany(models.ConsumibleUsado, { foreignKey: 'consumibleId', as: 'usos' });
    // Un Consumible puede ser asociado a TrabajosExtra
    Consumible.hasMany(models.TrabajoExtra, { foreignKey: 'consumibleId', as: 'trabajosExtraAsociados' });
    // También podrías tener Entradas de Inventario y Salidas no asociadas a uso
    Consumible.hasMany(models.EntradaInventario, { foreignKey: 'consumibleId', as: 'entradas' });
    Consumible.hasMany(models.SalidaInventario, { foreignKey: 'consumibleId', as: 'salidas' });
  };

  module.exports = Consumible;
