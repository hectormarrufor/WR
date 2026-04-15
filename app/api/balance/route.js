import { NextResponse } from 'next/server';
import db from '@/models';
import { Op } from 'sequelize';

export async function GET(req) {
    try {
        const currentYear = new Date().getFullYear();

        // 1. Ingresos REALES (Desglosados)
        const ingresosMensuales = await db.Ingreso.findAll({
            attributes: [
                [db.sequelize.fn('EXTRACT', db.sequelize.literal('MONTH FROM "fechaIngreso"')), 'mes'],
                [db.sequelize.fn('SUM', db.sequelize.col('montoBaseUsd')), 'totalBase'],
                [db.sequelize.fn('SUM', db.sequelize.col('montoNetoUsd')), 'totalRecibido'],
                [db.sequelize.fn('SUM', db.sequelize.col('impuestoMunicipalProvisionUsd')), 'totalMunicipal']
            ],
            where: {
                estado: 'Cobrado',
                [Op.and]: [db.sequelize.where(db.sequelize.fn('EXTRACT', db.sequelize.literal('YEAR FROM "fechaIngreso"')), currentYear)]
            },
            group: [db.sequelize.fn('EXTRACT', db.sequelize.literal('MONTH FROM "fechaIngreso"'))],
            raw: true
        });

        // 2. Gastos REALES
        const gastosMensuales = await db.GastoVariable.findAll({
            attributes: [
                [db.sequelize.fn('EXTRACT', db.sequelize.literal('MONTH FROM "fechaGasto"')), 'mes'],
                [db.sequelize.fn('SUM', db.sequelize.col('montoBaseUsd')), 'totalBase'],
                [db.sequelize.fn('SUM', db.sequelize.col('montoPagadoUsd')), 'totalPagado']
            ],
            where: {
                estado: 'Pagado',
                [Op.and]: [db.sequelize.where(db.sequelize.fn('EXTRACT', db.sequelize.literal('YEAR FROM "fechaGasto"')), currentYear)]
            },
            group: [db.sequelize.fn('EXTRACT', db.sequelize.literal('MONTH FROM "fechaGasto"'))],
            raw: true
        });

        const mesesNombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const dataAnual = [];
        let acumuladoKPI = {
            ingresosBrutos: 0,
            egresosBrutos: 0,
            impuestosMunicipales: 0,
            disponibilidadCaja: 0
        };

        for (let i = 1; i <= 12; i++) {
            const ingMes = ingresosMensuales.find(f => parseInt(f.mes) === i) || { totalBase: 0, totalRecibido: 0, totalMunicipal: 0 };
            const gasMes = gastosMensuales.find(g => parseInt(g.mes) === i) || { totalBase: 0, totalPagado: 0 };

            // La utilidad operativa real para Dadica es: 
            // Lo facturado (Base) - Lo gastado (Base) - Lo que le debo a la alcaldía
            const ingresosBase = parseFloat(ingMes.totalBase);
            const gastosBase = parseFloat(gasMes.totalBase);
            const municipal = parseFloat(ingMes.totalMunicipal);
            const balanceNeto = ingresosBase - gastosBase - municipal;

            acumuladoKPI.ingresosBrutos += ingresosBase;
            acumuladoKPI.egresosBrutos += gastosBase;
            acumuladoKPI.impuestosMunicipales += municipal;
            acumuladoKPI.disponibilidadCaja += (parseFloat(ingMes.totalRecibido) - parseFloat(gasMes.totalPagado));

            dataAnual.push({
                mes: mesesNombres[i - 1],
                Ingresos: parseFloat(ingresosBase.toFixed(2)),
                Gastos: parseFloat(gastosBase.toFixed(2)),
                Balance: parseFloat(balanceNeto.toFixed(2))
            });
        }

        const utilidadNetaFinal = acumuladoKPI.ingresosBrutos - acumuladoKPI.egresosBrutos - acumuladoKPI.impuestosMunicipales;

        return NextResponse.json({
            success: true,
            data: {
                grafico: dataAnual,
                kpis: {
                    totalIngresos: acumuladoKPI.ingresosBrutos,
                    totalGastos: acumuladoKPI.egresosBrutos,
                    utilidadNeta: utilidadNetaFinal,
                    rentabilidad: acumuladoKPI.ingresosBrutos > 0 ? (utilidadNetaFinal / acumuladoKPI.ingresosBrutos) * 100 : 0,
                    provisionMunicipal: acumuladoKPI.impuestosMunicipales,
                    cajaReal: acumuladoKPI.disponibilidadCaja // Dinero físico en cuentas
                }
            }
        });
    } catch (error) {
        console.error("Error en API Balance:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}