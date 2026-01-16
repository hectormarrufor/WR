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
    VehiculoInstancia: require('./gestionMantenimiento/VehiculoInstancia'),
    Activo: require('./gestionMantenimiento/Activo'),
    Hallazgo: require('./gestionMantenimiento/Hallazgo'),
    OrdenMantenimiento: require('./gestionMantenimiento/OrdenMantenimiento'),
    TareaMantenimiento: require('./gestionMantenimiento/tareaMantenimiento'),
    Inspeccion: require('./gestionMantenimiento/Inspeccion'),
    Kilometraje: require('./gestionMantenimiento/Kilometraje'),
    MantenimientoRepuesto: require('./gestionMantenimiento/MantenimientoRepuesto'),
    Horometro: require('./gestionMantenimiento/Horometro'),
    SubsistemaInstancia: require('./gestionMantenimiento/SubsistemaInstancia'),
    Subsistema: require('./gestionMantenimiento/Subsistema'),
    Vehiculo: require('./gestionMantenimiento/Vehiculo'),
    Remolque: require('./gestionMantenimiento/Remolque'),
    RemolqueInstancia: require('./gestionMantenimiento/RemolqueInstancia'),
    Maquina: require('./gestionMantenimiento/Maquina'),
    MaquinaInstancia: require('./gestionMantenimiento/MaquinaInstancia'),

    // INVENTARIO
    Consumible: require('./inventario/Consumible'),
    ConsumibleRecomendado: require('./inventario/ConsumibleRecomendado'),
    ConsumibleSerializado: require('./inventario/ConsumibleSerializado'),
    ConsumibleInstalado: require('./inventario/ConsumibleInstalado'),
    ConsumibleUsado: require('./inventario/ConsumibleUsado'),
    Correa: require('./inventario/tipo-consumible/Correa'),
    CargaCombustible: require('./gestionMantenimiento/CargaCombustible'),
    Neumatico: require('./inventario/tipo-consumible/Neumatico'),
    Aceite: require('./inventario/tipo-consumible/Aceite'),
    GrupoEquivalencia: require('./inventario/tipo-consumible/GrupoEquivalencia'),
    Filtro: require('./inventario/tipo-consumible/Filtro'),
    Sensor: require('./inventario/tipo-consumible/Sensor'),
    Bateria: require('./inventario/tipo-consumible/Bateria'),
    EntradaInventario: require('./inventario/EntradaInventario'),
    SalidaInventario: require('./inventario/SalidaInventario'),
    Requisicion: require('./inventario/requisicion/Requisicion'),
    RequisicionDetalle: require('./inventario/requisicion/RequisicionDetalle'),
    Recauchado: require('./inventario/Recauchado'),

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
    Modelo: require('./catalogos/Modelo'),
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
    Taller: require('./compras/Taller'),

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