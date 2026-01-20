import webpush from 'web-push';
import {
    PushSubscription, Notificacion, User, Empleado, sequelize,
    Puesto,
    Departamento
} from '@/models'; // Ajusta tus imports según tu estructura
import { Op } from 'sequelize';

// 1. CONFIGURACIÓN VAPID (Se mantiene igual)
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.error('Faltan las claves VAPID en las variables de entorno.');
} else {
    webpush.setVapidDetails(
        'mailto:hectormmarrufor@gmail.com',
        VAPID_PUBLIC_KEY,
        VAPID_PRIVATE_KEY
    );
}

// =====================================================================
// 2. LA FUNCIÓN MAESTRA (El Motor)
// Se encarga de: Guardar en BD, Filtrar destinatarios y Enviar Push
// =====================================================================
export async function crearYNotificar(data) {
    const t = await sequelize.transaction();
    const resultados = { exitosos: 0, fallidos: 0 };

    try {
        // A. Preparar datos
        const fechaCaracas = new Date().toLocaleString('es-VE', {
            timeZone: 'America/Caracas',
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: true
        });

        // Normalizamos arrays para BD
        const targetDeptos = Array.isArray(data.departamentos) && data.departamentos.length > 0 ? data.departamentos : null;
        const targetPuestos = Array.isArray(data.puestos) && data.puestos.length > 0 ? data.puestos : null;

        // B. Guardar HISTORIAL en Base de Datos
        const nuevaNotificacion = await Notificacion.create({
            titulo: data.title,
            mensaje: data.body,
            url: data.url,
            departamentoObjetivo: targetDeptos,
            puestoObjetivo: targetPuestos,
            // Nota: Podrías agregar un campo 'rolesObjetivo' a tu modelo si quieres guardar que fue para Admins
            tipo: data.tipo || 'Info',
            fechaHoraCaracas: fechaCaracas
        }, { transaction: t });

        await t.commit();

        // C. LÓGICA DE FILTRADO DE SUSCRIPCIONES
        let whereSubscriptions = { activo: true };

        // C1. Filtro por ROL (Admin, Presidente) - Lógica de tu código original
        if (data.roles && data.roles.length > 0) {
            whereSubscriptions.rol = { [Op.in]: data.roles };
        }

        // C2. Filtro por USUARIO ESPECÍFICO
        else if (data.usuarioId) {
            whereSubscriptions.usuarioId = data.usuarioId;
        }

        // C3. Filtro por DEPARTAMENTO / PUESTO (Lógica nueva)
        else if (targetDeptos || targetPuestos) {
            const condicionesEmpleado = [];
            if (targetDeptos) condicionesEmpleado.push({ departamento: { [Op.in]: targetDeptos } });
            if (targetPuestos) condicionesEmpleado.push({ puesto: { [Op.in]: targetPuestos } });

            // Buscamos usuarios que cumplan Depto O Puesto
            const usuariosTarget = await User.findAll({
                attributes: ['id'], // Solo necesitamos el ID para el Push
                include: [{
                    model: Empleado,
                    as: 'empleado',
                    required: true,
                    include: [{
                        model: Puesto,
                        as: 'puestos', // Relación muchos a muchos o uno a muchos
                        required: true,
                        include: [{
                            model: Departamento,
                            as: 'departamento',
                            required: false // Solo si vamos a filtrar por depto
                        }]
                    }]
                }],
                where: {
                    [Op.or]: [
                        // Filtro por nombre de Puesto
                        targetPuestos ? { '$empleado.puestos.nombre$': { [Op.in]: targetPuestos } } : null,

                        // Filtro por nombre de Departamento
                        targetDeptos ? { '$empleado.puestos.departamento.nombre$': { [Op.in]: targetDeptos } } : null
                    ].filter(Boolean)
                }
            });

            const idsUsuarios = usuariosTarget.map(u => u.id);

            // Si no hay usuarios, detenemos para no enviar a nadie
            if (idsUsuarios.length === 0) {
                console.log('[NOTIFICADOR] No se encontraron empleados con ese perfil.');
                return nuevaNotificacion;
            }

            whereSubscriptions.usuarioId = { [Op.in]: idsUsuarios };
        }

        // Si no entra en ninguno (roles, usuarioId, depto, puesto), es GLOBAL (Todos)
        // whereSubscriptions se queda solo con { activo: true }

        // D. BUSCAR SUSCRIPCIONES
        const subscripciones = await PushSubscription.findAll({ where: whereSubscriptions });

        console.log(`\x1b[42m [INFO]: Enviando a ${subscripciones.length} dispositivos. \x1b[0m`);

        // E. ENVÍO MASIVO
        const promesas = subscripciones.map(async (sub) => {
            try {
                const payloadPush = JSON.stringify({
                    title: data.title,
                    body: data.body,
                    url: data.url,
                    icon: "/icons/icon-192x192.png",
                    badge: "/icons/android-launchericon-96-96.png",
                    tag: `notif-${nuevaNotificacion.id}`, // Agrupamiento
                    data: { timestamp: fechaCaracas }
                });

                await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payloadPush);
                resultados.exitosos++;
            } catch (err) {
                resultados.fallidos++;
                // Borrar suscripción si ya no existe (410 Gone o 404)
                if (err.statusCode === 410 || err.statusCode === 404) {
                    await sub.destroy();
                } else {
                    console.error(`Error push usuario ${sub.usuarioId}:`, err.message);
                }
            }
        });

        await Promise.all(promesas);
        return nuevaNotificacion;

    } catch (error) {
        if (t && !t.finished) await t.rollback();
        console.error("Error crítico notificando:", error);
        throw error;
    }
}


// =====================================================================
// 3. WRAPPERS CON "TRUCO" (Mapeo Manual)
// =====================================================================

export async function notificarAdmins(payload) {
    // EL ARTILUGIO:
    // En lugar de decir "busca por rol admin", le decimos:
    // "Notifica a los puestos que SABEMOS que son admins".

    // Esto guardará en BD: puestoObjetivo: ["Desarrollador Web", "Gerente de IT"]
    // Y enviará push a todos los empleados con esos puestos.
    return crearYNotificar({
        ...payload,
        departamentos: ['IT', 'Presidencia'] // Agrega aquí los departamentos clave
    });
}

export async function notificarPresidente(payload) {
    return crearYNotificar({
        ...payload,
        departamentos: ['Presidencia'] // Mapeo directo 1 a 1
    });
}

export async function notificarUsuario(usuarioId, payload) {
    // Aquí es distinto, porque es a UNA persona específica.
    // La función maestra ya sabe manejar 'usuarioId' prioritariamente.
    return crearYNotificar({
        ...payload,
        usuarioId: usuarioId
    });
}


export async function notificarTodos(payload) {
    return crearYNotificar({
        ...payload
        // Al no pasar filtros, se va a todos (Filtro Default)
    });
}

// Nueva función extra para tus necesidades de Depto/Puesto
export async function notificarGrupo(payload, departamentos, puestos) {
    return crearYNotificar({
        ...payload,
        departamentos,
        puestos
    });
}

export async function notificarOperaciones(payload) {
    return crearYNotificar({
        ...payload,
        departamentos: ['Operaciones']
    });
}
export async function notificarAdministracion(payload) {
    return crearYNotificar({
        ...payload,
        departamentos: ['Administracion']
    });
}

export async function notificarCabezas(payload) {
    return crearYNotificar({
        ...payload,
        puestos: ['Presidente', 'Desarrollador Web', 'Administradora', "Gerente Operacional"]
    });
}