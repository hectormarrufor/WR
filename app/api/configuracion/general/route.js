import { NextResponse } from 'next/server';
import db from '@/models';
import { Op } from 'sequelize';

// ==========================================
// RUTA GET (Envía datos y nómina en vivo)
// ==========================================
export async function GET() {
    const [config] = await db.ConfiguracionGlobal.findOrCreate({
        where: { id: 1 },
        include: [{ model: db.GastoFijoGlobal, as: 'gastosFijos' }]
    });

    if (!config.gastosFijos) config.gastosFijos = [];

    // Definimos los nombres de los departamentos administrativos tal cual están en tu tabla "Departamentos"
    const nombresDeptosAdmin = ['Presidencia', 'IT', 'Administracion'];

    // 1. Buscamos empleados con inclusión anidada
    const empleadosActivos = await db.Empleado.findAll({
        where: { estado: 'Activo' }, // Verifica si en tu ENUM es 'Activo' o 'Activo'
        include: [{
            model: db.Puesto,
            as: 'puestos',
            include: [{
                model: db.Departamento,
                as: 'departamento',
                attributes: ['nombre'] // Solo nos interesa el nombre para comparar
            }]
        }]
    });

    let adminSuma = 0;
    let operativaSuma = 0;

    // 2. Clasificación lógica
    empleadosActivos.forEach(emp => {
        const sueldo = parseFloat(emp.sueldo) || 0;

        // Verificamos si alguno de sus puestos pertenece a un depto administrativo
        const esAdministrativo = emp.puestos && emp.puestos.some(p =>
            p.departamento && nombresDeptosAdmin.includes(p.departamento.nombre)
        );

        if (esAdministrativo) {
            adminSuma += sueldo;
        } else {
            operativaSuma += sueldo;
        }
    });

    const configData = config.toJSON();
    configData.nominaAdministrativaTotal = adminSuma;
    configData.nominaOperativaFijaTotal = operativaSuma;

    return NextResponse.json(configData);
}
// ==========================================
// RUTA POST (Cálculos herméticos y Batch)
// ==========================================
export async function POST(req) {
    const t = await db.sequelize.transaction();
    try {
        const body = await req.json();

        // =================================================================
        // 1. EXTRACCIÓN DE NÓMINA DIRECTO DE BD (Manejo de múltiples puestos)
        // =================================================================
        const deptosAdministrativos = ['Presidencia', 'IT', 'Administracion'];

        const empleadosActivos = await db.Empleado.findAll({
            where: { estado: 'Activo' },
            include: [{
                model: db.Puesto,
                as: 'puestos',
                include: [{
                    model: db.Departamento,
                    as: 'departamento',
                    attributes: ['nombre']
                }]
            }],
            transaction: t
        });

        let adminSuma = 0;
        let operativaSuma = 0;

        empleadosActivos.forEach(emp => {
            const sueldo = parseFloat(emp.sueldo) || 0;
            const esAdministrativo = emp.puestos && emp.puestos.some(p =>
                p.departamento && ['Presidencia', 'IT', 'Administracion'].includes(p.departamento.nombre)
            );

            if (esAdministrativo) adminSuma += sueldo;
            else operativaSuma += sueldo;
        });

      // =================================================================
        // 2. CÁLCULO DE OVERHEAD (ADMINISTRATIVO) PURIFICADO
        // =================================================================

        // A. Gastos de Estructura Básica (Oficina y Gestoría)
        const oficinaMensual = parseFloat(body.gastosOficinaMensual) || 0;
        const gestoriaMensual = parseFloat(body.pagosGestoriaPermisos) || 0;

        // B. Gastos de Resguardo Mensual (Vigilancia y Monitoreo)
        const cantVigilantes = parseInt(body.cantidadVigilantes) || 0;
        const sueldoVigilante = parseFloat(body.sueldoMensualVigilante) || 0;
        const costoVigilancia = cantVigilantes * sueldoVigilante;
        const costoCCTV = parseFloat(body.costoSistemaCCTV) || 0;
        const costoSatelital = parseFloat(body.costoMonitoreoSatelital) || 0;
        const mensualResguardo = costoVigilancia + costoCCTV + costoSatelital;

     // C. Sumamos los gastos estáticos (Estructura + Resguardo + Nómina Admin + Nómina Operativa)
        // ✅ CORREGIDO: Se incluye operativaSuma según la regla de negocio
        const mensualEstatico = oficinaMensual + gestoriaMensual + mensualResguardo + adminSuma + operativaSuma;;
        const anualEstatico = mensualEstatico * 12;

        // D. Sumar los gastos dinámicos (Pólizas, RACDA, etc.)
        const gastosFijos = body.gastosFijos || [];
        const anualDinamico = gastosFijos.reduce((sum, g) => sum + (parseFloat(g.montoAnual) || 0), 0);

        // E. El Verdadero Gran Total Anual del Overhead (Gasto Fijo Puro)
        const granTotalAnual = anualEstatico + anualDinamico;

        // =================================================================
        // F. PRORRATEO GLOBAL EXACTO (Bottom-Up ABC Costing)
        // =================================================================
        
        // 1. Traemos la foto completa de la flota
        const todosLosActivos = await db.Activo.findAll({
            where: { estado: { [Op.ne]: 'Desincorporado' } },
            attributes: ['estado', 'valorReposicion', 'horasAnuales'],
            raw: true,
            transaction: t
        });

        let vTotal = 0;       // Patrimonio
        let vActivo = 0;      // Capital Operativo
        let hTotales = 0;     // Horas de trabajo
        let uTotales = 0;     // Camiones en el patio
        let uActivas = 0;     // Camiones trabajando

        todosLosActivos.forEach(a => {
            const valor = parseFloat(a.valorReposicion) || 0;
            const horas = parseInt(a.horasAnuales) || 0;

            // A. Todo lo del patio suma al patrimonio total
            vTotal += valor;
            uTotales += 1;

            // B. Si NO está inactivo, suma al capital operativo
            if (a.estado !== 'Inactivo') {
                vActivo += valor;
                hTotales += horas;
                uActivas += 1;
            }
        });

        // 2. Evitamos división por cero para el Overhead (Usamos las horas ACTIVAS)
        const nuevoCostoAdministrativoPorHora = hTotales > 0
            ? (granTotalAnual / hTotales)
            : 0;

        // =================================================================
        // 3. GUARDAR CONFIGURACIÓN Y TABLA DINÁMICA EN DB
        // =================================================================

        await db.ConfiguracionGlobal.update({
            ...body,
            nominaAdministrativaTotal: adminSuma, 
            nominaOperativaFijaTotal: operativaSuma, 
            gastosFijosAnualesTotales: granTotalAnual,
            horasTotalesFlota: hTotales,             // Protegido
            cantidadTotalUnidades: uTotales,         // Patrimonio físico
            cantidadUnidadesActivas: uActivas,       // Musculo de trabajo
            valorFlotaTotal: vTotal,                 // Patrimonio en $
            valorFlotaActiva: vActivo,               // Capital Operativo en $
            costoAdministrativoPorHora: nuevoCostoAdministrativoPorHora
        }, { where: { id: 1 }, transaction: t });


        // Limpiar y recrear gastos fijos extra
        await db.GastoFijoGlobal.destroy({ where: { configuracionId: 1 }, transaction: t });
        if (body.gastosFijos && body.gastosFijos.length > 0) {
            const nuevosGastos = body.gastosFijos.map(g => ({
                descripcion: g.descripcion,
                montoAnual: g.montoAnual,
                configuracionId: 1
            }));
            await db.GastoFijoGlobal.bulkCreate(nuevosGastos, { transaction: t });
        }

        // =================================================================
        // 4. ACTUALIZACIÓN EN LOTE DE LAS MATRICES (INSUMOS Y RANGOS)
        // =================================================================

        const prepararCostos = (min, max) => {
            const costoMin = parseFloat(min) || 0;
            const costoMax = parseFloat(max) || 0;
            return {
                costoMinimo: costoMin,
                costoMaximo: costoMax,
                costoUnitario: (costoMin + costoMax) / 2
            };
        };

        if (body.precioCauchoMin > 0 && body.precioCauchoMax > 0) {
            await db.DetalleMatrizCosto.update(
                prepararCostos(body.precioCauchoMin, body.precioCauchoMax),
                { where: { descripcion: { [Op.or]: [{ [Op.iLike]: '%Neum%' }, { [Op.iLike]: '%Cauch%' }] } }, transaction: t }
            );
        }

        if (body.precioAceiteMotorMin > 0 && body.precioAceiteMotorMax > 0) {
            await db.DetalleMatrizCosto.update(
                prepararCostos(body.precioAceiteMotorMin, body.precioAceiteMotorMax),
                { where: { descripcion: { [Op.iLike]: '%Aceite Motor%' } }, transaction: t }
            );
        }

        if (body.precioAceiteCajaMin > 0 && body.precioAceiteCajaMax > 0) {
            await db.DetalleMatrizCosto.update(
                prepararCostos(body.precioAceiteCajaMin, body.precioAceiteCajaMax),
                { where: { descripcion: { [Op.iLike]: '%Aceite Caja%' } }, transaction: t }
            );
        }

        if (body.precioBateriaMin > 0 && body.precioBateriaMax > 0) {
            await db.DetalleMatrizCosto.update(
                prepararCostos(body.precioBateriaMin, body.precioBateriaMax),
                { where: { descripcion: { [Op.iLike]: '%Bater%' } }, transaction: t }
            );
        }

        // =================================================================
        // 5. RECALCULAR LOS TOTALES DE CADA MATRIZ
        // =================================================================
        const matrices = await db.MatrizCosto.findAll({ include: ['detalles'], transaction: t });

        // 🔥 AQUÍ SE REPARÓ EL ENLACE CON LAS NUEVAS VARIABLES 🔥
        const divisorUnidades = uActivas > 0 ? uActivas : 1;
        const promedioHorasActivoMes = (hTotales / divisorUnidades) / 12;

        for (const m of matrices) {
            let nuevoTotalKm = 0;
            let nuevoTotalHora = 0;

            for (const d of m.detalles) {
                if (d.frecuencia > 0) {
                    const costoFila = d.cantidad * d.costoUnitario;
                    if (d.tipoDesgaste === 'km') {
                        nuevoTotalKm += (costoFila / d.frecuencia);
                    } else if (d.tipoDesgaste === 'horas') {
                        nuevoTotalHora += (costoFila / d.frecuencia);
                    } else if (d.tipoDesgaste === 'meses') {
                        nuevoTotalHora += (costoFila / (d.frecuencia * (promedioHorasActivoMes || 166.66)));
                    }
                }
            }
            await m.update({ totalCostoKm: nuevoTotalKm, totalCostoHora: nuevoTotalHora }, { transaction: t });
        }
        
        await t.commit();

        return NextResponse.json({
            success: true,
            overheadCalculado: nuevoCostoAdministrativoPorHora.toFixed(2),
            mensaje: "Configuración global guardada y Matrices re-calculadas exitosamente."
        });

    } catch (error) {
        await t.rollback();
        console.error(error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}