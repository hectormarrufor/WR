// index.js
const sequelize = require('../sequelize'); 

// --- Importar todos tus modelos ---
const User = require('./user');
const TipoVehiculo = require('./flota/tipoVehiculo');
const MedidaNeumatico = require('./flota/medidaNeumatico');
const TipoAceiteCaja = require('./flota/tipoAceiteCaja');
const TipoAceiteMotor = require('./flota/tipoAceiteMotor');
const TipoBombillo = require('./flota/tipoBombillo');
const Vehiculo = require('./flota/vehiculo');
const EstadoSistemaVehiculo = require('./flota/estadoSistemaVehiculo');
const FichaTecnica = require('./flota/fichaTecnica');
const HallazgoInspeccion = require('./flota/hallazgoInspeccion');
const Inspeccion = require('./flota/inspeccion');
const Kilometraje = require('./flota/kilometraje');
const Horometro = require('./flota/horometro');
const Mantenimiento = require('./flota/mantenimiento');
const TareaMantenimiento = require('./flota/tareaMantenimiento');

// RECURSOS HUMANOS
const Empleado = require('./recursosHumanos/Empleado');
const Puesto = require('./recursosHumanos/Puesto');
const EmpleadoPuesto = require('./recursosHumanos/EmpleadoPuesto');
const Departamento = require('./recursosHumanos/Departamento'); // <-- AÑADIR NUEVO MODELO

// OPERACIONES
const ContratoServicio = require('./operaciones/ContratoServicio');
const RenglonContrato = require('./operaciones/RenglonContrato');
const Mudanza = require('./operaciones/Mudanza');
const AsignacionPersonalMudanza = require('./operaciones/AsignacionMudanza');
const AsignacionVehiculoMudanza = require('./operaciones/AsignacionVehiculoMudanza');
const OperacionCampo = require('./operaciones/OperacionCampo');
const AsignacionVehiculoOperacion = require('./operaciones/AsignacionVehiculoOperacion');
const TrabajoExtra = require('./operaciones/TrabajoExtra');
const ConsumoAlimento = require('./operaciones/ConsumoAlimento');

// INVENTARIO
const Consumible = require('./inventario/Consumible');
const ConsumibleUsado = require('./inventario/ConsumibleUsado');
const EntradaInventario = require('./inventario/EntradaInventario');
const SalidaInventario = require('./inventario/SalidaInventario');

// TESORERIA
const CuentaBancaria = require('./tesoreria/CuentaBancaria');
const MovimientoTesoreria = require('./tesoreria/MovimientoTesoreria');

// FACTURACION
const Factura = require('./facturacion/Factura');
const RenglonFactura = require('./facturacion/RenglonFactura');
const PagoFactura = require('./facturacion/PagoFactura');
const NotaCredito = require('./facturacion/NotaCredito');

// COMPRAS
const Proveedor = require('./compras/Proveedor');
const OrdenCompra = require('./compras/OrdenCompra');
const DetalleOrdenCompra = require('./compras/DetalleOrdenCompra');
const FacturaProveedor = require('./compras/FacturaProveedor');
const PagoProveedor = require('./compras/PagoProveedor');
const RecepcionCompra = require('./compras/RecepcionCompra');
const DetalleRecepcionCompra = require('./compras/DetalleRecepcionCompra');
const DetalleFacturaProveedor = require('./compras/DetalleFacturaProveedor');

// CONTRATOS
const Cliente = require('./Cliente');
const AsignacionSupervisorOperacion = require('./operaciones/AsignacionSupervisorOperacion');
const BcvPrecioHistorico = require('./BcvPrecioHistorico');

// --- Crear un objeto 'db' para agruparlos ---
const db = {
    User,
    TipoVehiculo,
    MedidaNeumatico,
    TipoAceiteCaja,
    TipoAceiteMotor,
    TipoBombillo,
    Vehiculo,
    Consumible,
    ConsumibleUsado,
    EstadoSistemaVehiculo,
    FichaTecnica,
    HallazgoInspeccion,
    Inspeccion,
    Kilometraje,
    Horometro,
    Mantenimiento,
    TareaMantenimiento,
    AsignacionPersonalMudanza,
    AsignacionVehiculoMudanza,
    AsignacionVehiculoOperacion,
    ConsumoAlimento,
    ContratoServicio,
    Mudanza,
    OperacionCampo,
    RenglonContrato,
    TrabajoExtra,
    Empleado,
    EmpleadoPuesto,
    Puesto,
    Departamento, // <-- AÑADIR NUEVO MODELO
    Proveedor,
    OrdenCompra,
    EntradaInventario,
    SalidaInventario,
    DetalleOrdenCompra,
    CuentaBancaria,
    MovimientoTesoreria,
    Factura,
    RenglonFactura,
    PagoFactura,
    NotaCredito,
    Cliente,
    FacturaProveedor,
    DetalleFacturaProveedor,
    PagoProveedor,
    RecepcionCompra,
    DetalleRecepcionCompra,
    AsignacionSupervisorOperacion,
    BcvPrecioHistorico,
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