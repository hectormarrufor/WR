import { NextResponse } from 'next/server';
import sequelize from '@/sequelize';
import { Op } from "sequelize";
import { 
    Maquina, 
    Subsistema, 
    MaquinaInstancia, 
    ConsumibleRecomendado, 
    SubsistemaInstancia, 
    Activo 
} from '@/models';

export async function GET(request, { params }) {
    const { id } = await params;
    try {
        const maquina = await Maquina.findByPk(id, {
            include: [{
                model: Subsistema,
                as: 'subsistemas',
                include: [{ model: ConsumibleRecomendado, as: 'listaRecomendada' }]
            }]
        });
        if (!maquina) return NextResponse.json({ success: false, error: 'Máquina no encontrada' }, { status: 404 });
        return NextResponse.json({ success: true, data: maquina });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function PUT(request, { params }) {
    const { id } = await params;
    const t = await sequelize.transaction();
    try {
        const body = await request.json();
        const { propagar = false } = body;

        const maquina = await Maquina.findByPk(id);
        if (!maquina) throw new Error('Plantilla no encontrada');

        // Actualizar campos base (Nota: mapeo tipoMaquina -> tipo)
        await maquina.update({
            marca: body.marca,
            modelo: body.modelo,
            anio: body.anio,
            peso: body.peso,
            capacidadLevante: body.capacidadLevante,
            capacidadCucharon: body.capacidadCucharon,
            alcanceMaximo: body.alcanceMaximo,
            traccion: body.traccion,
            capacidadTanqueEstandar: body.capacidadTanque,
            tipo: body.tipoMaquina, 
            potencia: body.potenciaMotor
        }, { transaction: t });

        if (body.subsistemas) {
            const subsBD = await Subsistema.findAll({ where: { maquinaId: id }, transaction: t });
            const idsBD = subsBD.map(s => s.id);
            const idsPayload = body.subsistemas.filter(s => s.id).map(s => s.id);

            // Borrar
            const paraBorrar = idsBD.filter(id => !idsPayload.includes(id));
            if (paraBorrar.length > 0) {
                if (propagar) await SubsistemaInstancia.destroy({ where: { subsistemaId: paraBorrar }, transaction: t });
                await Subsistema.destroy({ where: { id: paraBorrar }, transaction: t });
            }

            const activos = propagar ? await Activo.findAll({
                include: [{ model: MaquinaInstancia, as: 'maquinaInstancia', where: { maquinaId: id }, required: true }],
                transaction: t
            }) : [];

            for (const subData of body.subsistemas) {
                let currentSub;
                if (subData.id) {
                    currentSub = await Subsistema.findByPk(subData.id, { transaction: t });
                    await currentSub.update({ nombre: subData.nombre, categoria: subData.categoria }, { transaction: t });
                } else {
                    currentSub = await Subsistema.create({ ...subData, maquinaId: id }, { transaction: t });
                    if (propagar) {
                        const instances = activos.map(a => ({
                            nombre: `${subData.nombre} ${a.maquinaInstancia?.serialChasis || ''}`,
                            activoId: a.id,
                            subsistemaId: currentSub.id,
                            estado: 'ok',
                            capacidadTanqueEstandar: subData.capacidadTanqueEstandar || null,
                            observaciones: 'Añadido por actualización de modelo'
                            
                        }));
                        await SubsistemaInstancia.bulkCreate(instances, { transaction: t });
                    }
                }

                // Recomendaciones (Nietos)
                await ConsumibleRecomendado.destroy({ where: { subsistemaId: currentSub.id }, transaction: t });
                if (subData.recomendaciones?.length > 0) {
                    const recs = subData.recomendaciones.map(r => ({
                        subsistemaId: currentSub.id,
                        label: r.label,
                        categoria: r.categoria,
                        cantidad: r.cantidad,
                        tipoCriterio: r.tipoCriterio,
                        grupoEquivalenciaId: r.tipoCriterio === 'grupo' ? r.criterioId : null,
                        valorCriterio: r.tipoCriterio === 'tecnico' ? r.criterioId : null,
                        consumibleId: r.tipoCriterio === 'individual' ? r.criterioId : null
                    }));
                    await ConsumibleRecomendado.bulkCreate(recs, { transaction: t });
                }
            }
        }

        await t.commit();
        return NextResponse.json({ success: true });
    } catch (error) {
        await t.rollback();
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}