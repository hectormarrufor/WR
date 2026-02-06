"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import {
  Container, Title, Text, Group, Loader,
  Box, Button, Paper, HoverCard, Badge, Stack, Divider, ThemeIcon,
  Card, ScrollArea, Avatar, UnstyledButton, ActionIcon, Tooltip,
  Popover
} from "@mantine/core";
import {
  IconChevronLeft, IconChevronRight, IconSteeringWheel,
  IconClipboardText, IconCalendarEvent, IconTruck, IconTool,
  IconUsers, IconArrowLeft, IconMapPin, IconClock
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import esLocale from "@fullcalendar/core/locales/es";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// Asegúrate de que estas rutas existan o ajustalas a tu proyecto
import ManualHoursButton from "./ManualHoursButton";
import { toLocalDate } from "@/app/helpers/fechaCaracas";
import { formatDateLong } from "@/app/helpers/dateUtils";

// Si tienes el CSS custom, impórtalo aquí. Si no, el diseño se verá un poco más simple pero funcional.
// import "./fullcalendar-custom.css"; 

// --- COLORES CORPORATIVOS ---
const COLORS = {
  petrol: '#1e293b',      // Slate 800 - Elegante para transporte
  yellow: '#f59f00',      // Mantine Yellow 9 - Seguridad industrial
  gray: '#f8f9fa',
  accentBlue: '#1c7ed6',  // Mantine Blue 7 - ODTs estándar
  accentOrange: '#d9480f',// Mantine Orange 9 - Maquinaria pesada
  accentTeal: '#304363',  // Mantine Teal 9 - Trabajo en Base (Verde profundo, no chillón)
};

// ==========================================
// 1. HELPERS VISUALES Y LÓGICOS
// ==========================================

// Helper para agrupar registros por Hora + Observación
const agruparRegistros = (registros) => {
  const grupos = {};
  if (!registros) return [];

  registros.forEach((reg) => {
    const obs = (reg.observaciones || "Sin observaciones").trim();
    const key = `${reg.horas}-${obs}`;

    if (!grupos[key]) {
      grupos[key] = {
        key,
        horas: reg.horas,
        observaciones: obs,
        empleados: []
      };
    }
    grupos[key].empleados.push(reg.Empleado);
  });

  return Object.values(grupos);
};

// Helper visual para Vehículos en miniatura
function VehiculoLine({ activo }) {
  if (!activo) return null;
  const instancia = activo.vehiculoInstancia || activo.remolqueInstancia || activo.maquinariaInstancia;
  const modelo = instancia?.plantilla?.modelo || 'Genérico';
  const placa = instancia?.placa || instancia?.serialVin || activo.codigoInterno || 'S/P';

  return (
    <Group gap={6} wrap="nowrap" style={{ opacity: 0.9 }}>
      <ThemeIcon variant="transparent" color="white" size={14}>
        <IconSteeringWheel size={12} />
      </ThemeIcon>
      <Text size="10px" c="white" truncate fw={600}>
        {placa} <Text span fw={400} style={{ opacity: 0.7 }}>• {modelo}</Text>
      </Text>
    </Group>
  );
}

// Helper visual para Vehículos en móvil
function VehiculoLineMobile({ activo, icon, color = "gray" }) {
  if (!activo) return null;
  const instancia = activo.vehiculoInstancia || activo.remolqueInstancia || activo.maquinariaInstancia;
  const modelo = instancia?.plantilla?.modelo || "Genérico";
  const placa = instancia?.placa || instancia?.serialVin || activo.codigoInterno;

  return (
    <Paper withBorder p={6} radius="sm" bg="gray.0">
      <Group gap="xs" wrap="nowrap">
        <ThemeIcon variant="light" color={color} size="md" radius="md">
          {icon || <IconTruck size={16} />}
        </ThemeIcon>
        <Box style={{ lineHeight: 1.1 }}>
          <Text size="sm" fw={700} c="dark.5">{placa}</Text>
          <Text size="xs" c="dimmed">{modelo}</Text>
        </Box>
      </Group>
    </Paper>
  );
}

// Avatar con nombre (Reutilizable)
// Avatar con nombre y HORAS DE BASE
const PersonalAvatar = ({ empleado, rol, router, entrada, salida }) => {
  if (!empleado) return null;
  return (
    <UnstyledButton onClick={() => router.push(`/superuser/rrhh/empleados/${empleado.id}`)} style={{ width: '100%' }}>
      <Group wrap="nowrap" align="flex-start">
        <Avatar
          src={empleado?.imagen ? `${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/${empleado.imagen}` : null}
          size={38} // Un poco más grande para que quepan las 3 líneas de texto
          radius="xl"
          color="blue"
        >
          {empleado.nombre?.charAt(0)}
        </Avatar>
        <Box>
          <Text size="sm" fw={700} lh={1.1}>{empleado.nombre} {empleado.apellido}</Text>
          <Text size="xs" c="dimmed" fw={500}>{rol}</Text>
          {/* MOSTRAR HORAS DE BASE */}
          <Group gap={4} mt={2}>
            <IconClock size={10} color="var(--mantine-color-blue-6)" />
            <Text size="10px" fw={700} c="blue.7">
              Base: {entrada} - {salida}
            </Text>
          </Group>
        </Box>
      </Group>
    </UnstyledButton>
  )
}
// Item de vehículo en Popover
const VehiculoItem = ({ activo }) => {
  const instancia = activo.vehiculoInstancia || activo.remolqueInstancia || activo.maquinariaInstancia;
  if (!instancia) return null;
  return (
    <Group gap="xs" wrap="nowrap">
      <ThemeIcon size="xs" color="gray" variant="transparent"><IconSteeringWheel /></ThemeIcon>
      <Text size="xs" fw={600}>{instancia.placa} <Text span c="dimmed" fw={400}>{instancia.plantilla?.modelo}</Text></Text>
    </Group>
  )
}

const summaryCache = {};   // Guarda el texto del resumen por ID
const fetchStatus = {};    // Guarda si ya se está pidiendo ('loading', 'done')
// ==========================================
// 2. COMPONENTE EVENT MINIATURE (TARJETA CALENDARIO + HOVER)
// ==========================================
const EventMiniature = ({ event, router }) => {
  const props = event.extendedProps;
  const isODT = event.id.startsWith('odt');
  const isManualGroup = event.id.startsWith('group-manual');
  // Usamos el ID del evento como clave única
  const eventId = event.id;

  // Estado para el resumen IA
  const [resumenAI, setResumenAI] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);

  useEffect(() => {
    // LOG DE DEPURACIÓN (Míralo en la consola del navegador)
    console.log(`[${eventId}] Efecto disparado.`, {
      cache: summaryCache[eventId],
      status: fetchStatus[eventId]
    });

    // 1. CONDICIONES DE SALIDA
    if (!isManualGroup) return;

    // Si ya tengo datos en caché, los uso y no hago nada más.
    if (summaryCache[eventId]) {
      console.log(`[${eventId}] Usando caché.`);
      setResumenAI(summaryCache[eventId]);
      return;
    }

    // CORRECCIÓN: Solo bloqueamos si está activamente cargando ('loading').
    // Quitamos el bloqueo de 'done' por si acaso hubo un error previo o recarga.
    if (fetchStatus[eventId] === 'loading') {
      console.log(`[${eventId}] Ya está cargando, omitiendo.`);
      return;
    }

    // 2. INICIAR PROCESO
    console.log(`[${eventId}] Iniciando FETCH...`);
    fetchStatus[eventId] = 'loading';
    setLoadingAI(true);

    const fechaEvento = new Date(event.start);
    fechaEvento.setHours(0, 0, 0, 0);

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const diaSemana = hoy.getDay();
    const diasDesdeViernes = (diaSemana + 2) % 7;
    const viernesInicioSemana = new Date(hoy);
    viernesInicioSemana.setDate(hoy.getDate() - diasDesdeViernes);
    viernesInicioSemana.setHours(0, 0, 0, 0);

    const esFechaReciente = fechaEvento >= viernesInicioSemana && fechaEvento <= hoy;

    // Si es histórico, delay 0 para que sea instantáneo
    const delay = esFechaReciente ? Math.floor(Math.random() * 1000) + 500 : 0;

    const timeoutId = setTimeout(() => {
      fetch(`/api/ai/generar-resumen?t=${Date.now()}`, {
        method: 'POST',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          // Esto le grita al navegador: "¡No uses caché, ve al servidor!"
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        body: JSON.stringify({
          observaciones: props.registros.map(r => r.observaciones).filter(o => o?.length > 3),
          fecha: event.start,
          permitirGeneracion: esFechaReciente
        })
      })
        .then(res => {
          if (res.status === 429) throw new Error("Busy");
          return res.json();
        })
        .then(data => {
          const textoFinal = data.resumen || "Histórico sin resumen.";

          console.log(`[${eventId}] Fetch completado:`, textoFinal);

          summaryCache[eventId] = textoFinal;
          fetchStatus[eventId] = 'done';
          setResumenAI(textoFinal);
        })
        .catch(err => {
          console.error(`[${eventId}] Error:`, err);
          // IMPORTANTE: Reseteamos status a null para permitir reintentos si falló la red
          fetchStatus[eventId] = null;

          if (err.message === "Busy") setResumenAI("IA saturada.");
          else setResumenAI("Ver detalles.");
        })
        .finally(() => setLoadingAI(false));
    }, delay);

    return () => clearTimeout(timeoutId);

  }, [eventId, isManualGroup]); // Dependencias correctas

  // --- DEFINICIÓN DEL HOVER CONTENT (EL DETALLE GRANDE AL PASAR MOUSE) ---
  const HoverContent = () => {
    const subGrupos = !isODT ? agruparRegistros(props.registros) : [];

    return (
      <Stack gap="md" p="md" w={{ base: 320, sm: 500 }}>
        {/* Cabecera del Popover */}
        <Group justify="space-between" align="start">
          <Box>
            <Badge
              size="lg"
              variant="filled"
              color={isODT ? (props.maquinariaId ? 'orange' : 'blue') : 'teal'}
              radius="sm"
            >
              {isODT ? `ODT #${props.nroODT}` : 'REGISTRO INTERNO'}
            </Badge>
            {isODT && <Text fw={800} size="md" mt={4} lh={1.2} c="dark.8">{props.cliente?.nombre}</Text>}
          </Box>
          <ThemeIcon size="lg" variant="light" color="gray">
            {isODT ? <IconMapPin size={18} /> : <IconClipboardText size={18} />}
          </ThemeIcon>
        </Group>

        <Divider color="gray.2" />

        {isODT ? (
          // --- CASO ODT ---
          <>
            <Text size="sm" c="dimmed" lh={1.4}>{props.descripcionServicio}</Text>

            <Box bg="gray.0" p="xs" style={{ borderRadius: 8 }}>
              <Badge variant="dot" color="gray" size="sm">
                Labor en sitio: {props.horaLlegada.substring(0, 5)} - {props.horaSalida.substring(0, 5)}
              </Badge>
              <Text size="10px" tt="uppercase" fw={800} c="dimmed" mb={4}>Flota Asignada</Text>
              <Stack gap={6}>
                {props.vehiculoPrincipal && <VehiculoItem activo={props.vehiculoPrincipal} />}
                {props.vehiculoRemolque && <VehiculoItem activo={props.vehiculoRemolque} />}
                {props.maquinaria && <VehiculoItem activo={props.maquinaria} />}
              </Stack>
            </Box>

            <Box>
              <Text size="10px" tt="uppercase" fw={800} c="dimmed" mb={4}>Personal</Text>
              <Group gap="sm">
                <PersonalAvatar
                  empleado={props.chofer}
                  rol="Operador"
                  router={router}
                  // Lógica: Si no hay base, usa labor
                  entrada={props.choferEntradaBase || props.horaLlegada.substring(0, 5)}
                  salida={props.choferSalidaBase || props.horaSalida.substring(0, 5)}
                />
                <PersonalAvatar
                  empleado={props.ayudante}
                  rol="Ayudante"
                  router={router}
                  entrada={props.ayudanteEntradaBase || props.horaLlegada.substring(0, 5)}
                  salida={props.ayudanteSalidaBase || props.horaSalida.substring(0, 5)}
                />
              </Group>
            </Box>
          </>
        ) : (
          // --- CASO MANUAL (Con Stack de Avatares Grande) ---
          <>
            <Group justify="space-between">
              <Text fw={700} size="md" c="dark.8">Personal en Planta</Text>
              <Badge variant="outline" color="teal" size="lg">{props.total} Personas</Badge>
            </Group>

            <ScrollArea.Autosize mah={400}>
              <Stack gap="md">
                {subGrupos.map((grupo, idx) => (
                  <Paper key={idx} withBorder p="md" radius="md" bg="white" shadow="xs">
                    <Group align="flex-start" wrap="nowrap" mb="xs">
                      {/* 1. Stack de Avatares */}
                      <Avatar.Group spacing="sm" mr={10}>
                        {grupo.empleados.map(emp => (
                          <Tooltip key={emp.id} label={`${emp.nombre} ${emp.apellido}`} withArrow>
                            <Avatar
                              src={emp.imagen ? `${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/${emp.imagen}` : null}
                              radius="xl"
                              size={50}
                              style={{ border: '2px solid white', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', cursor: 'pointer' }}
                              color="blue"
                              onClick={() => router.push(`/superuser/rrhh/empleados/${emp.id}`)}
                            >
                              {emp.nombre?.charAt(0)}
                            </Avatar>
                          </Tooltip>
                        ))}
                      </Avatar.Group>

                      {/* 2. Lista de Nombres al lado */}
                      <Box style={{ flex: 1 }}>
                        <Text size="sm" fw={700} c="dark.8" lh={1.3}>
                          {grupo.empleados.map(e => e.nombre).join(', ')}
                        </Text>
                        <Badge size="sm" color="dark" variant="light" mt={4}>{grupo.horas} Horas</Badge>
                      </Box>
                    </Group>

                    {/* 3. Observación Completa debajo */}
                    <Text size="sm" c="dimmed" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                      {grupo.observaciones}
                    </Text>
                  </Paper>
                ))}
              </Stack>
            </ScrollArea.Autosize>
          </>
        )}
      </Stack>
    );
  };


  // --- RENDER VISUAL DE LA TARJETA EN EL CALENDARIO ---
  return (
    <HoverCard width="auto" shadow="xl" withArrow openDelay={200} position="right-start" radius="md">
      <HoverCard.Target>
        {/* Wrapper div para asegurar eventos de mouse */}
        <div style={{ width: '100%', height: '100%' }}>
          <Box
            style={{
              width: '100%',
              height: '100%',
              overflow: 'hidden',
              padding: '8px 10px', // Un poco más de padding
              display: 'flex',
              flexDirection: 'column',
              // Cambio CLAVE: Esto permite que los hijos se expandan
              justifyContent: 'space-between',
              gap: 6,
              // Añadimos un degradado sutil sobre el color base para que no se vea plano
              background: 'linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(0,0,0,0.1) 100%)'
            }}
          >
            {/* HEADER: TÍTULO Y BADGE */}
            <Group gap={8} wrap="nowrap" align="center" align-items="flex-start">
              {isManualGroup ? <IconUsers size={16} color="white" style={{ marginTop: 2 }} /> : <IconTruck size={16} color="white" style={{ marginTop: 2 }} />}
              <Box style={{ flex: 1, lineHeight: 1 }}>
                <Text size="11px" fw={800} c="white" tt="uppercase" style={{ opacity: 0.8, letterSpacing: '0.5px' }}>
                  {isODT ? `ODT #${props.nroODT}` : `TRABAJO EN BASE`}
                </Text>
                <Text size="13px" fw={900} c="white" lineClamp={2} style={{ lineHeight: 1.1, marginTop: 2 }}>
                  {isODT ? props.cliente?.nombre : `${props.total} EMPLEADOS`}
                </Text>
                {/* 2. AVATARES (Pegados al fondo) */}
                {/* BUSCA ESTA SECCIÓN EN EL RETURN DE EventMiniature */}
                {/* 2. AVATARES (Pegados al fondo de la tarjeta pequeña) */}
                <Group mt="auto" pt={6} justify="space-between" align="center" style={{ borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                  <Avatar.Group spacing="md">

                    {/* CASO 1: ES GRUPO MANUAL (Tiene registros) */}
                    {/* Verificamos !isODT y que props.registros exista antes de hacer slice */}
                    {!isODT && props.registros && props.registros.slice(0, 5).map((reg, i) => (
                      <Avatar
                        key={i}
                        src={reg.Empleado?.imagen ? `${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/${reg.Empleado.imagen}` : null}
                        size={40}
                        radius="xl"
                        style={{ border: '2px solid rgba(255,255,255,0.9)' }}
                      >
                        {reg.Empleado?.nombre?.charAt(0)}
                      </Avatar>
                    ))}

                    {/* CASO 2: ES ODT (Tiene chofer y ayudante) */}
                    {isODT && (
                      <>
                        {props.chofer && (
                          <Tooltip label={`Operador: ${props.chofer.nombre}`}>
                            <Avatar
                              src={props.chofer.imagen ? `${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/${props.chofer.imagen}` : null}
                              size={40}
                              radius="xl"
                              style={{ border: '2px solid rgba(255,255,255,0.9)' }}
                            >
                              {props.chofer.nombre?.charAt(0)}
                            </Avatar>
                          </Tooltip>
                        )}
                        {props.ayudante && (
                          <Tooltip label={`Ayudante: ${props.ayudante.nombre}`}>
                            <Avatar
                              src={props.ayudante.imagen ? `${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/${props.ayudante.imagen}` : null}
                              size={40}
                              radius="xl"
                              style={{ border: '2px solid rgba(255,255,255,0.9)' }}
                            >
                              {props.ayudante.nombre?.charAt(0)}
                            </Avatar>
                          </Tooltip>
                        )}
                      </>
                    )}

                    {/* Contador extra solo para manuales */}
                    {!isODT && props.total > 5 && (
                      <Avatar size={24} radius="xl" bg="white" c="dark">
                        <Text size="9px" fw={800}>+{props.total - 5}</Text>
                      </Avatar>
                    )}
                  </Avatar.Group>
                </Group>
              </Box>
            </Group>

            {/* CONTENIDO PRINCIPAL (Ocupa el resto del espacio) */}
            <Box style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>

              {isODT ? (
                // --- ODT CONTENT ---
                <>
                  {/* Descripción ocupa el espacio disponible */}
                  <Text
                    size="11px"
                    c="white"
                    style={{
                      opacity: 0.9,
                      lineHeight: 1.3,
                      flex: 1, // Esto hace que el texto use el espacio vertical disponible
                      overflow: 'hidden'
                    }}
                  >
                    {props.descripcionServicio}
                  </Text>

                  {/* Vehículo pegado al fondo */}
                  <Box mt="auto" style={{ paddingTop: 4, borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                    {props.vehiculoPrincipal && <VehiculoLine activo={props.vehiculoPrincipal} />}
                  </Box>
                </>
              ) : (
                // --- MANUAL GROUP CONTENT ---
                <>
                  <Divider color="rgb(255, 255, 255)" />
                  {/* 1. RESUMEN IA (Prioridad visual, ocupa espacio) */}
                  <Box
                    style={{
                      flex: 1, // Ocupa todo el espacio vertical disponible
                      overflow: 'hidden',
                      marginTop: 4
                    }}
                  >
                    {loadingAI ? (
                      <Group gap={6}>
                        <Loader size={12} color="white" type="dots" />
                        <Text size="10px" c="white" fs="italic">Procesando...</Text>
                      </Group>
                    ) : (
                      <Text
                        size="16px" // Letra un poco más grande
                        c="white"
                        fw={700}
                        // Quitamos lineClamp estricto para que llene el cuadro si es alto
                        style={{
                          lineHeight: 1.4,
                          textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                          whiteSpace: 'pre-wrap' // Respeta saltos de línea si la IA los manda
                        }}
                      >
                        {resumenAI || "Generando resumen..."}
                      </Text>
                    )}
                  </Box>


                </>
              )}
            </Box>
          </Box>
        </div>
      </HoverCard.Target>

      <HoverCard.Dropdown p={0}>
        <HoverContent />
      </HoverCard.Dropdown>
    </HoverCard>
  );
};


// ==========================================
// 3. COMPONENTE PRINCIPAL (PAGE)
// ==========================================
export default function PizarraPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const calendarRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resOdts, resHoras] = await Promise.all([
          fetch("/api/odts").then(r => r.json()),
          fetch("/api/rrhh/horas-manuales").then(r => r.json())
        ]);

        // --- 1. PROCESAR ODTS ---
        const eventosOdt = Array.isArray(resOdts) ? resOdts.map(odt => ({
          id: `odt-${odt.id}`,
          realId: odt.id,
          tipo: 'odt',
          start: `${odt.fecha.split('T')[0]}T${odt.horaLlegada}`,
          end: `${odt.fecha.split('T')[0]}T${odt.horaSalida}`,
          extendedProps: { ...odt, fecha: toLocalDate(odt.fecha) },
          backgroundColor: odt.maquinariaId ? COLORS.accentOrange : COLORS.petrol,
          borderColor: 'transparent',
          textColor: 'white'
        })) : [];

        // --- 2. PROCESAR HORAS MANUALES ---
        const eventosHorasGroup = [];
        if (Array.isArray(resHoras)) {
          const groupedByDate = resHoras.reduce((acc, curr) => {
            const date = curr.fecha.split('T')[0];
            if (!acc[date]) acc[date] = [];
            acc[date].push(curr);
            return acc;
          }, {});

          Object.keys(groupedByDate).forEach(date => {
            const registros = groupedByDate[date];
            eventosHorasGroup.push({
              id: `group-manual-${date}`,
              tipo: 'manual-group',
              title: 'Trabajo en Base',
              start: `${date}T08:00:00`,
              end: `${date}T16:00:00`,
              extendedProps: {
                registros: registros,
                total: registros.length
              },
              backgroundColor: COLORS.petrol,
              borderColor: 'transparent',
              textColor: 'white'
            });
          });
        }

        setEvents([...eventosOdt, ...eventosHorasGroup]);
      } catch (error) {
        console.error("Error cargando pizarra:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // --- RENDERIZADO VISUAL DEL EVENTO (FullCalendar) ---
  const renderEventContent = (info) => {
    // Retornamos nuestro componente miniatura inteligente
    return <EventMiniature key={info.event.id} event={info.event} router={router} />;
  };

  if (loading) return (
    <Stack align="center" justify="center" h="100vh">
      <Loader color={COLORS.petrol} type="bars" />
      <Text size="sm" c="dimmed" animate>Sincronizando operaciones...</Text>
    </Stack>
  );

  return (
    <Container size="xl" p="md" style={{ height: 'calc(100vh - 60px)', display: 'flex', flexDirection: 'column' }}>

      {/* HEADER TIPO CONTROL PANEL */}
      <Paper shadow="xs" p="sm" radius="md" mb="md" withBorder bg="white">
        <Group justify="space-between">
          {/* Izquierda: Título y Navegación */}
          <Group>
            <ActionIcon variant="light" color="gray" onClick={() => router.back()} size="lg" radius="md">
              <IconArrowLeft size={20} />
            </ActionIcon>
            <Box visibleFrom="xs">
              <Text size="xs" tt="uppercase" fw={700} c="dimmed" lts={1}>Logística</Text>
              <Title order={3} c={COLORS.petrol}>Pizarra Semanal</Title>
            </Box>

            {/* Controles Calendario */}
            <Group gap={4} ml="md" visibleFrom="sm">
              <Tooltip label="Semana Anterior">
                <ActionIcon variant="default" onClick={() => calendarRef.current?.getApi().prev()} radius="md"><IconChevronLeft size={18} /></ActionIcon>
              </Tooltip>
              <Button variant="default" onClick={() => calendarRef.current?.getApi().today()} radius="md" fw={600}>Hoy</Button>
              <Tooltip label="Semana Siguiente">
                <ActionIcon variant="default" onClick={() => calendarRef.current?.getApi().next()} radius="md"><IconChevronRight size={18} /></ActionIcon>
              </Tooltip>
            </Group>
          </Group>

          {/* Derecha: Acciones */}
          <Group gap="xs">
            <ManualHoursButton />
            <Button
              onClick={() => router.push('/superuser/odt/nuevo')}
              color={COLORS.petrol}
              leftSection={<IconClipboardText size={18} />}
              radius="md"
              className="hover-scale"
            >
              Nueva ODT
            </Button>
          </Group>
        </Group>

        {/* Controles Móviles (Segunda línea) */}
        <Group hiddenFrom="sm" mt="sm" grow>
          <Button variant="default" onClick={() => calendarRef.current?.getApi().prev()}><IconChevronLeft /></Button>
          <Button variant="default" onClick={() => calendarRef.current?.getApi().today()}>Hoy</Button>
          <Button variant="default" onClick={() => calendarRef.current?.getApi().next()}><IconChevronRight /></Button>
        </Group>
      </Paper>

      {/* CALENDARIO (Escritorio) */}
      <Box visibleFrom="sm" style={{ flex: 1, minHeight: 0 }}>
        <Paper shadow="sm" p={0} radius="md" withBorder style={{ height: '100%', overflow: 'hidden' }}>
          <FullCalendar
            ref={calendarRef}
            plugins={[timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            headerToolbar={false}
            locale={esLocale}
            firstDay={5} //viernes
            events={events}
            eventContent={renderEventContent}
            eventClick={(info) => {
              if (info.event.id.startsWith('odt')) {
                router.push(`/superuser/odt/${info.event.extendedProps.realId}`);
              }
            }}
            slotEventOverlap={false}
            eventMaxStack={3}
            height="100%"
            expandRows={true}
            allDaySlot={false}
            slotMinTime="05:00:00"
            slotMaxTime="23:00:00"
            nowIndicator={true}
          />
        </Paper>
      </Box>

      {/* VISTA MÓVIL (Agenda) */}
      <Box hiddenFrom="sm">
        <MobileAgendaView events={events} router={router} />
      </Box>
    </Container>
  );
}

// ==========================================
// 4. VISTA MÓVIL (TIMELINE CARD) ACTUALIZADA
// ==========================================
function MobileAgendaView({ events, router }) {
  const grouped = useMemo(() => {
    const groups = {};
    const sorted = [...events].sort((a, b) => new Date(b.start) - new Date(a.start));

    sorted.forEach((ev) => {
      const dateKey = ev.start.split("T")[0];
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(ev);
    });
    return groups;
  }, [events]);

  const dates = Object.keys(grouped);

  if (dates.length === 0) return (
    <Paper p="xl" withBorder radius="md" ta="center" bg="gray.0" mt="xl">
      <ThemeIcon size={50} radius="xl" color="gray" variant="light" mb="md"><IconCalendarEvent size={30} /></ThemeIcon>
      <Title order={4} c="dimmed">Sin operaciones</Title>
      <Text size="sm" c="dimmed">No hay ODTs ni horas registradas esta semana.</Text>
    </Paper>
  );

  return (
    <Stack gap="lg" pb={80}>
      {dates.map((dateKey) => (
        <Box key={dateKey}>
          {/* Header de Fecha Sticky */}
          <Paper
            radius={0}
            p="sm"
            bg={COLORS.petrol}
            c="white"
            shadow="md"
            style={{ position: "sticky", top: 0, zIndex: 10 }}
          >
            <Group justify="space-between">
              <Group gap="xs">
                <IconCalendarEvent size={20} className="text-yellow-400" />
                <Text fw={700} tt="capitalize" size="lg">
                  {formatDateLong(dateKey)}
                </Text>
              </Group>
              <Badge color="yellow" c="dark" variant="filled">
                {grouped[dateKey].length} Eventos
              </Badge>
            </Group>
          </Paper>

          <Stack gap="md" p="md" bg="gray.0">
            {grouped[dateKey].map((ev) => {
              const isGroup = ev.tipo === "manual-group";
              const props = ev.extendedProps;
              const startTime = new Date(ev.start);
              const endTime = new Date(ev.end);

              // -----------------------------------------------------
              // A. RENDERIZADO DE GRUPO MANUAL (AGRUPADO)
              // -----------------------------------------------------
              if (isGroup) {
                const subGrupos = agruparRegistros(props.registros);

                return (
                  <Card key={ev.id} shadow="sm" radius="md" withBorder padding="lg" style={{ borderLeft: `5px solid ${COLORS.accentTeal}` }}>
                    <Group justify="space-between" mb="md">
                      <Group gap="xs">
                        <ThemeIcon color="teal" size="md" radius="md" variant="light"><IconClipboardText size={18} /></ThemeIcon>
                        <Text fw={800} size="md" c="teal.9">Trabajo en Base</Text>
                      </Group>
                      <Badge color="teal" variant="light" size="lg">{props.total} Pers.</Badge>
                    </Group>

                    {/* Renderizamos los SubGrupos */}
                    <Stack gap="md">
                      {subGrupos.map((grupo, idx) => (
                        // AQUÍ ESTÁ EL CAMBIO: Usamos el nuevo componente
                        <GroupedEmployeeRow key={idx} grupo={grupo} router={router} />
                      ))}
                    </Stack>
                  </Card>
                )
              }

              // -----------------------------------------------------
              // B. RENDERIZADO DE ODT (Igual que antes)
              // -----------------------------------------------------
              return (
                <Card
                  key={ev.id}
                  shadow="sm"
                  radius="md"
                  withBorder
                  padding="lg"
                  onClick={() => router.push(`/superuser/odt/${props.id}`)}
                  style={{ cursor: "pointer", borderLeft: `5px solid ${props.maquinariaId ? COLORS.accentOrange : COLORS.petrol}` }}
                >
                  <Group justify="space-between" mb="xs" align="start">
                    <Box style={{ flex: 1 }}>
                      <Group gap="xs" mb={4}>
                        <Badge color={props.maquinariaId ? "orange" : "blue"} variant="filled" size="sm">ODT #{props.nroODT}</Badge>
                        <Group gap={4}>
                          <IconClock size={14} color="gray" />
                          <Text size="xs" c="dimmed" fw={600}>
                            {format(startTime, "HH:mm")} - {format(endTime, "HH:mm")}
                          </Text>
                        </Group>
                      </Group>
                      <Title order={5} lineClamp={2} c="dark.8">{props.cliente?.nombre}</Title>
                      <Text size="sm" c="dimmed" lineClamp={2} mt={2} style={{ lineHeight: 1.3 }}>{props.descripcionServicio}</Text>
                    </Box>
                  </Group>

                  <Divider my="sm" />

                  <Text size="xs" tt="uppercase" c="dimmed" fw={700} mb="xs">Recursos Asignados</Text>
                  <Stack gap="xs">
                    {props.vehiculoPrincipal && <VehiculoLineMobile activo={props.vehiculoPrincipal} icon={<IconSteeringWheel size={16} />} />}
                    {props.maquinaria && <VehiculoLineMobile activo={props.maquinaria} icon={<IconTool size={16} />} color="orange" />}

                    <Group grow>
                      {props.chofer && (
                        <Group gap={8} align="flex-start">
                          <Avatar src={props.chofer.imagen ? `${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/${props.chofer.imagen}` : null} size="sm" radius="xl" />
                          <Box>
                            <Text size="xs" fw={700}>{props.chofer.nombre}</Text>
                            <Text size="10px" c="blue.7" fw={800}>
                              Base: {props.choferEntradaBase || props.horaLlegada.substring(0, 5)} - {props.choferSalidaBase || props.horaSalida.substring(0, 5)}
                            </Text>
                          </Box>
                        </Group>
                      )}
                      {props.ayudante && (
                        <Group gap={8} align="flex-start">
                          <Avatar src={props.ayudante.imagen ? `${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/${props.ayudante.imagen}` : null} size="sm" radius="xl" />
                          <Box>
                            <Text size="xs" fw={700}>{props.ayudante.nombre}</Text>
                            <Text size="10px" c="blue.7" fw={800}>
                              Base: {props.ayudanteEntradaBase || props.horaLlegada.substring(0, 5)} - {props.ayudanteSalidaBase || props.horaSalida.substring(0, 5)}
                            </Text>
                          </Box>
                        </Group>
                      )}
                    </Group>
                  </Stack>
                </Card>
              );
            })}
          </Stack>
        </Box>
      ))}
    </Stack>
  );
}

// ==========================================
// 5. COMPONENTE DE FILA CON POPOVER (EFECTO MACOS)
// ==========================================
// ==========================================
// 5. COMPONENTE DE FILA INTELIGENTE (POPOVER O REDIRECT)
// ==========================================
const GroupedEmployeeRow = ({ grupo, router }) => {
  const [opened, setOpened] = useState(false);

  // Detectamos si es un solo empleado
  const isSingle = grupo.empleados.length === 1;

  // Extraemos el contenido visual de la tarjeta para reutilizarlo en ambos casos
  const CardContent = (
    <Paper withBorder p="sm" radius="md" bg="white" style={{ position: 'relative' }}>

      {/* Indicador visual de que es desplegable (Solo si son varios) */}
      {!isSingle && (
        <Box style={{ position: 'absolute', top: 8, right: 8, opacity: 0.4 }}>
          <IconChevronRight size={14} style={{ transform: opened ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
        </Box>
      )}

      {/* Header: Observación */}
      <Text size="xs" fw={700} c="dimmed" tt="uppercase" lts={1} mb="xs" style={{ borderBottom: '1px dashed #eee', paddingBottom: 4, paddingRight: 16 }}>
        {grupo.observaciones}
      </Text>

      <Group align="flex-start" wrap="nowrap">
        {/* Stack de Avatares */}
        <Avatar.Group spacing="sm">
          {grupo.empleados.slice(0, 4).map(emp => (
            <Avatar
              key={emp.id}
              src={emp.imagen ? `${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/${emp.imagen}` : null}
              size="md"
              radius="xl"
              color="blue"
              style={{ border: '2px solid white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
            >
              {emp.nombre?.charAt(0)}
            </Avatar>
          ))}
          {grupo.empleados.length > 4 && (
            <Avatar size="md" radius="xl" color="gray" variant="light">+{grupo.empleados.length - 4}</Avatar>
          )}
        </Avatar.Group>

        {/* Resumen Texto */}
        <Box style={{ flex: 1 }}>
          <Text size="sm" fw={600} c="dark.8" lh={1.3} lineClamp={2}>
            {grupo.empleados.map(e => `${e.nombre} ${e.apellido}`).join(', ')}
          </Text>
          <Group gap={6} mt={4}>
            <Badge size="sm" color="dark" variant="light">{grupo.horas} Horas</Badge>
            {/* Si son varios, mostramos "Ver detalle", si es uno, nada extra */}
            {!isSingle && <Text size="xs" c="dimmed" fs="italic" style={{ fontSize: '10px' }}>Toca para ver lista</Text>}
          </Group>
        </Box>
      </Group>
    </Paper>
  );

  // --- CASO 1: UN SOLO EMPLEADO (REDIRECT DIRECTO) ---
  if (isSingle) {
    return (
      <UnstyledButton
        onClick={() => router.push(`/superuser/rrhh/empleados/${grupo.empleados[0].id}`)}
        style={{ width: '100%', display: 'block' }}
      >
        {CardContent}
      </UnstyledButton>
    );
  }

  // --- CASO 2: GRUPO (POPOVER MACOS) ---
  return (
    <Popover
      opened={opened}
      onChange={setOpened}
      width={320}
      position="bottom"
      withArrow
      shadow="xl"
      transitionProps={{ transition: 'pop', duration: 200 }}
      withinPortal
    >
      <Popover.Target>
        <UnstyledButton
          onClick={() => setOpened((o) => !o)}
          style={{ width: '100%', display: 'block' }}
        >
          {CardContent}
        </UnstyledButton>
      </Popover.Target>

      <Popover.Dropdown p={0} style={{ borderRadius: 12, overflow: 'hidden', border: `1px solid ${COLORS.petrol}` }}>
        <Box bg={COLORS.petrol} p="xs">
          <Text c="white" fw={700} size="sm" ta="center">Personal Asignado ({grupo.empleados.length})</Text>
        </Box>
        <ScrollArea.Autosize mah={300} type="always">
          <Stack gap={0}>
            {grupo.empleados.map((emp) => (
              <UnstyledButton
                key={emp.id}
                onClick={() => router.push(`/superuser/rrhh/empleados/${emp.id}`)}
                style={{ padding: '10px 14px', borderBottom: '1px solid #f1f3f5' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <Group>
                  <Avatar
                    src={emp.imagen ? `${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/${emp.imagen}` : null}
                    size={32}
                    radius="xl"
                    color="blue"
                  >
                    {emp.nombre?.charAt(0)}
                  </Avatar>
                  <Box>
                    <Text size="sm" fw={600}>{emp.nombre} {emp.apellido}</Text>
                    <Text size="xs" c="dimmed">Ver Perfil →</Text>
                  </Box>
                </Group>
              </UnstyledButton>
            ))}
          </Stack>
        </ScrollArea.Autosize>
      </Popover.Dropdown>
    </Popover>
  );
}