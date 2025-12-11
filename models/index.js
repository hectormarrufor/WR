// index.js
const sequelize = require('../sequelize');

const db = {
    
    // RECURSOS HUMANOS
    User: require('./user'),
    Empleado: require('./recursosHumanos/Empleado'),
    HorasTrabajadas: require('./recursosHumanos/HorasTrabajadas'),
    Puesto: require('./recursosHumanos/Puesto'),
    EmpleadoPuesto: require('./recursosHumanos/EmpleadoPuesto'),
    Departamento: require('./recursosHumanos/Departamento'),
    PushSubscription: require('./pushSubscription'),
    
    // FLOTA Y GESTION DE MANTENIMIENTO
    Activo: require('./gestionMantenimiento/Activo'),
    Hallazgo: require('./gestionMantenimiento/Hallazgo'),
    Mantenimiento: require('./gestionMantenimiento/mantenimiento'),
    TareaMantenimiento: require('./gestionMantenimiento/tareaMantenimiento'),
    Inspeccion: require('./gestionMantenimiento/Inspeccion'),
    Kilometraje: require('./gestionMantenimiento/Kilometraje'),
    Horometro: require('./gestionMantenimiento/Horometro'),
    
    // INVENTARIO
    ConsumibleRecomendado: require('./inventario/ConsumibleRecomendado'),
    Consumible: require('./inventario/Consumible'),
    AceiteHidraulico: require('./inventario/tipo-consumible/AceiteHidraulico'),
    Neumatico: require('./inventario/tipo-consumible/Neumatico'),
    AceiteMotor: require('./inventario/tipo-consumible/AceiteMotor'),
    Filtro: require('./inventario/tipo-consumible/Filtro'),
    Sensor: require('./inventario/tipo-consumible/Sensor'),
    Bateria: require('./inventario/tipo-consumible/Bateria'),
    EquivalenciaFiltro: require('./inventario/tipo-consumible/EquivalenciaFiltro'),

    EntradaInventario: require('./inventario/EntradaInventario'),
    SalidaInventario: require('./inventario/SalidaInventario'),
    Requisicion: require('./inventario/requisicion/Requisicion'),
    RequisicionDetalle: require('./inventario/requisicion/RequisicionDetalle'),
    
    //Estimacion de Costos
    CostParameters: require('./estimacion/CostParameters'),
    CostEstimate: require('./estimacion/CostEstimate'),
    FixedExpense: require('./gastos/FixedExpense'),
    
    //Operaciones
    Flete: require('./operaciones/Flete'),
    ConsumibleUsado: require('./inventario/ConsumibleUsado'),
    ODT: require('./recursosHumanos/ODT'),
    ODT_Vehiculos: require('./recursosHumanos/ODTVehiculos'),
    ODT_Empleados: require('./recursosHumanos/ODTEmpleados'),
    
    //CATALOGOS
    ViscosidadAceite: require('./catalogos/ViscosidadAceite'),
    Codigo: require('./catalogos/Codigo'),
    Color: require('./catalogos/Color'),
    Marca: require('./catalogos/Marca'),
    MedidaNeumatico: require('./catalogos/MedidaNeumatico'),
    Banco: require('./catalogos/Banco'),

    // TESORERIA
    CuentaBancaria: require('./tesoreria/CuentaBancaria'),
    MovimientoTesoreria: require('./tesoreria/MovimientoTesoreria'),    
    CuentaTerceros: require('./tesoreria/CuentaTercero'),
    PagoMovil: require('./tesoreria/PagoMovil'),
    
    //Compras
    Proveedor: require('./compras/Proveedor'),
    RecepcionCompra: require('./compras/recepcion-compra/RecepcionCompra'),
    RecepcionCompraItem: require('./compras/recepcion-compra/RecepcionCompraItem'),
    OrdenCompra: require('./compras/ordenCompra/OrdenCompra'),
    OrdenCompraItem: require('./compras/ordenCompra/OrdenCompraItem'),

    //Facturacion
    Cliente: require('./Cliente'),
  
};

// --- Llamar al método 'associate' de cada modelo ---
Object.values(db).forEach(model => {
    if (typeof model.associate === 'function') {
        model.associate(db);
    }
});

db.sequelize = sequelize;
db.Sequelize = require('sequelize');

module.exports = db;