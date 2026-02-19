import { NextResponse } from 'next/server';
import db from '@/models';

// =================================================================================
// DATA MAESTRA: VENEZUELA 2026 - INCLUYE GASTOS LEGALES, ROTC Y SEGUROS CARACAS
// =================================================================================
const DATA_VENEZUELA_2026 = [
    // ==========================================
    // 1. MACK GRANITE 2005 (3 Ejes)
    // ==========================================
    {
        nombre: 'Chuto Mack Granite 2005 (3 Ejes)',
        tipoActivo: 'Vehiculo',
        costoPosesionHora: 9.50, 
        detalles: [
            // Operativos
            { descripcion: 'Aceite Motor 15W40 Mineral', unidad: 'Lts', cantidad: 42, tipoDesgaste: 'km', frecuencia: 7000, costoMinimo: 9, costoMaximo: 14, costoUnitario: 11.5 },
            { descripcion: 'Filtros (Aceite, Combustible, Agua)', unidad: 'Kit', cantidad: 1, tipoDesgaste: 'km', frecuencia: 7000, costoMinimo: 60, costoMaximo: 110, costoUnitario: 85 },
            { descripcion: 'Filtros de Aire (Primario y Secundario)', unidad: 'Kit', cantidad: 1, tipoDesgaste: 'km', frecuencia: 15000, costoMinimo: 80, costoMaximo: 140, costoUnitario: 110 },
            { descripcion: 'Aceite Transmisión Eaton/Maxitorque (SAE 50)', unidad: 'Lts', cantidad: 18, tipoDesgaste: 'km', frecuencia: 50000, costoMinimo: 10, costoMaximo: 18, costoUnitario: 14 },
            { descripcion: 'Aceite Diferenciales (85W140)', unidad: 'Lts', cantidad: 28, tipoDesgaste: 'km', frecuencia: 50000, costoMinimo: 10, costoMaximo: 18, costoUnitario: 14 },
            { descripcion: 'Cauchos Direccionales (295/80 R22.5)', unidad: 'Und', cantidad: 2, tipoDesgaste: 'km', frecuencia: 40000, costoMinimo: 350, costoMaximo: 650, costoUnitario: 500 },
            { descripcion: 'Cauchos Tracción (295/80 R22.5)', unidad: 'Und', cantidad: 8, tipoDesgaste: 'km', frecuencia: 35000, costoMinimo: 280, costoMaximo: 600, costoUnitario: 440 },
            { descripcion: 'Bandas de Freno (3 Ejes) y Remaches', unidad: 'Juego', cantidad: 1, tipoDesgaste: 'km', frecuencia: 25000, costoMinimo: 300, costoMaximo: 550, costoUnitario: 425 },
            { descripcion: 'Rectificación de Tambores', unidad: 'Und', cantidad: 6, tipoDesgaste: 'km', frecuencia: 50000, costoMinimo: 90, costoMaximo: 180, costoUnitario: 135 },
            { descripcion: 'Pulmones de Aire (Frenos Maxis)', unidad: 'Und', cantidad: 4, tipoDesgaste: 'meses', frecuencia: 24, costoMinimo: 45, costoMaximo: 90, costoUnitario: 67.5 },
            { descripcion: 'Válvulas Relé y Secador de Aire', unidad: 'Kit', cantidad: 1, tipoDesgaste: 'meses', frecuencia: 12, costoMinimo: 120, costoMaximo: 300, costoUnitario: 210 },
            { descripcion: 'Kit Pasadores (King Pin) y Bocinas', unidad: 'Kit', cantidad: 1, tipoDesgaste: 'km', frecuencia: 80000, costoMinimo: 300, costoMaximo: 600, costoUnitario: 450 },
            { descripcion: 'Suspensión Camelback (Bujes y Gomas)', unidad: 'Kit', cantidad: 1, tipoDesgaste: 'km', frecuencia: 60000, costoMinimo: 400, costoMaximo: 900, costoUnitario: 650 },
            { descripcion: 'Baterías 1100 Amp (12V)', unidad: 'Und', cantidad: 3, tipoDesgaste: 'meses', frecuencia: 18, costoMinimo: 120, costoMaximo: 220, costoUnitario: 170 },
            { descripcion: 'Alineación y Balanceo Pesado', unidad: 'Servicio', cantidad: 1, tipoDesgaste: 'km', frecuencia: 15000, costoMinimo: 60, costoMaximo: 120, costoUnitario: 90 },
            { descripcion: 'Quinta Rueda (Muelas, Gomas, Plato)', unidad: 'Kit', cantidad: 1, tipoDesgaste: 'km', frecuencia: 100000, costoMinimo: 600, costoMaximo: 1400, costoUnitario: 1000 },
            // Legales y Seguros (NUEVO)
            { descripcion: 'Póliza de Seguro Flota (Seguros Caracas)', unidad: 'Poliza', cantidad: 1, tipoDesgaste: 'meses', frecuencia: 12, costoMinimo: 1200, costoMaximo: 2500, costoUnitario: 1800 },
            { descripcion: 'Trámites y Permisos Anuales (ROTC, Tránsito)', unidad: 'Global', cantidad: 1, tipoDesgaste: 'meses', frecuencia: 12, costoMinimo: 300, costoMaximo: 600, costoUnitario: 450 }
        ]
    },

    // ==========================================
    // 2. FREIGHTLINER COLUMBIA (3 Ejes)
    // ==========================================
    {
        nombre: 'Chuto Freightliner Columbia (3 Ejes)',
        tipoActivo: 'Vehiculo',
        costoPosesionHora: 10.00,
        detalles: [
            { descripcion: 'Aceite Motor (ISX / Detroit)', unidad: 'Lts', cantidad: 44, tipoDesgaste: 'km', frecuencia: 8000, costoMinimo: 10, costoMaximo: 16, costoUnitario: 13 },
            { descripcion: 'Cauchos Tracción', unidad: 'Und', cantidad: 8, tipoDesgaste: 'km', frecuencia: 40000, costoMinimo: 280, costoMaximo: 600, costoUnitario: 440 },
            { descripcion: 'Bolsas de Aire (Suspensión Trasera)', unidad: 'Und', cantidad: 4, tipoDesgaste: 'km', frecuencia: 80000, costoMinimo: 120, costoMaximo: 250, costoUnitario: 185 },
            { descripcion: 'Bolsas de Aire (Cabina)', unidad: 'Und', cantidad: 2, tipoDesgaste: 'meses', frecuencia: 24, costoMinimo: 80, costoMaximo: 150, costoUnitario: 115 },
            { descripcion: 'Amortiguadores (Delanteros y Traseros)', unidad: 'Juego', cantidad: 1, tipoDesgaste: 'km', frecuencia: 60000, costoMinimo: 300, costoMaximo: 600, costoUnitario: 450 },
            { descripcion: 'Latonería (Fibra de Vidrio Capot/Espejos)', unidad: 'Global', cantidad: 1, tipoDesgaste: 'meses', frecuencia: 12, costoMinimo: 200, costoMaximo: 800, costoUnitario: 500 },
            { descripcion: 'Bandas de Freno y Rectificación', unidad: 'Eje', cantidad: 3, tipoDesgaste: 'km', frecuencia: 30000, costoMinimo: 150, costoMaximo: 250, costoUnitario: 200 },
            { descripcion: 'Válvula Niveladora de Aire', unidad: 'Und', cantidad: 1, tipoDesgaste: 'meses', frecuencia: 18, costoMinimo: 80, costoMaximo: 180, costoUnitario: 130 },
            // Legales y Seguros (NUEVO)
            { descripcion: 'Póliza de Seguro Flota (Seguros Caracas)', unidad: 'Poliza', cantidad: 1, tipoDesgaste: 'meses', frecuencia: 12, costoMinimo: 1200, costoMaximo: 2500, costoUnitario: 1800 },
            { descripcion: 'Trámites y Permisos Anuales (ROTC, Tránsito)', unidad: 'Global', cantidad: 1, tipoDesgaste: 'meses', frecuencia: 12, costoMinimo: 300, costoMaximo: 600, costoUnitario: 450 }
        ]
    },

    // ==========================================
    // 3. IVECO STRALIS 2008 (3 Ejes)
    // ==========================================
    {
        nombre: 'Chuto Iveco Stralis 2008 (3 Ejes)',
        tipoActivo: 'Vehiculo',
        costoPosesionHora: 9.00,
        detalles: [
            { descripcion: 'Aceite Motor Sintético (Urania)', unidad: 'Lts', cantidad: 35, tipoDesgaste: 'km', frecuencia: 10000, costoMinimo: 12, costoMaximo: 20, costoUnitario: 16 },
            { descripcion: 'Filtros Originales Iveco (Kit completo)', unidad: 'Kit', cantidad: 1, tipoDesgaste: 'km', frecuencia: 10000, costoMinimo: 150, costoMaximo: 280, costoUnitario: 215 },
            { descripcion: 'Cauchos (10 Ruedas Mixtas)', unidad: 'Und', cantidad: 10, tipoDesgaste: 'km', frecuencia: 45000, costoMinimo: 300, costoMaximo: 600, costoUnitario: 450 },
            { descripcion: 'Sensores de Freno EBS/ABS', unidad: 'Und', cantidad: 2, tipoDesgaste: 'km', frecuencia: 60000, costoMinimo: 150, costoMaximo: 350, costoUnitario: 250 },
            { descripcion: 'Inyectores Electrónicos (Mantenimiento)', unidad: 'Juego', cantidad: 1, tipoDesgaste: 'km', frecuencia: 100000, costoMinimo: 800, costoMaximo: 2500, costoUnitario: 1650 },
            { descripcion: 'Bolsas de Aire Suspensión', unidad: 'Und', cantidad: 4, tipoDesgaste: 'km', frecuencia: 75000, costoMinimo: 180, costoMaximo: 350, costoUnitario: 265 },
            { descripcion: 'Sistema Eléctrico (Módulos/Cableado)', unidad: 'Global', cantidad: 1, tipoDesgaste: 'meses', frecuencia: 12, costoMinimo: 300, costoMaximo: 800, costoUnitario: 550 },
            // Legales y Seguros (NUEVO)
            { descripcion: 'Póliza de Seguro Flota (Seguros Caracas)', unidad: 'Poliza', cantidad: 1, tipoDesgaste: 'meses', frecuencia: 12, costoMinimo: 1200, costoMaximo: 2500, costoUnitario: 1800 },
            { descripcion: 'Trámites y Permisos Anuales (ROTC, Tránsito)', unidad: 'Global', cantidad: 1, tipoDesgaste: 'meses', frecuencia: 12, costoMinimo: 300, costoMaximo: 600, costoUnitario: 450 }
        ]
    },

    // ==========================================
    // 4. IVECO TRAKKER 2008 (3 Ejes)
    // ==========================================
    {
        nombre: 'Chuto Iveco Trakker 2008 (3 Ejes Cubo)',
        tipoActivo: 'Vehiculo',
        costoPosesionHora: 10.50,
        detalles: [
            { descripcion: 'Aceite Motor (Severo)', unidad: 'Lts', cantidad: 35, tipoDesgaste: 'km', frecuencia: 7000, costoMinimo: 10, costoMaximo: 18, costoUnitario: 14 },
            { descripcion: 'Aceite Diferenciales de Cubo (Reductores)', unidad: 'Lts', cantidad: 35, tipoDesgaste: 'km', frecuencia: 30000, costoMinimo: 12, costoMaximo: 20, costoUnitario: 16 },
            { descripcion: 'Cauchos Tacos (Off-Road)', unidad: 'Und', cantidad: 10, tipoDesgaste: 'km', frecuencia: 30000, costoMinimo: 350, costoMaximo: 700, costoUnitario: 525 },
            { descripcion: 'Ballestas Reforzadas (Paquetes)', unidad: 'Eje', cantidad: 2, tipoDesgaste: 'km', frecuencia: 50000, costoMinimo: 600, costoMaximo: 1200, costoUnitario: 900 },
            { descripcion: 'Crucetas Heavy Duty', unidad: 'Und', cantidad: 3, tipoDesgaste: 'km', frecuencia: 40000, costoMinimo: 120, costoMaximo: 250, costoUnitario: 185 },
            { descripcion: 'Cardán (Alineación y Balanceo)', unidad: 'Servicio', cantidad: 1, tipoDesgaste: 'km', frecuencia: 50000, costoMinimo: 150, costoMaximo: 400, costoUnitario: 275 },
            // Legales y Seguros (NUEVO)
            { descripcion: 'Póliza de Seguro Flota (Seguros Caracas)', unidad: 'Poliza', cantidad: 1, tipoDesgaste: 'meses', frecuencia: 12, costoMinimo: 1200, costoMaximo: 2500, costoUnitario: 1800 },
            { descripcion: 'Trámites y Permisos Anuales (ROTC, Tránsito)', unidad: 'Global', cantidad: 1, tipoDesgaste: 'meses', frecuencia: 12, costoMinimo: 300, costoMaximo: 600, costoUnitario: 450 }
        ]
    },

    // ==========================================
    // 5. MITSUBISHI FV (3 Ejes)
    // ==========================================
    {
        nombre: 'Chuto Mitsubishi FV (3 Ejes)',
        tipoActivo: 'Vehiculo',
        costoPosesionHora: 9.80,
        detalles: [
            { descripcion: 'Aceite Motor', unidad: 'Lts', cantidad: 38, tipoDesgaste: 'km', frecuencia: 8000, costoMinimo: 9, costoMaximo: 15, costoUnitario: 12 },
            { descripcion: 'Cauchos (10 Ruedas)', unidad: 'Und', cantidad: 10, tipoDesgaste: 'km', frecuencia: 40000, costoMinimo: 280, costoMaximo: 550, costoUnitario: 415 },
            { descripcion: 'Kit Embrague (Plato, Disco, Collarín)', unidad: 'Kit', cantidad: 1, tipoDesgaste: 'km', frecuencia: 120000, costoMinimo: 900, costoMaximo: 1800, costoUnitario: 1350 },
            { descripcion: 'Bombín de Embrague (Superior/Inferior)', unidad: 'Par', cantidad: 1, tipoDesgaste: 'km', frecuencia: 60000, costoMinimo: 120, costoMaximo: 280, costoUnitario: 200 },
            { descripcion: 'Frenos (Bandas y Tambores)', unidad: 'Global', cantidad: 1, tipoDesgaste: 'km', frecuencia: 30000, costoMinimo: 400, costoMaximo: 800, costoUnitario: 600 },
            { descripcion: 'Baterías 1100 Amp', unidad: 'Und', cantidad: 2, tipoDesgaste: 'meses', frecuencia: 18, costoMinimo: 120, costoMaximo: 240, costoUnitario: 180 },
            // Legales y Seguros (NUEVO)
            { descripcion: 'Póliza de Seguro Flota (Seguros Caracas)', unidad: 'Poliza', cantidad: 1, tipoDesgaste: 'meses', frecuencia: 12, costoMinimo: 1200, costoMaximo: 2500, costoUnitario: 1800 },
            { descripcion: 'Trámites y Permisos Anuales (ROTC, Tránsito)', unidad: 'Global', cantidad: 1, tipoDesgaste: 'meses', frecuencia: 12, costoMinimo: 300, costoMaximo: 600, costoUnitario: 450 }
        ]
    },

    // ==========================================
    // 6. MITSUBISHI (2 Ejes)
    // ==========================================
    {
        nombre: 'Chuto Mitsubishi (2 Ejes)',
        tipoActivo: 'Vehiculo',
        costoPosesionHora: 7.50,
        detalles: [
            { descripcion: 'Aceite Motor', unidad: 'Lts', cantidad: 24, tipoDesgaste: 'km', frecuencia: 8000, costoMinimo: 9, costoMaximo: 15, costoUnitario: 12 },
            { descripcion: 'Cauchos (6 Ruedas)', unidad: 'Und', cantidad: 6, tipoDesgaste: 'km', frecuencia: 45000, costoMinimo: 280, costoMaximo: 500, costoUnitario: 390 },
            { descripcion: 'Kit Embrague', unidad: 'Kit', cantidad: 1, tipoDesgaste: 'km', frecuencia: 150000, costoMinimo: 600, costoMaximo: 1200, costoUnitario: 900 },
            { descripcion: 'Tren Delantero (Terminales/Muñones)', unidad: 'Kit', cantidad: 1, tipoDesgaste: 'km', frecuencia: 50000, costoMinimo: 200, costoMaximo: 450, costoUnitario: 325 },
            { descripcion: 'Frenos (Eje Delantero y Trasero)', unidad: 'Kit', cantidad: 1, tipoDesgaste: 'km', frecuencia: 35000, costoMinimo: 250, costoMaximo: 500, costoUnitario: 375 },
            // Legales y Seguros (NUEVO)
            { descripcion: 'Póliza de Seguro Flota (Seguros Caracas)', unidad: 'Poliza', cantidad: 1, tipoDesgaste: 'meses', frecuencia: 12, costoMinimo: 1000, costoMaximo: 2000, costoUnitario: 1500 },
            { descripcion: 'Trámites y Permisos Anuales (ROTC, Tránsito)', unidad: 'Global', cantidad: 1, tipoDesgaste: 'meses', frecuencia: 12, costoMinimo: 300, costoMaximo: 600, costoUnitario: 450 }
        ]
    },

    // ==========================================
    // 7. CHUTO CON BRAZO ARTICULADO (Pitman / Hiab)
    // ==========================================
    {
        nombre: 'Chuto con Brazo Articulado (Pitman)',
        tipoActivo: 'Vehiculo',
        costoPosesionHora: 16.00, 
        detalles: [
            { descripcion: 'Mantenimiento Chuto Base', unidad: 'Global', cantidad: 1, tipoDesgaste: 'km', frecuencia: 1, costoMinimo: 0.35, costoMaximo: 0.45, costoUnitario: 0.38 },
            { descripcion: 'Aceite Hidráulico Brazo ISO 68', unidad: 'Lts', cantidad: 120, tipoDesgaste: 'horas', frecuencia: 2000, costoMinimo: 8, costoMaximo: 14, costoUnitario: 11 },
            { descripcion: 'Mangueras y Sellos Brazo', unidad: 'Kit', cantidad: 1, tipoDesgaste: 'horas', frecuencia: 3000, costoMinimo: 500, costoMaximo: 1200, costoUnitario: 800 },
            { descripcion: 'Gatos Estabilizadores (Mantenimiento)', unidad: 'Par', cantidad: 1, tipoDesgaste: 'horas', frecuencia: 4000, costoMinimo: 300, costoMaximo: 800, costoUnitario: 500 },
            { descripcion: 'Certificación Izamiento (SENCAMER)', unidad: 'Servicio', cantidad: 1, tipoDesgaste: 'meses', frecuencia: 12, costoMinimo: 400, costoMaximo: 600, costoUnitario: 500 },
            // Legales y Seguros (NUEVO)
            { descripcion: 'Póliza de Seguro Equipo Especial (Seguros Caracas)', unidad: 'Poliza', cantidad: 1, tipoDesgaste: 'meses', frecuencia: 12, costoMinimo: 1500, costoMaximo: 3000, costoUnitario: 2200 },
            { descripcion: 'Trámites Especiales Anuales (ROTC, RASDA, Ambiente)', unidad: 'Global', cantidad: 1, tipoDesgaste: 'meses', frecuencia: 12, costoMinimo: 500, costoMaximo: 1000, costoUnitario: 750 }
        ]
    },

    // ==========================================
    // 8. VACUUM 3 EJES (Pesado 300 BBL)
    // ==========================================
    {
        nombre: 'Vacuum 3 Ejes (Camión + Bomba)',
        tipoActivo: 'Vehiculo',
        costoPosesionHora: 15.00,
        detalles: [
            { descripcion: 'Mantenimiento Chuto Base (Global)', unidad: 'Global', cantidad: 1, tipoDesgaste: 'km', frecuencia: 1, costoMinimo: 0.35, costoMaximo: 0.50, costoUnitario: 0.40 },
            { descripcion: 'Aceite Bomba Vacuum (ISO 100/150)', unidad: 'Lts', cantidad: 10, tipoDesgaste: 'horas', frecuencia: 500, costoMinimo: 12, costoMaximo: 25, costoUnitario: 16 },
            { descripcion: 'Paletas Bomba (Kevlar/Fibra)', unidad: 'Juego', cantidad: 1, tipoDesgaste: 'horas', frecuencia: 1500, costoMinimo: 300, costoMaximo: 700, costoUnitario: 450 },
            { descripcion: 'Mangueras Succión 4" Trópico', unidad: 'Tramos', cantidad: 4, tipoDesgaste: 'meses', frecuencia: 6, costoMinimo: 120, costoMaximo: 280, costoUnitario: 180 },
            { descripcion: 'Válvulas de Carga y Descarga (Bronce/Inox)', unidad: 'Und', cantidad: 2, tipoDesgaste: 'meses', frecuencia: 8, costoMinimo: 150, costoMaximo: 400, costoUnitario: 250 },
            { descripcion: 'Manómetros y Relojes de Presión', unidad: 'Und', cantidad: 2, tipoDesgaste: 'meses', frecuencia: 6, costoMinimo: 40, costoMaximo: 120, costoUnitario: 80 },
            { descripcion: 'Toma de Fuerza (PTO) Mantenimiento', unidad: 'Servicio', cantidad: 1, tipoDesgaste: 'horas', frecuencia: 2000, costoMinimo: 200, costoMaximo: 600, costoUnitario: 350 },
            { descripcion: 'Pintura Epóxica Interna Tanque (Corrosión)', unidad: 'Servicio', cantidad: 1, tipoDesgaste: 'meses', frecuencia: 12, costoMinimo: 1200, costoMaximo: 2800, costoUnitario: 1800 },
            { descripcion: 'Limpieza Interna Profunda (Lodos)', unidad: 'Servicio', cantidad: 1, tipoDesgaste: 'meses', frecuencia: 3, costoMinimo: 100, costoMaximo: 300, costoUnitario: 180 },
            // Legales y Seguros (NUEVO)
            { descripcion: 'Póliza de Seguro Equipo Especial (Seguros Caracas)', unidad: 'Poliza', cantidad: 1, tipoDesgaste: 'meses', frecuencia: 12, costoMinimo: 1500, costoMaximo: 3000, costoUnitario: 2200 },
            { descripcion: 'Trámites Especiales Anuales (ROTC, RASDA, Ambiente)', unidad: 'Global', cantidad: 1, tipoDesgaste: 'meses', frecuencia: 12, costoMinimo: 500, costoMaximo: 1000, costoUnitario: 750 }
        ]
    },

    // ==========================================
    // 9. VACUUM 2 EJES (130 BBL)
    // ==========================================
    {
        nombre: 'Vacuum 2 Ejes (130 BBL)',
        tipoActivo: 'Vehiculo',
        costoPosesionHora: 12.00,
        detalles: [
            { descripcion: 'Mantenimiento Chuto Base 2 Ejes', unidad: 'Global', cantidad: 1, tipoDesgaste: 'km', frecuencia: 1, costoMinimo: 0.25, costoMaximo: 0.40, costoUnitario: 0.32 },
            { descripcion: 'Aceite Bomba Vacuum', unidad: 'Lts', cantidad: 6, tipoDesgaste: 'horas', frecuencia: 500, costoMinimo: 12, costoMaximo: 22, costoUnitario: 17 },
            { descripcion: 'Paletas Bomba Vacuum (Chica)', unidad: 'Juego', cantidad: 1, tipoDesgaste: 'horas', frecuencia: 1500, costoMinimo: 200, costoMaximo: 500, costoUnitario: 350 },
            { descripcion: 'Mangueras Succión 3" Trópico', unidad: 'Tramos', cantidad: 3, tipoDesgaste: 'meses', frecuencia: 6, costoMinimo: 90, costoMaximo: 200, costoUnitario: 145 },
            { descripcion: 'Válvulas Carga/Descarga 3"', unidad: 'Und', cantidad: 2, tipoDesgaste: 'meses', frecuencia: 8, costoMinimo: 100, costoMaximo: 250, costoUnitario: 175 },
            { descripcion: 'Pintura Epóxica Tanque 130 BBL', unidad: 'Servicio', cantidad: 1, tipoDesgaste: 'meses', frecuencia: 18, costoMinimo: 800, costoMaximo: 1800, costoUnitario: 1300 },
            { descripcion: 'Toma de Fuerza (PTO) Mantenimiento', unidad: 'Servicio', cantidad: 1, tipoDesgaste: 'horas', frecuencia: 2000, costoMinimo: 150, costoMaximo: 450, costoUnitario: 300 },
            // Legales y Seguros (NUEVO)
            { descripcion: 'Póliza de Seguro Equipo Especial (Seguros Caracas)', unidad: 'Poliza', cantidad: 1, tipoDesgaste: 'meses', frecuencia: 12, costoMinimo: 1200, costoMaximo: 2500, costoUnitario: 1800 },
            { descripcion: 'Trámites Especiales Anuales (ROTC, RASDA, Ambiente)', unidad: 'Global', cantidad: 1, tipoDesgaste: 'meses', frecuencia: 12, costoMinimo: 400, costoMaximo: 800, costoUnitario: 600 }
        ]
    },

    // ==========================================
    // 10. BATEA 3 EJES
    // ==========================================
    {
        nombre: 'Batea Plataforma (3 Ejes)',
        tipoActivo: 'Remolque',
        costoPosesionHora: 2.50,
        detalles: [
            { descripcion: 'Cauchos Batea (12 Ruedas)', unidad: 'Und', cantidad: 12, tipoDesgaste: 'km', frecuencia: 55000, costoMinimo: 280, costoMaximo: 480, costoUnitario: 380 },
            { descripcion: 'Bandas de Freno', unidad: 'Eje', cantidad: 3, tipoDesgaste: 'km', frecuencia: 30000, costoMinimo: 100, costoMaximo: 200, costoUnitario: 150 },
            { descripcion: 'Tambores de Freno Batea', unidad: 'Und', cantidad: 6, tipoDesgaste: 'km', frecuencia: 100000, costoMinimo: 120, costoMaximo: 250, costoUnitario: 185 },
            { descripcion: 'Estoperas y Rodamientos (Puntas de Eje)', unidad: 'Kit', cantidad: 6, tipoDesgaste: 'km', frecuencia: 50000, costoMinimo: 40, costoMaximo: 100, costoUnitario: 70 },
            { descripcion: 'Pivote (King Pin) 2"', unidad: 'Und', cantidad: 1, tipoDesgaste: 'km', frecuencia: 150000, costoMinimo: 150, costoMaximo: 350, costoUnitario: 250 },
            { descripcion: 'Patas de Apoyo (Jost)', unidad: 'Par', cantidad: 1, tipoDesgaste: 'meses', frecuencia: 24, costoMinimo: 400, costoMaximo: 900, costoUnitario: 650 },
            { descripcion: 'Luces Laterales, Cocuyos y Stop', unidad: 'Global', cantidad: 1, tipoDesgaste: 'meses', frecuencia: 6, costoMinimo: 50, costoMaximo: 150, costoUnitario: 100 },
            { descripcion: 'Vigas y Piso (Soldadura/Refuerzo)', unidad: 'Servicio', cantidad: 1, tipoDesgaste: 'meses', frecuencia: 12, costoMinimo: 200, costoMaximo: 800, costoUnitario: 500 },
            { descripcion: 'Pulmones y Válvulas Relé (Aire)', unidad: 'Kit', cantidad: 1, tipoDesgaste: 'meses', frecuencia: 12, costoMinimo: 100, costoMaximo: 300, costoUnitario: 200 },
            // Legales y Seguros (NUEVO)
            { descripcion: 'Póliza de Seguro RCV Remolque (Seguros Caracas)', unidad: 'Poliza', cantidad: 1, tipoDesgaste: 'meses', frecuencia: 12, costoMinimo: 300, costoMaximo: 600, costoUnitario: 450 },
            { descripcion: 'Trámites Remolque Anuales (ROTC, Revisión)', unidad: 'Global', cantidad: 1, tipoDesgaste: 'meses', frecuencia: 12, costoMinimo: 150, costoMaximo: 300, costoUnitario: 225 }
        ]
    },

    // ==========================================
    // 11. BATEA 2 EJES
    // ==========================================
    {
        nombre: 'Batea Plataforma (2 Ejes)',
        tipoActivo: 'Remolque',
        costoPosesionHora: 1.80,
        detalles: [
            { descripcion: 'Cauchos Batea (8 Ruedas)', unidad: 'Und', cantidad: 8, tipoDesgaste: 'km', frecuencia: 55000, costoMinimo: 280, costoMaximo: 480, costoUnitario: 380 },
            { descripcion: 'Bandas de Freno', unidad: 'Eje', cantidad: 2, tipoDesgaste: 'km', frecuencia: 30000, costoMinimo: 100, costoMaximo: 200, costoUnitario: 150 },
            { descripcion: 'Tambores de Freno Batea', unidad: 'Und', cantidad: 4, tipoDesgaste: 'km', frecuencia: 100000, costoMinimo: 120, costoMaximo: 250, costoUnitario: 185 },
            { descripcion: 'Estoperas y Rodamientos', unidad: 'Kit', cantidad: 4, tipoDesgaste: 'km', frecuencia: 50000, costoMinimo: 40, costoMaximo: 100, costoUnitario: 70 },
            { descripcion: 'Patas de Apoyo', unidad: 'Par', cantidad: 1, tipoDesgaste: 'meses', frecuencia: 24, costoMinimo: 400, costoMaximo: 900, costoUnitario: 650 },
            { descripcion: 'Luces y Mantenimiento Eléctrico', unidad: 'Global', cantidad: 1, tipoDesgaste: 'meses', frecuencia: 6, costoMinimo: 40, costoMaximo: 120, costoUnitario: 80 },
            // Legales y Seguros (NUEVO)
            { descripcion: 'Póliza de Seguro RCV Remolque (Seguros Caracas)', unidad: 'Poliza', cantidad: 1, tipoDesgaste: 'meses', frecuencia: 12, costoMinimo: 300, costoMaximo: 500, costoUnitario: 400 },
            { descripcion: 'Trámites Remolque Anuales (ROTC, Revisión)', unidad: 'Global', cantidad: 1, tipoDesgaste: 'meses', frecuencia: 12, costoMinimo: 150, costoMaximo: 300, costoUnitario: 225 }
        ]
    },

    // ==========================================
    // 12. LOW BOY CARGA PESADA
    // ==========================================
    {
        nombre: 'Low Boy (Cuello Cisne / Carga Pesada)',
        tipoActivo: 'Remolque',
        costoPosesionHora: 6.50,
        detalles: [
            { descripcion: 'Cauchos (16 Ruedas)', unidad: 'Und', cantidad: 16, tipoDesgaste: 'km', frecuencia: 35000, costoMinimo: 280, costoMaximo: 500, costoUnitario: 420 },
            { descripcion: 'Frenos (4 Ejes pesados)', unidad: 'Juego', cantidad: 4, tipoDesgaste: 'km', frecuencia: 20000, costoMinimo: 200, costoMaximo: 450, costoUnitario: 300 },
            { descripcion: 'Piso de Madera (Reemplazo Cuerias)', unidad: 'Global', cantidad: 1, tipoDesgaste: 'meses', frecuencia: 18, costoMinimo: 800, costoMaximo: 2000, costoUnitario: 1200 },
            { descripcion: 'Aceite Hidráulico Cuello', unidad: 'Lts', cantidad: 20, tipoDesgaste: 'meses', frecuencia: 12, costoMinimo: 8, costoMaximo: 15, costoUnitario: 11 },
            { descripcion: 'Mantenimiento Gatos Hidráulicos (Sellos)', unidad: 'Servicio', cantidad: 1, tipoDesgaste: 'meses', frecuencia: 12, costoMinimo: 400, costoMaximo: 1200, costoUnitario: 800 },
            { descripcion: 'Mangueras de Alta Presión', unidad: 'Kit', cantidad: 1, tipoDesgaste: 'meses', frecuencia: 12, costoMinimo: 150, costoMaximo: 400, costoUnitario: 250 },
            { descripcion: 'Luces Estroboscópicas / Sirena Carga Ancha', unidad: 'Kit', cantidad: 1, tipoDesgaste: 'meses', frecuencia: 12, costoMinimo: 100, costoMaximo: 300, costoUnitario: 180 },
            // Legales y Seguros (NUEVO)
            { descripcion: 'Póliza de Seguro RCV y Carga Especial (Seguros Caracas)', unidad: 'Poliza', cantidad: 1, tipoDesgaste: 'meses', frecuencia: 12, costoMinimo: 500, costoMaximo: 1000, costoUnitario: 750 },
            { descripcion: 'Trámites Remolque Anuales (ROTC, Revisión)', unidad: 'Global', cantidad: 1, tipoDesgaste: 'meses', frecuencia: 12, costoMinimo: 150, costoMaximo: 300, costoUnitario: 225 }
        ]
    },

    // ==========================================
    // 13. CAMIÓN VOLTEO
    // ==========================================
    {
        nombre: 'Camión Volteo (14-16 Metros)',
        tipoActivo: 'Vehiculo',
        costoPosesionHora: 8.50,
        detalles: [
            { descripcion: 'Aceite Motor', unidad: 'Lts', cantidad: 22, tipoDesgaste: 'km', frecuencia: 6000, costoMinimo: 9, costoMaximo: 15, costoUnitario: 12 },
            { descripcion: 'Cauchos Tracción (Bate Piedra/Minero)', unidad: 'Und', cantidad: 4, tipoDesgaste: 'km', frecuencia: 25000, costoMinimo: 280, costoMaximo: 550, costoUnitario: 415 },
            { descripcion: 'Cauchos Direccionales', unidad: 'Und', cantidad: 2, tipoDesgaste: 'km', frecuencia: 30000, costoMinimo: 250, costoMaximo: 500, costoUnitario: 375 },
            { descripcion: 'Aceite Hidráulico Gato Tolva (ISO 68)', unidad: 'Lts', cantidad: 40, tipoDesgaste: 'meses', frecuencia: 12, costoMinimo: 6, costoMaximo: 12, costoUnitario: 9 },
            { descripcion: 'Sellos y O-Rings Gato Hidráulico', unidad: 'Kit', cantidad: 1, tipoDesgaste: 'meses', frecuencia: 12, costoMinimo: 150, costoMaximo: 350, costoUnitario: 250 },
            { descripcion: 'Mantenimiento Bomba Hidráulica y PTO', unidad: 'Servicio', cantidad: 1, tipoDesgaste: 'meses', frecuencia: 12, costoMinimo: 200, costoMaximo: 600, costoUnitario: 400 },
            { descripcion: 'Soldadura Tolva y Compuerta', unidad: 'Global', cantidad: 1, tipoDesgaste: 'meses', frecuencia: 6, costoMinimo: 100, costoMaximo: 400, costoUnitario: 250 },
            { descripcion: 'Frenos (Bandas Traseras Desgaste Severo)', unidad: 'Juego', cantidad: 1, tipoDesgaste: 'km', frecuencia: 15000, costoMinimo: 150, costoMaximo: 300, costoUnitario: 225 },
            // Legales y Seguros (NUEVO)
            { descripcion: 'Póliza de Seguro Flota (Seguros Caracas)', unidad: 'Poliza', cantidad: 1, tipoDesgaste: 'meses', frecuencia: 12, costoMinimo: 800, costoMaximo: 1500, costoUnitario: 1150 },
            { descripcion: 'Trámites y Permisos Anuales (ROTC, CVG/Gobernación)', unidad: 'Global', cantidad: 1, tipoDesgaste: 'meses', frecuencia: 12, costoMinimo: 250, costoMaximo: 500, costoUnitario: 375 }
        ]
    },

    // ==========================================
    // 14. CAMIÓN MITSUBISHI CANTER (Soldadura)
    // ==========================================
    {
        nombre: 'Camión Mitsubishi Canter (Taller/Soldadura)',
        tipoActivo: 'Vehiculo',
        costoPosesionHora: 4.50,
        detalles: [
            { descripcion: 'Aceite Motor (Camión)', unidad: 'Lts', cantidad: 12, tipoDesgaste: 'km', frecuencia: 7000, costoMinimo: 8, costoMaximo: 14, costoUnitario: 10 },
            { descripcion: 'Cauchos (6 Ruedas)', unidad: 'Und', cantidad: 6, tipoDesgaste: 'km', frecuencia: 45000, costoMinimo: 120, costoMaximo: 250, costoUnitario: 180 },
            { descripcion: 'Batería Camión 800 Amp', unidad: 'Und', cantidad: 1, tipoDesgaste: 'meses', frecuencia: 24, costoMinimo: 80, costoMaximo: 150, costoUnitario: 110 },
            { descripcion: 'Mantenimiento Planta de Soldar (Filtros/Aceite)', unidad: 'Servicio', cantidad: 1, tipoDesgaste: 'horas', frecuencia: 250, costoMinimo: 80, costoMaximo: 200, costoUnitario: 120 },
            { descripcion: 'Bornes y Cables de Soldar', unidad: 'Global', cantidad: 1, tipoDesgaste: 'meses', frecuencia: 8, costoMinimo: 40, costoMaximo: 120, costoUnitario: 80 },
            // Legales y Seguros (NUEVO)
            { descripcion: 'Póliza de Seguro Carga (Seguros Caracas)', unidad: 'Poliza', cantidad: 1, tipoDesgaste: 'meses', frecuencia: 12, costoMinimo: 800, costoMaximo: 1500, costoUnitario: 1150 },
            { descripcion: 'Trámites y Permisos Anuales (ROTC, Tránsito)', unidad: 'Global', cantidad: 1, tipoDesgaste: 'meses', frecuencia: 12, costoMinimo: 250, costoMaximo: 500, costoUnitario: 375 }
        ]
    },

    // ==========================================
    // 15. TOYOTA HILUX 2024
    // ==========================================
    {
        nombre: 'Camioneta Toyota Hilux 2024',
        tipoActivo: 'Vehiculo',
        costoPosesionHora: 4.50,
        detalles: [
            { descripcion: 'Aceite Sintético (5W30) y Filtro Original', unidad: 'Servicio', cantidad: 1, tipoDesgaste: 'km', frecuencia: 8000, costoMinimo: 80, costoMaximo: 180, costoUnitario: 130 },
            { descripcion: 'Cauchos A/T (All Terrain 265/65R17)', unidad: 'Und', cantidad: 4, tipoDesgaste: 'km', frecuencia: 50000, costoMinimo: 180, costoMaximo: 380, costoUnitario: 280 },
            { descripcion: 'Pastillas de Freno (Delanteras)', unidad: 'Juego', cantidad: 1, tipoDesgaste: 'km', frecuencia: 25000, costoMinimo: 60, costoMaximo: 140, costoUnitario: 100 },
            { descripcion: 'Zapatas de Freno (Traseras)', unidad: 'Juego', cantidad: 1, tipoDesgaste: 'km', frecuencia: 50000, costoMinimo: 50, costoMaximo: 120, costoUnitario: 85 },
            { descripcion: 'Filtro Aire y A/C', unidad: 'Kit', cantidad: 1, tipoDesgaste: 'km', frecuencia: 15000, costoMinimo: 40, costoMaximo: 90, costoUnitario: 65 },
            { descripcion: 'Alineación y Balanceo', unidad: 'Servicio', cantidad: 1, tipoDesgaste: 'km', frecuencia: 10000, costoMinimo: 30, costoMaximo: 60, costoUnitario: 45 },
            { descripcion: 'Batería (Moura/Duncan)', unidad: 'Und', cantidad: 1, tipoDesgaste: 'meses', frecuencia: 24, costoMinimo: 90, costoMaximo: 160, costoUnitario: 125 },
            // Legales y Seguros (NUEVO)
            { descripcion: 'Póliza Todo Riesgo Premium (Seguros Caracas)', unidad: 'Poliza', cantidad: 1, tipoDesgaste: 'meses', frecuencia: 12, costoMinimo: 1200, costoMaximo: 2500, costoUnitario: 1800 },
            { descripcion: 'Trámites Anuales (Aranceles, Placas, Revisión)', unidad: 'Global', cantidad: 1, tipoDesgaste: 'meses', frecuencia: 12, costoMinimo: 150, costoMaximo: 300, costoUnitario: 225 }
        ]
    },

    // ==========================================
    // 16. FORD EXPLORER 2003 SPORT (2 Puertas)
    // ==========================================
    {
        nombre: 'Camioneta Ford Explorer 2003 Sport (2 Pts)',
        tipoActivo: 'Vehiculo',
        costoPosesionHora: 1.50, // Muy depreciada
        detalles: [
            { descripcion: 'Aceite Motor Mineral/Semi 15W40', unidad: 'Lts', cantidad: 6, tipoDesgaste: 'km', frecuencia: 5000, costoMinimo: 7, costoMaximo: 12, costoUnitario: 9.5 },
            { descripcion: 'Aceite Transmisión Automática (Mercon V)', unidad: 'Lts', cantidad: 12, tipoDesgaste: 'km', frecuencia: 40000, costoMinimo: 8, costoMaximo: 15, costoUnitario: 11.5 },
            { descripcion: 'Filtro de Caja Automática', unidad: 'Und', cantidad: 1, tipoDesgaste: 'km', frecuencia: 40000, costoMinimo: 25, costoMaximo: 60, costoUnitario: 42.5 },
            { descripcion: 'Cauchos (235/75 R15 o similar)', unidad: 'Und', cantidad: 4, tipoDesgaste: 'km', frecuencia: 40000, costoMinimo: 100, costoMaximo: 220, costoUnitario: 160 },
            { descripcion: 'Tren Delantero (Muñones, Terminales, Lápices)', unidad: 'Kit', cantidad: 1, tipoDesgaste: 'meses', frecuencia: 12, costoMinimo: 150, costoMaximo: 400, costoUnitario: 275 },
            { descripcion: 'Amortiguadores', unidad: 'Und', cantidad: 4, tipoDesgaste: 'km', frecuencia: 50000, costoMinimo: 40, costoMaximo: 90, costoUnitario: 65 },
            { descripcion: 'Frenos (Pastillas)', unidad: 'Juego', cantidad: 1, tipoDesgaste: 'km', frecuencia: 20000, costoMinimo: 30, costoMaximo: 70, costoUnitario: 50 },
            { descripcion: 'Bomba de Gasolina / Flotador', unidad: 'Und', cantidad: 1, tipoDesgaste: 'meses', frecuencia: 18, costoMinimo: 40, costoMaximo: 120, costoUnitario: 80 },
            { descripcion: 'Batería', unidad: 'Und', cantidad: 1, tipoDesgaste: 'meses', frecuencia: 18, costoMinimo: 70, costoMaximo: 130, costoUnitario: 100 },
            // Legales y Seguros (NUEVO)
            { descripcion: 'Póliza RCV / Cobertura Básica (Seguros Caracas)', unidad: 'Poliza', cantidad: 1, tipoDesgaste: 'meses', frecuencia: 12, costoMinimo: 500, costoMaximo: 1000, costoUnitario: 750 },
            { descripcion: 'Trámites Anuales (Aranceles, Trimestres)', unidad: 'Global', cantidad: 1, tipoDesgaste: 'meses', frecuencia: 12, costoMinimo: 150, costoMaximo: 300, costoUnitario: 225 }
        ]
    }
];

export async function POST() {
    const t = await db.sequelize.transaction();
    try {
        let logs = [];
        const HORAS_POR_MES = 166.66; // 2000 hrs / 12 meses
        const KM_POR_HORA = 40;       // Velocidad promedio

        for (const perfil of DATA_VENEZUELA_2026) {
            // 1. Crear o encontrar la Matriz
            const [matriz] = await db.MatrizCosto.findOrCreate({
                where: { nombre: perfil.nombre },
                defaults: { 
                    tipoActivo: perfil.tipoActivo, 
                    totalCostoKm: 0, 
                    totalCostoHora: 0,
                    costoPosesionHora: perfil.costoPosesionHora
                },
                transaction: t
            });

            // Actualizamos la posesión por si cambió en el array
            await matriz.update({ costoPosesionHora: perfil.costoPosesionHora }, { transaction: t });

            // 2. Limpiar los detalles viejos para evitar duplicados
            await db.DetalleMatrizCosto.destroy({ where: { matrizId: matriz.id }, transaction: t });
            
            let totalKm = 0;
            let totalHora = 0;

            // 3. Crear los nuevos detalles con el esquema híbrido
            const detallesConId = perfil.detalles.map(d => {
                const costoGasto = d.cantidad * d.costoUnitario;
                
                if (d.tipoDesgaste === 'km') {
                    totalKm += (costoGasto / d.frecuencia);
                } else if (d.tipoDesgaste === 'horas') {
                    totalHora += (costoGasto / d.frecuencia);
                } else if (d.tipoDesgaste === 'meses') {
                    totalHora += (costoGasto / (d.frecuencia * HORAS_POR_MES));
                }
                
                return { ...d, matrizId: matriz.id };
            });

            await db.DetalleMatrizCosto.bulkCreate(detallesConId, { transaction: t });
            
            // 4. Guardar ambos totales en la cabecera
            await matriz.update({ 
                totalCostoKm: totalKm, 
                totalCostoHora: totalHora 
            }, { transaction: t });
            
            logs.push(`${perfil.nombre}: Creado/Actualizado (${detallesConId.length} insumos)`);
        }

        await t.commit();
        return NextResponse.json({ 
            success: true, 
            message: "¡Base de datos Maestra Vzla 2026 actualizada con éxito! Se incluyeron seguros y trámites en todos los activos.",
            logs 
        });

    } catch (error) {
        await t.rollback();
        console.error(error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}