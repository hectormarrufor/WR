import { NextResponse } from 'next/server';
import db from '@/models';
import { Op } from 'sequelize';

export async function GET(req) {
    try {
        const currentYear = new Date().getFullYear();

        // 1. Obtener Ingresos REALES cobrados (Tabla Ingresos)
        const ingresosMensuales = await db.Ingreso.findAll({
            attributes: [
                [db.sequelize.fn('EXTRACT', db.sequelize.literal('MONTH FROM "fechaIngreso"')), 'mes'],
                [db.sequelize.fn('SUM', db.sequelize.col('montoUsd')), 'totalIngresos']
            ],
            where: {
                [Op.and]: [
                    { estado: 'Cobrado' },
                    db.sequelize.where(db.sequelize.fn('EXTRACT', db.sequelize.literal('YEAR FROM "fechaIngreso"')), currentYear)
                ]
            },
            group: [db.sequelize.fn('EXTRACT', db.sequelize.literal('MONTH FROM "fechaIngreso"'))],
            raw: true
        });

        // 2. Obtener Gastos Variables agrupados por mes
        const gastosVariablesMensuales = await db.GastoVariable.findAll({
            attributes: [
                [db.sequelize.fn('EXTRACT', db.sequelize.literal('MONTH FROM "fechaGasto"')), 'mes'],
                [db.sequelize.fn('SUM', db.sequelize.col('montoUsd')), 'totalVariables']
            ],
            where: {
                [Op.and]: [
                    { estado: 'Pagado' }, // Solo contamos lo que realmente salió del banco
                    db.sequelize.where(db.sequelize.fn('EXTRACT', db.sequelize.literal('YEAR FROM "fechaGasto"')), currentYear)
                ]
            },
            group: [db.sequelize.fn('EXTRACT', db.sequelize.literal('MONTH FROM "fechaGasto"'))],
            raw: true
        });

        // 3. Obtener Gastos Fijos (Plana mensual)
        const totalFijoMensual = await db.GastoFijo.sum('montoMensual', { where: { activo: true } }) || 0;

        // 4. Obtener Gastos Fijos Globales (Anual prorrateado a mes)
        const totalFijoGlobalAnual = await db.GastoFijoGlobal.sum('montoAnual') || 0;
        const prorrateoGlobalMensual = totalFijoGlobalAnual / 12;

        const totalGastoFijoEstatico = totalFijoMensual + prorrateoGlobalMensual;

        // 5. Construir el arreglo de 12 meses para el frontend
        const mesesNombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const dataAnual = [];

        for (let i = 1; i <= 12; i++) {
            // Buscar el ingreso del mes
            const ingresoFlete = ingresosMensuales.find(f => parseInt(f.mes) === i);
            const ingresos = ingresoFlete ? parseFloat(ingresoFlete.totalIngresos) : 0;

            // Buscar el gasto variable del mes
            const gastoVar = gastosVariablesMensuales.find(g => parseInt(g.mes) === i);
            const variables = gastoVar ? parseFloat(gastoVar.totalVariables) : 0;

            const gastosTotales = variables + totalGastoFijoEstatico;
            const balance = ingresos - gastosTotales;

            dataAnual.push({
                mes: mesesNombres[i - 1],
                Ingresos: parseFloat(ingresos.toFixed(2)),
                Gastos: parseFloat(gastosTotales.toFixed(2)),
                Balance: parseFloat(balance.toFixed(2))
            });
        }

        // Totales globales para las KPIs
        const totalIngresosAnual = dataAnual.reduce((acc, curr) => acc + curr.Ingresos, 0);
        const totalGastosAnual = dataAnual.reduce((acc, curr) => acc + curr.Gastos, 0);
        const rentabilidadBruta = totalIngresosAnual > 0
            ? ((totalIngresosAnual - totalGastosAnual) / totalIngresosAnual) * 100
            : 0;

        return NextResponse.json({
            success: true,
            data: {
                grafico: dataAnual,
                kpis: {
                    totalIngresos: totalIngresosAnual,
                    totalGastos: totalGastosAnual,
                    utilidadNeta: totalIngresosAnual - totalGastosAnual,
                    rentabilidad: rentabilidadBruta
                }
            }
        });
    } catch (error) {
        console.error("Error en API Balance:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}