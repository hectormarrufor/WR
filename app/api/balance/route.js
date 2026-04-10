import { NextResponse } from 'next/server';
import db from '@/models';
import { Op } from 'sequelize';

export async function GET(req) {
    try {
        const currentYear = new Date().getFullYear();

        // 1. Ingresos REALES (Cobrados)
        const ingresosMensuales = await db.Ingreso.findAll({
            attributes: [
                [db.sequelize.fn('EXTRACT', db.sequelize.literal('MONTH FROM "fechaIngreso"')), 'mes'],
                [db.sequelize.fn('SUM', db.sequelize.col('montoUsd')), 'totalIngresos']
            ],
            where: {
                estado: 'Cobrado',
                [Op.and]: [db.sequelize.where(db.sequelize.fn('EXTRACT', db.sequelize.literal('YEAR FROM "fechaIngreso"')), currentYear)]
            },
            group: [db.sequelize.fn('EXTRACT', db.sequelize.literal('MONTH FROM "fechaIngreso"'))],
            raw: true
        });

        // 2. Gastos REALES (Pagados) -> Aquí ya va a estar el pago del RACDA si lo registraste
        const gastosMensuales = await db.GastoVariable.findAll({
            attributes: [
                [db.sequelize.fn('EXTRACT', db.sequelize.literal('MONTH FROM "fechaGasto"')), 'mes'],
                [db.sequelize.fn('SUM', db.sequelize.col('montoUsd')), 'totalGastos']
            ],
            where: {
                estado: 'Pagado',
                [Op.and]: [db.sequelize.where(db.sequelize.fn('EXTRACT', db.sequelize.literal('YEAR FROM "fechaGasto"')), currentYear)]
            },
            group: [db.sequelize.fn('EXTRACT', db.sequelize.literal('MONTH FROM "fechaGasto"'))],
            raw: true
        });

        // 3. Construir el arreglo de 12 meses
        const mesesNombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const dataAnual = [];
        let totalIngresosAnual = 0;
        let totalGastosAnual = 0;

        for (let i = 1; i <= 12; i++) {
            const ingresoMes = ingresosMensuales.find(f => parseInt(f.mes) === i);
            const ingresos = ingresoMes ? parseFloat(ingresoMes.totalIngresos) : 0;

            const gastoMes = gastosMensuales.find(g => parseInt(g.mes) === i);
            const gastos = gastoMes ? parseFloat(gastoMes.totalGastos) : 0;

            const balance = ingresos - gastos;

            totalIngresosAnual += ingresos;
            totalGastosAnual += gastos;

            dataAnual.push({
                mes: mesesNombres[i - 1],
                Ingresos: parseFloat(ingresos.toFixed(2)),
                Gastos: parseFloat(gastos.toFixed(2)),
                Balance: parseFloat(balance.toFixed(2))
            });
        }

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