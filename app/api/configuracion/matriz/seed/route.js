import { NextResponse } from 'next/server';
import db from '@/models';

// =================================================================================
// DATA MAESTRA: VENEZUELA 2026 (DETALLADA SEGÚN TUS EXCELS)
// =================================================================================
// NOTA: Los costos unitarios incluyen Repuesto + Mano de Obra asociada (Costo Instalado)
// Frecuencias ajustadas a la realidad vial (huecos/desgaste severo).

const DATA_VENEZUELA_2026 = [
    // 1. CHUTO MACK (El caballo de batalla)
    {
        nombre: 'Estructura Costos Chuto MACK (Granite/Vision)',
        tipoActivo: 'Vehiculo',
        // Valor Reposición Estimado: $60,000 | Vida útil remanente: 5 años
        // Depreciación: $12,000/año + Interés/Riesgo (15%): $9,000 = $21,000/año
        // Horas operativas/año: 2000 => ~$10.50/hora
        costoPosesionHora: 10.50, 
        detalles: [
            // --- MOTOR Y FLUIDOS ---
            { descripcion: 'Aceite Motor 15W-40 (C/Filtros)', unidad: 'Litros', cantidad: 42, frecuenciaKm: 7000, costoUnitario: 12.50 }, // $525 el cambio
            { descripcion: 'Aceite Caja (80W-90)', unidad: 'Litros', cantidad: 18, frecuenciaKm: 50000, costoUnitario: 14.00 },
            { descripcion: 'Aceite Diferenciales (85W-140)', unidad: 'Litros', cantidad: 24, frecuenciaKm: 50000, costoUnitario: 14.00 },
            { descripcion: 'Refrigerante (Coolant)', unidad: 'Galón', cantidad: 10, frecuenciaKm: 40000, costoUnitario: 25.00 },
            { descripcion: 'Filtros Aire (Prim/Sec)', unidad: 'Juego', cantidad: 1, frecuenciaKm: 15000, costoUnitario: 120.00 },

            // --- NEUMÁTICOS (El mayor gasto) ---
            // Precio promedio 2026 de un caucho bueno en Vzla: $450 - $500
            { descripcion: 'Neumáticos Direccionales', unidad: 'Unidad', cantidad: 2, frecuenciaKm: 40000, costoUnitario: 480.00 },
            { descripcion: 'Neumáticos Tracción (Chuto)', unidad: 'Unidad', cantidad: 8, frecuenciaKm: 35000, costoUnitario: 450.00 },
            { descripcion: 'Reparación Pinchaduras/Válvulas', unidad: 'Global', cantidad: 1, frecuenciaKm: 5000, costoUnitario: 50.00 },

            // --- TREN DELANTERO Y DIRECCIÓN (Items del Excel) ---
            { descripcion: 'Caja de Dirección (Mantenimiento)', unidad: 'Conjunto', cantidad: 1, frecuenciaKm: 150000, costoUnitario: 800.00 },
            { descripcion: 'Terminales y Barra Corta', unidad: 'Conjunto', cantidad: 1, frecuenciaKm: 40000, costoUnitario: 350.00 },
            { descripcion: 'Kit Pasadores (King Pin)', unidad: 'Conjunto', cantidad: 1, frecuenciaKm: 60000, costoUnitario: 450.00 },
            { descripcion: 'Alineación y Graduación', unidad: 'Servicio', cantidad: 1, frecuenciaKm: 15000, costoUnitario: 80.00 },

            // --- SUSPENSIÓN (Items del Excel) ---
            { descripcion: 'Resortes Delanteros (Ballestas)', unidad: 'Conjunto', cantidad: 2, frecuenciaKm: 50000, costoUnitario: 600.00 },
            { descripcion: 'Suspensión Cabina (Bolsas/Amort)', unidad: 'Conjunto', cantidad: 1, frecuenciaKm: 60000, costoUnitario: 400.00 },
            { descripcion: 'Amortiguadores Delanteros', unidad: 'Par', cantidad: 1, frecuenciaKm: 50000, costoUnitario: 280.00 },
            { descripcion: 'Tensores y Bujes Traseros', unidad: 'Conjunto', cantidad: 1, frecuenciaKm: 40000, costoUnitario: 550.00 },
            { descripcion: 'Quinta Rueda (Kit Reparación/Plato)', unidad: 'Unidad', cantidad: 1, frecuenciaKm: 80000, costoUnitario: 1200.00 },

            // --- FRENOS ---
            { descripcion: 'Bandas de Freno (Juego x6 ruedas)', unidad: 'Juego', cantidad: 1, frecuenciaKm: 25000, costoUnitario: 450.00 },
            { descripcion: 'Tambores de Freno (Rectificación/Cambio)', unidad: 'Unidad', cantidad: 6, frecuenciaKm: 80000, costoUnitario: 200.00 },
            
            // --- VARIOS ---
            { descripcion: 'Baterías 1100 Amp', unidad: 'Unidad', cantidad: 3, frecuenciaKm: 60000, costoUnitario: 180.00 },
            { descripcion: 'Crucetas y Cardan', unidad: 'Conjunto', cantidad: 1, frecuenciaKm: 50000, costoUnitario: 300.00 }
        ]
    },

    // 2. CHUTO IVECO (STRALIS/TRAKKER) - Repuestos Europeos más caros
    {
        nombre: 'Estructura Costos Chuto IVECO',
        tipoActivo: 'Vehiculo',
        costoPosesionHora: 9.80, 
        detalles: [
            { descripcion: 'Aceite Motor (Sintético/Semi)', unidad: 'Litros', cantidad: 38, frecuenciaKm: 10000, costoUnitario: 14.00 },
            { descripcion: 'Kit Filtros (Original Iveco)', unidad: 'Juego', cantidad: 1, frecuenciaKm: 10000, costoUnitario: 180.00 },
            { descripcion: 'Neumáticos Direccionales', unidad: 'Unidad', cantidad: 2, frecuenciaKm: 45000, costoUnitario: 480.00 },
            { descripcion: 'Neumáticos Tracción', unidad: 'Unidad', cantidad: 8, frecuenciaKm: 40000, costoUnitario: 450.00 },
            { descripcion: 'Suspensión Neumática (Bolsas Aire)', unidad: 'Unidad', cantidad: 4, frecuenciaKm: 60000, costoUnitario: 220.00 },
            { descripcion: 'Sistema Inyección (Mantenimiento)', unidad: 'Servicio', cantidad: 1, frecuenciaKm: 80000, costoUnitario: 1500.00 },
            { descripcion: 'Quinta Rueda', unidad: 'Unidad', cantidad: 1, frecuenciaKm: 100000, costoUnitario: 1400.00 },
            { descripcion: 'Sistema Eléctrico/Sensores', unidad: 'Global', cantidad: 1, frecuenciaKm: 20000, costoUnitario: 200.00 }
        ]
    },

    // 3. CHUTO MITSUBISHI (FV) - Japonés, repuesto escaso pero duradero
    {
        nombre: 'Estructura Costos Chuto MITSUBISHI',
        tipoActivo: 'Vehiculo',
        costoPosesionHora: 9.50,
        detalles: [
            { descripcion: 'Aceite Motor', unidad: 'Litros', cantidad: 35, frecuenciaKm: 8000, costoUnitario: 12.00 },
            { descripcion: 'Filtros (Aire/Aceite/Comb)', unidad: 'Juego', cantidad: 1, frecuenciaKm: 8000, costoUnitario: 140.00 },
            { descripcion: 'Neumáticos (Total 10)', unidad: 'Unidad', cantidad: 10, frecuenciaKm: 40000, costoUnitario: 460.00 },
            { descripcion: 'Ballestas Delanteras (Paquete)', unidad: 'Conjunto', cantidad: 2, frecuenciaKm: 60000, costoUnitario: 700.00 },
            { descripcion: 'Kit Embrague/Clutch', unidad: 'Kit', cantidad: 1, frecuenciaKm: 120000, costoUnitario: 1100.00 },
            { descripcion: 'Terminales Dirección', unidad: 'Kit', cantidad: 1, frecuenciaKm: 50000, costoUnitario: 400.00 }
        ]
    },

    // 4. BATEA / PLATAFORMA (3 EJES)
    {
        nombre: 'Estructura Costos Batea 3 Ejes',
        tipoActivo: 'Remolque',
        // Valor Reposición: $12,000 | Mantenimiento estructural
        costoPosesionHora: 2.50,
        detalles: [
            { descripcion: 'Neumáticos (12 Ruedas)', unidad: 'Unidad', cantidad: 12, frecuenciaKm: 50000, costoUnitario: 420.00 }, // $5040 en cauchos cada 50k km
            { descripcion: 'Bandas Freno (3 Ejes)', unidad: 'Juego', cantidad: 3, frecuenciaKm: 30000, costoUnitario: 250.00 },
            { descripcion: 'Rodamientos y Estoperas', unidad: 'Kit Eje', cantidad: 3, frecuenciaKm: 20000, costoUnitario: 150.00 },
            { descripcion: 'Bocinas de Leva y Ratches', unidad: 'Kit', cantidad: 6, frecuenciaKm: 40000, costoUnitario: 80.00 },
            { descripcion: 'Suspensión (Vigas/Balancines)', unidad: 'Servicio', cantidad: 1, frecuenciaKm: 60000, costoUnitario: 800.00 },
            { descripcion: 'Patas de Apoyo (Jost/Holland)', unidad: 'Par', cantidad: 1, frecuenciaKm: 100000, costoUnitario: 900.00 },
            { descripcion: 'Piso y Vigas (Soldadura)', unidad: 'Global', cantidad: 1, frecuenciaKm: 50000, costoUnitario: 500.00 }
        ]
    },

    // 5. LOW BOY (CARGA PESADA) - Desgaste masivo de cauchos
    {
        nombre: 'Estructura Costos Low Boy',
        tipoActivo: 'Remolque',
        costoPosesionHora: 6.00,
        detalles: [
            { descripcion: 'Neumáticos (16 Ruedas)', unidad: 'Unidad', cantidad: 16, frecuenciaKm: 35000, costoUnitario: 420.00 },
            { descripcion: 'Sistema Hidráulico (Gatos)', unidad: 'Servicio', cantidad: 1, frecuenciaKm: 20000, costoUnitario: 600.00 },
            { descripcion: 'Piso de Madera (Cuerias)', unidad: 'Global', cantidad: 1, frecuenciaKm: 40000, costoUnitario: 1200.00 },
            { descripcion: 'Frenos (4 Ejes)', unidad: 'Juego', cantidad: 4, frecuenciaKm: 20000, costoUnitario: 300.00 },
            { descripcion: 'Cuello de Cisne (Pines/Bujes)', unidad: 'Kit', cantidad: 1, frecuenciaKm: 50000, costoUnitario: 500.00 }
        ]
    },

    // 6. VACUUM (CAMIÓN + EQUIPO BOMBA)
    {
        nombre: 'Estructura Costos Vacuum',
        tipoActivo: 'Vehiculo',
        costoPosesionHora: 14.00, // Equipo muy costoso
        detalles: [
            // Incluye mantenimiento del Chuto Base + Sistema Vacuum
            { descripcion: 'Mantenimiento Chuto Base (Motor/Caja)', unidad: 'Global', cantidad: 1, frecuenciaKm: 1, costoUnitario: 0.85 }, // Valor aprox $/km del chuto solo
            
            // ESPECÍFICO VACUUM
            { descripcion: 'Aceite Bomba Vacuum', unidad: 'Litros', cantidad: 5, frecuenciaKm: 2000, costoUnitario: 15.00 },
            { descripcion: 'Paletas de Bomba (Desgaste)', unidad: 'Juego', cantidad: 1, frecuenciaKm: 10000, costoUnitario: 450.00 },
            { descripcion: 'Mangueras Succión 4" (x6m)', unidad: 'Tramo', cantidad: 4, frecuenciaKm: 8000, costoUnitario: 180.00 },
            { descripcion: 'Válvulas Carga/Descarga', unidad: 'Unidad', cantidad: 2, frecuenciaKm: 15000, costoUnitario: 250.00 },
            { descripcion: 'Limpieza Interna Tanque', unidad: 'Servicio', cantidad: 1, frecuenciaKm: 5000, costoUnitario: 150.00 }
        ]
    }
];

export async function POST() {
    const t = await db.sequelize.transaction();
    try {
        let logs = [];

        for (const perfil of DATA_VENEZUELA_2026) {
            // A. Crear o Buscar Cabecera
            const [matriz, created] = await db.MatrizCosto.findOrCreate({
                where: { nombre: perfil.nombre },
                defaults: {
                    tipoActivo: perfil.tipoActivo,
                    costoPosesionHora: perfil.costoPosesionHora,
                    totalCostoKm: 0
                },
                transaction: t
            });

            // Actualizamos la posesión siempre a valor 2026
            if (!created) {
                await matriz.update({ costoPosesionHora: perfil.costoPosesionHora }, { transaction: t });
            }

            // B. Resetear Detalles (Aquí es donde se "eliminan" las estimaciones VIEJAS de la matriz)
            await db.DetalleMatrizCosto.destroy({ where: { matrizId: matriz.id }, transaction: t });
            
            // C. Insertar Nuevos Detalles y Calcular Total
            let totalKm = 0;
            const detallesConId = perfil.detalles.map(d => {
                // FÓRMULA DEL EXCEL: (Cantidad * Costo) / Frecuencia
                // Ej: (10 Cauchos * $450) / 40.000km = $0.1125 / km
                const costoItemKm = d.frecuenciaKm === 1 
                    ? d.costoUnitario // Caso especial Vacuum (ya viene en $/km)
                    : (d.cantidad * d.costoUnitario) / d.frecuenciaKm;
                
                totalKm += costoItemKm;
                return { ...d, matrizId: matriz.id };
            });

            await db.DetalleMatrizCosto.bulkCreate(detallesConId, { transaction: t });
            
            // D. Guardar el Total calculado
            await matriz.update({ totalCostoKm: totalKm }, { transaction: t });
            
            logs.push(`${perfil.nombre}: $${totalKm.toFixed(4)}/Km`);
        }

        await t.commit();
        return NextResponse.json({ success: true, message: "Base de datos actualizada con precios reales Vzla 2026.", logs });

    } catch (error) {
        await t.rollback();
        console.error(error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}