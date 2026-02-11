const { Op } = require('sequelize');
const db = require('../../models');

// CONFIGURACIÓN GLOBAL (Podría venir de DB también)
const COSTO_OVERHEAD_HORA = 3.50; // Vigilancia + Admin (Prorrateado)
const PRECIO_GASOIL_DEFAULT = 0.50; // $/Litro
const VIATICO_CHOFER_DIA = 30; // $
const VIATICO_AYUDANTE_DIA = 15; // $

// Umbrales para confiar en datos históricos (Escenario 1)
const KM_MINIMO_REAL = 3000;
const FLETES_MINIMO_REAL = 5;
const MESES_HISTORIAL = 6; // Miramos últimos 6 meses

async function calcularCostoFlete({
  activoPrincipalId,
  remolqueId = null,
  distanciaKm,
  tonelaje = 0,
  tipoCarga = 'general',
  choferId,
  ayudanteId = null,
  cantidadPeajes = 0,
  precioPeajeUnitario = 5,
  precioGasoilUsd = null, // Si viene null, usa default
  porcentajeGanancia = 0.30,
  bcv = 400,
  // Overrides manuales (opcional)
  overrideConsumo = null,
  overrideMantenimiento = null
}) {
  const precioGasoil = precioGasoilUsd || PRECIO_GASOIL_DEFAULT;

  // 1. CARGAR ACTIVOS
  const chuto = await db.Activo.findByPk(activoPrincipalId, {
    include: [{ model: db.VehiculoInstancia, as: 'vehiculoInstancia', include: ['plantilla'] }]
  });
  if (!chuto) throw new Error(`Activo ${activoPrincipalId} no encontrado`);

  let remolque = null;
  if (remolqueId) {
    remolque = await db.Activo.findByPk(remolqueId, {
      include: [{ model: db.RemolqueInstancia, as: 'remolqueInstancia', include: ['plantilla'] }]
    });
  }

  // ==========================================
  // 2. DETERMINAR VARIABLES (Real vs Teórico)
  // ==========================================
  
  // Buscar historial reciente del Chuto
  const fechaLimite = new Date();
  fechaLimite.setMonth(fechaLimite.getMonth() - MESES_HISTORIAL);

  const [historialFletes, historialKm, historialCombustible, historialGastos] = await Promise.all([
      db.Flete.count({ where: { activoPrincipalId, fechaSalida: { [Op.gte]: fechaLimite }, estado: 'completado' } }),
      db.Kilometraje.sum('valor', { where: { activoId: activoPrincipalId, fecha: { [Op.gte]: fechaLimite } } }), // O lógica diferencial
      db.CargaCombustible.sum('litros', { where: { activoId: activoPrincipalId, fecha: { [Op.gte]: fechaLimite } } }),
      db.GastoVariable.sum('monto', { where: { activoId: activoPrincipalId, fechaGasto: { [Op.gte]: fechaLimite } } })
  ]);

  // Decisión: ¿Usamos Real o Matriz?
  let fuenteDatos = 'MATRIZ_COSTOS'; // Default
  let mntChutoKm = 0.45; // Fallback extremo
  let consumoL_Km = 0.40;
  let posesionChutoHr = 3.50;
  let velocidad = 45;

  // Intentar buscar perfil en MatrizCosto (por coincidencia de nombre/modelo)
  // Esto es para tener un valor base "Teórico" mejor que el fallback
  const modeloChuto = chuto.vehiculoInstancia?.plantilla?.modelo || '';
  const perfilChuto = await db.MatrizCosto.findOne({
    where: { 
        tipoActivo: 'Vehiculo',
        // Lógica simple: si el nombre del perfil está contenido en el modelo o viceversa
        // (Mejorar lógica de match según tus necesidades)
        [Op.or]: [
            { nombre: { [Op.iLike]: `%${modeloChuto}%` } },
            { nombre: { [Op.iLike]: `%Mack%` } } // Default a Mack si no encuentra
        ]
    }
  });

  if (perfilChuto) {
      mntChutoKm = perfilChuto.costoMantenimientoKm;
      consumoL_Km = perfilChuto.consumoCombustibleKm;
      posesionChutoHr = perfilChuto.costoPosesionHora;
      velocidad = perfilChuto.velocidadPromedio;
  }

  // AHORA: Si hay historial suficiente, SOBRESCRIBIMOS con datos reales
  if (historialKm > KM_MINIMO_REAL && historialFletes >= FLETES_MINIMO_REAL) {
      fuenteDatos = 'HISTORICO_REAL';
      
      // Rendimiento Real
      if (historialCombustible > 0) {
          consumoL_Km = historialCombustible / historialKm; // L/km real
      }
      
      // Costo Mantenimiento Real ($/km)
      if (historialGastos > 0) {
          mntChutoKm = historialGastos / historialKm;
      }
  }

  // Overrides manuales (Ganan a todo)
  if (overrideConsumo) { consumoL_Km = parseFloat(overrideConsumo); fuenteDatos = 'MANUAL_USUARIO'; }
  if (overrideMantenimiento) { mntChutoKm = parseFloat(overrideMantenimiento); fuenteDatos = 'MANUAL_USUARIO'; }

  // --- REMOLQUE (Siempre Teórico por ahora, es difícil trackear gastos de batea por km) ---
  let mntRemolqueKm = 0.15; // Default Batea
  let posesionRemolqueHr = 0.50;
  
  if (remolque) {
      // Buscar perfil en Matriz
      const perfilRemolque = await db.MatrizCosto.findOne({ where: { tipoActivo: 'Remolque' } }); // Simplificado
      if (perfilRemolque) {
          mntRemolqueKm = perfilRemolque.costoMantenimientoKm;
          posesionRemolqueHr = perfilRemolque.costoPosesionHora;
      }
  }

  // ==========================================
  // 3. CÁLCULOS MATEMÁTICOS
  // ==========================================

  // 3.1 Tiempo Estimado
  // Factor 1.25 para holgura (tráfico, pernocta, carga/descarga)
  const horasViaje = (distanciaKm / velocidad) * 1.25; 
  const diasViaje = Math.ceil(horasViaje / 9); // Jornadas de 9h

  // 3.2 Costos Variables (Dependen de Km)
  // Combustible
  const factorCarga = 1 + (tonelaje / 30) * 0.20; // +20% si va full
  const litrosTotal = distanciaKm * consumoL_Km * factorCarga;
  const costoCombustible = litrosTotal * precioGasoil;

  // Mantenimiento (Chuto + Remolque)
  const costoMantenimiento = distanciaKm * (mntChutoKm + mntRemolqueKm);

  // 3.3 Costos Fijos (Dependen de Tiempo)
  // Posesión (Depreciación + Interés)
  const costoPosesion = horasViaje * (posesionChutoHr + posesionRemolqueHr);
  
  // Overhead Admin (Vigilancia, Secretaria, etc)
  const costoOverhead = horasViaje * COSTO_OVERHEAD_HORA;

  // 3.4 Mano de Obra (Viáticos)
  let costoViaticos = diasViaje * VIATICO_CHOFER_DIA;
  if (ayudanteId) costoViaticos += (diasViaje * VIATICO_AYUDANTE_DIA);
  
  // Nómina Estimada (Opcional, si no está en overhead)
  const costoSalarioChofer = diasViaje * 15; // Aprox diario salario base
  const costoNominaVariable = costoSalarioChofer; 

  // 3.5 Gastos Ruta
  const costoPeajes = cantidadPeajes * (precioPeajeUnitario / bcv);

  // ==========================================
  // 4. TOTALIZACIÓN
  // ==========================================
  
  let costoTotal = 
      costoCombustible + 
      costoMantenimiento + 
      costoPosesion + 
      costoOverhead + 
      costoViaticos + 
      costoNominaVariable +
      costoPeajes;

  // Sobretasas
  if (tipoCarga === 'peligrosa') costoTotal *= 1.15;
  if (tipoCarga === 'petrolera') costoTotal *= 1.10;

  const precioSugerido = costoTotal / (1 - porcentajeGanancia);

  // Construir respuesta
  return {
    escenario: fuenteDatos, // 'MATRIZ_COSTOS', 'HISTORICO_REAL', 'MANUAL'
    parametros: {
        distancia: distanciaKm,
        tiempo_estimado: `${diasViaje} días (${horasViaje.toFixed(1)} hrs)`,
        consumo_usado: consumoL_Km.toFixed(3) + ' L/km',
        mantenimiento_usado: `$${(mntChutoKm + mntRemolqueKm).toFixed(3)}/km`
    },
    breakdown: {
        combustible: parseFloat(costoCombustible.toFixed(2)),
        mantenimiento: parseFloat(costoMantenimiento.toFixed(2)),
        posesion_activos: parseFloat(costoPosesion.toFixed(2)),
        overhead_admin: parseFloat(costoOverhead.toFixed(2)),
        mano_obra_viaticos: parseFloat((costoViaticos + costoNominaVariable).toFixed(2)),
        peajes: parseFloat(costoPeajes.toFixed(2)),
        total_costo: parseFloat(costoTotal.toFixed(2))
    },
    precioSugerido: parseFloat(precioSugerido.toFixed(2))
  };
}

module.exports = calcularCostoFlete;