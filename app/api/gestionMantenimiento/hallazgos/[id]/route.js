import { NextResponse } from "next/server";
import db from "@/models";

export async function PUT(request, { params }) {
    const { id } = await params;
    
    const body = await request.json();
    const t = await db.sequelize.transaction();

    try {
        const { 
            activoId,
            subsistemaId, nuevoSubsistemaNombre, categoriaSubsistemaNuevo,
            nombrePieza, cantidadSlots, impacto,
            clasificacionPiezaNueva, categoriaPiezaNueva,
            serialesNuevos, serialesFallaIndices, cantidadFallaFungible,
            esFaltante, // 🔥 CAPTURAMOS LA BANDERA
            marcaPieza, codigoPieza, modeloPieza, medidaPieza, amperajePieza,
            diametroPieza, longitudPieza, conectoresPieza
        } = body;

        const hallazgo = await db.Hallazgo.findByPk(id, { transaction: t });
        if (!hallazgo) throw new Error("El hallazgo especificado no existe");

        const activo = await db.Activo.findByPk(activoId, {
            include: [
                { model: db.VehiculoInstancia, as: 'vehiculoInstancia', include: ['plantilla'] },
                { model: db.RemolqueInstancia, as: 'remolqueInstancia', include: ['plantilla'] },
                { model: db.MaquinaInstancia, as: 'maquinaInstancia', include: ['plantilla'] }
            ],
            transaction: t
        });

        if (!activo) throw new Error("No se encontró el activo relacionado al hallazgo");

        let tipoPlantilla = null;
        let plantillaId = null;

        if (activo.vehiculoInstancia) { tipoPlantilla = 'vehiculoId'; plantillaId = activo.vehiculoInstancia.vehiculoId; }
        else if (activo.remolqueInstancia) { tipoPlantilla = 'remolqueId'; plantillaId = activo.remolqueInstancia.remolqueId; }
        else if (activo.maquinaInstancia) { tipoPlantilla = 'maquinaId'; plantillaId = activo.maquinaInstancia.maquinaId; }

        let subInstanciaIdFinal = null;
        let subPlantillaIdFinal = null;

        if (subsistemaId === 'NUEVO') {
            const [subPlantilla] = await db.Subsistema.findOrCreate({
                where: { nombre: nuevoSubsistemaNombre, [tipoPlantilla]: plantillaId },
                defaults: { categoria: categoriaSubsistemaNuevo || 'otros' },
                transaction: t
            });
            subPlantillaIdFinal = subPlantilla.id;

            const [subInstancia] = await db.SubsistemaInstancia.findOrCreate({
                where: { activoId: activo.id, subsistemaId: subPlantilla.id },
                defaults: { nombre: nuevoSubsistemaNombre },
                transaction: t
            });
            subInstanciaIdFinal = subInstancia.id;
        } else {
            subInstanciaIdFinal = subsistemaId;
            const subInstanciaExistente = await db.SubsistemaInstancia.findByPk(subsistemaId, { transaction: t });
            subPlantillaIdFinal = subInstanciaExistente.subsistemaId;
        }

        let piezasAveriadasIds = [];

        if (nombrePieza) {
            // Buscamos o creamos en el catálogo global
            const [fichaTecnica] = await db.Consumible.findOrCreate({
                where: { nombre: nombrePieza },
                defaults: {
                    tipo: clasificacionPiezaNueva.toLowerCase(),
                    categoria: categoriaPiezaNueva.toLowerCase(),
                    tipoSpecifico: categoriaPiezaNueva !== 'Repuesto General' ? categoriaPiezaNueva : 'General',
                    stockAlmacen: 0, 
                    stockAsignado: cantidadSlots || 1, 
                    stockMinimo: 0, 
                    unidadMedida: categoriaPiezaNueva === 'Aceite' ? 'litros' : 'unidades', 
                    precioPromedio: 0,
                    datosTecnicos: {
                        marca: marcaPieza || null,
                        codigo: codigoPieza || null,
                        modelo: modeloPieza || null,
                        medida: categoriaPiezaNueva === 'Neumatico' ? medidaPieza : null,
                        viscosidad: categoriaPiezaNueva === 'Aceite' ? medidaPieza : null,
                        amperaje: amperajePieza || null,
                        diametro: diametroPieza || null,
                        longitud: longitudPieza || null,
                        conectores: conectoresPieza || null
                    }
                }, transaction: t
            });

            const [recomendado] = await db.ConsumibleRecomendado.findOrCreate({
                where: { subsistemaId: subPlantillaIdFinal, consumibleId: fichaTecnica.id },
                defaults: { 
                    cantidad: cantidadSlots || 1, 
                    valorCriterio: nombrePieza,
                    categoria: categoriaPiezaNueva.toLowerCase()
                }, transaction: t
            });

            // 🔥 LÓGICA DE INSTALACIÓN ADAPTADA PARA "FALTANTES"
            if (clasificacionPiezaNueva === 'Serializado') {
                for (let i = 0; i < cantidadSlots; i++) {
                    let nuevoSerialId = null;
                    let estadoInstalacion = 'instalado';
                    let ubicacionInstalacion = 'Registrado sano al detallar';
                    let esDañado = serialesFallaIndices.includes(i);

                    if (esFaltante) {
                        estadoInstalacion = 'faltante';
                        ubicacionInstalacion = 'Pieza Faltante / Extraviada';
                        esDañado = true; // Todo faltante es falla
                    } else {
                        let serialAsignado = serialesNuevos[i] ? serialesNuevos[i].trim() : '';
                        if (!serialAsignado) serialAsignado = `S/N-${Date.now().toString().slice(-5)}-${i+1}`;

                        const nuevoSerial = await db.ConsumibleSerializado.create({
                            serial: serialAsignado,
                            consumibleId: fichaTecnica.id
                        }, { transaction: t });
                        nuevoSerialId = nuevoSerial.id;

                        if (esDañado) ubicacionInstalacion = 'Detectado dañado al detallar';
                    }

                    const nuevaInstalacion = await db.ConsumibleInstalado.create({
                        subsistemaInstanciaId: subInstanciaIdFinal,
                        recomendacionId: recomendado.id,
                        consumibleId: fichaTecnica.id,
                        estado: estadoInstalacion, 
                        ubicacion: ubicacionInstalacion,
                        serialId: nuevoSerialId
                    }, { transaction: t });

                    if (esDañado) piezasAveriadasIds.push(nuevaInstalacion.id);
                }
            } else {
                // ES FUNGIBLE
                const estadoInstalacion = esFaltante ? 'faltante' : 'instalado';
                const ubicacionInstalacion = esFaltante ? 'Pieza Faltante / Extraviada' : 'Identificado en Inspección';

                const nuevaInstalacion = await db.ConsumibleInstalado.create({
                    subsistemaInstanciaId: subInstanciaIdFinal,
                    recomendacionId: recomendado.id,
                    consumibleId: fichaTecnica.id,
                    estado: estadoInstalacion,
                    ubicacion: ubicacionInstalacion,
                    cantidad: cantidadSlots
                }, { transaction: t });

                const fallasFungibles = esFaltante ? cantidadSlots : cantidadFallaFungible;
                for(let i = 0; i < fallasFungibles; i++) {
                    piezasAveriadasIds.push(nuevaInstalacion.id);
                }
            }
        }

        if (piezasAveriadasIds.length > 0) {
            await hallazgo.update({
                subsistemaInstanciaId: subInstanciaIdFinal,
                consumibleInstaladoId: piezasAveriadasIds[0],
                impacto: impacto
            }, { transaction: t });

            for (let i = 1; i < piezasAveriadasIds.length; i++) {
                await db.Hallazgo.create({
                    descripcion: hallazgo.descripcion,
                    impacto: impacto,
                    estado: hallazgo.estado,
                    inspeccionId: hallazgo.inspeccionId,
                    subsistemaInstanciaId: subInstanciaIdFinal,
                    consumibleInstaladoId: piezasAveriadasIds[i] 
                }, { transaction: t });
            }
        } else {
            await hallazgo.update({
                subsistemaInstanciaId: subInstanciaIdFinal,
                impacto: impacto
            }, { transaction: t });
        }

        await t.commit();
        return NextResponse.json({ success: true, message: "Falla caracterizada, anatomía creada y catálogo actualizado." });

    } catch (error) {
        if (t) await t.rollback();
        console.error("Error al detallar hallazgo:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}