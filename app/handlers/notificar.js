import { 
    PushSubscription, Notificacion, Usuario, Empleado, sequelize 
} from '@/models'; 
import webpush from 'web-push';
import { Op } from 'sequelize';

/**
 * @param {Object} data 
 * data.departamentos: Array de strings opcional ['Mantenimiento', 'Logistica']
 * data.puestos: Array de strings opcional ['Chofer', 'Gerente']
 */
export async function crearYNotificar(data) {
    const t = await sequelize.transaction();

    try {
        const fechaCaracas = new Date().toLocaleString('es-VE', { 
            timeZone: 'America/Caracas',
            day: '2-digit', month: '2-digit', year: 'numeric', 
            hour: '2-digit', minute: '2-digit', hour12: true 
        });

        // 1. Normalizar entradas a Arrays o Null
        const targetDeptos = Array.isArray(data.departamentos) && data.departamentos.length > 0 ? data.departamentos : null;
        const targetPuestos = Array.isArray(data.puestos) && data.puestos.length > 0 ? data.puestos : null;

        // 2. GUARDAR EN BD COMO JSON
        const nuevaNotificacion = await Notificacion.create({
            titulo: data.title,
            mensaje: data.body,
            url: data.url,
            departamentoObjetivo: targetDeptos, // Se guarda ["Mantenimiento", "RRHH"]
            puestoObjetivo: targetPuestos,      // Se guarda ["Chofer"]
            tipo: data.tipo || 'Info',
            fechaHoraCaracas: fechaCaracas
        }, { transaction: t });

        await t.commit();

        // 3. BUSCAR USUARIOS DESTINATARIOS
        // Lógica: (Usuario está en Dept A o B) O (Usuario tiene Puesto X o Y)
        let whereUsers = {}; 
        let esGlobal = !targetDeptos && !targetPuestos;

        if (!esGlobal) {
            const condiciones = [];
            
            if (targetDeptos) {
                condiciones.push({ '$empleado.departamento$': { [Op.in]: targetDeptos } });
            }
            if (targetPuestos) {
                condiciones.push({ '$empleado.puesto$': { [Op.in]: targetPuestos } });
            }

            // Usamos OR: Si cumple DEPARTAMENTO -O- cumple PUESTO, recibe la notificacion
            whereUsers = {
                [Op.or]: condiciones
            };
        }

        let subscripciones = [];

        if (esGlobal) {
            subscripciones = await PushSubscription.findAll({ where: { activo: true } });
        } else {
            // Buscamos usuarios que cumplan el criterio
            const usuariosTarget = await Usuario.findAll({
                include: [{
                    model: Empleado,
                    as: 'empleado',
                    where: whereUsers // Aquí aplicamos el filtro complejo
                }]
            });
            
            const idsUsuarios = usuariosTarget.map(u => u.id);

            if (idsUsuarios.length > 0) {
                subscripciones = await PushSubscription.findAll({
                    where: { 
                        activo: true,
                        usuarioId: { [Op.in]: idsUsuarios }
                    }
                });
            }
        }

        console.log(`[NOTIFICADOR] Enviando a ${subscripciones.length} dispositivos.`);

        // 4. ENVIAR PUSH
        const promesasEnvio = subscripciones.map(async (sub) => {
            try {
                const payloadPush = JSON.stringify({
                    title: data.title,
                    body: data.body,
                    url: data.url,
                    icon: "/icons/icon-192x192.png",
                    badge: "/icons/android-launchericon-96-96.png",
                    tag: `notif-${nuevaNotificacion.id}`,
                    data: { timestamp: fechaCaracas }
                });
                await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payloadPush);
            } catch (err) {
                 if (err.statusCode === 410 || err.statusCode === 404) await sub.destroy();
            }
        });

        await Promise.all(promesasEnvio);
        return nuevaNotificacion;

    } catch (error) {
        if (t && !t.finished) await t.rollback();
        console.error("Error notificador:", error);
    }
}