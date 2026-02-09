"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import {
  Container, Title, Text, Group, Loader,
  Box, Button, Paper, HoverCard, Badge, Stack, Divider, ThemeIcon,
  Card, ScrollArea, Avatar, UnstyledButton, ActionIcon, Tooltip,
  Popover, Modal
} from "@mantine/core";
import {
  IconChevronLeft, IconChevronRight, IconSteeringWheel,
  IconClipboardText, IconCalendarEvent, IconTruck, IconTool,
  IconUsers, IconArrowLeft, IconMapPin, IconClock, IconInfoCircle
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import esLocale from "@fullcalendar/core/locales/es";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// COMPONENTES PROPIOS (Ajusta la ruta si es necesario)
import ManualHoursButton from "./ManualHoursButton";
import { toLocalDate } from "@/app/helpers/fechaCaracas";
import { formatDateLong } from "@/app/helpers/dateUtils";

// --- ESTILOS CSS PARA LA ANIMACIÓN ---
const PulseStyles = () => (
  <style global jsx>{`
    @keyframes pulse-yellow {
      0% { box-shadow: 0 0 0 0 rgba(250, 176, 5, 0.7); }
      70% { box-shadow: 0 0 0 6px rgba(250, 176, 5, 0); }
      100% { box-shadow: 0 0 0 0 rgba(250, 176, 5, 0); }
    }
    .pulsing-badge {
      animation: pulse-yellow 2s infinite;
    }
    .fc-event {
        cursor: pointer;
        border: none !important;
        background: transparent !important;
        box-shadow: none !important;
    }
    .fc-timegrid-event-harness {
        margin-bottom: 2px; 
    }
  `}</style>
);

// --- COLORES CORPORATIVOS ---
const COLORS = {
  petrol: '#1e293b',      // Slate 800 (El Azul Oscuro que querías)
  yellow: '#f59f00',      // Yellow 9
  gray: '#f8f9fa',
  accentBlue: '#1c7ed6',  // Blue 7
  accentOrange: '#d9480f',// Orange 9
  accentTeal: '#0ca678',  // Teal 9
};

// ==========================================
// 1. HELPERS VISUALES Y LÓGICOS
// ==========================================

const agruparRegistros = (registros) => {
  const grupos = {};
  if (!registros) return [];
  registros.forEach((reg) => {
    const obs = (reg.observaciones || "Sin observaciones").trim();
    const key = `${reg.horas}-${obs}`;
    if (!grupos[key]) {
      grupos[key] = { key, horas: reg.horas, observaciones: obs, empleados: [] };
    }
    grupos[key].empleados.push(reg.Empleado);
  });
  return Object.values(grupos);
};

function VehiculoLine({ activo }) {
  if (!activo) return null;
  const instancia = activo.vehiculoInstancia || activo.remolqueInstancia || activo.maquinariaInstancia;
  const modelo = instancia?.plantilla?.modelo || 'Genérico';
  const placa = instancia?.placa || instancia?.serialVin || activo.codigoInterno || 'S/P';
  return (
    <Group gap={6} wrap="nowrap" style={{ opacity: 0.9 }}>
      <ThemeIcon variant="transparent" color="white" size={14}><IconSteeringWheel size={12} /></ThemeIcon>
      <Text size="10px" c="white" truncate fw={600}>
        {placa} <Text span fw={400} style={{ opacity: 0.7 }}>• {modelo}</Text>
      </Text>
    </Group>
  );
}

function VehiculoLineMobile({ activo, icon, color = "gray" }) {
  if (!activo) return null;
  const instancia = activo.vehiculoInstancia || activo.remolqueInstancia || activo.maquinariaInstancia;
  const modelo = instancia?.plantilla?.modelo || "Genérico";
  const placa = instancia?.placa || instancia?.serialVin || activo.codigoInterno;
  return (
    <Paper withBorder p={6} radius="sm" bg="gray.0">
      <Group gap="xs" wrap="nowrap">
        <ThemeIcon variant="light" color={color} size="md" radius="md">{icon || <IconTruck size={16} />}</ThemeIcon>
        <Box style={{ lineHeight: 1.1 }}>
          <Text size="sm" fw={700} c="dark.5">{placa}</Text>
          <Text size="xs" c="dimmed">{modelo}</Text>
        </Box>
      </Group>
    </Paper>
  );
}

const PersonalAvatar = ({ empleado, rol, router, entrada, salida }) => {
  if (!empleado) return null;
  const tieneHorario = entrada && salida;
  return (
    <UnstyledButton onClick={() => router.push(`/superuser/rrhh/empleados/${empleado.id}`)} style={{ width: '100%' }}>
      <Group wrap="nowrap" align="flex-start">
        <Avatar src={empleado?.imagen ? `${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/${empleado.imagen}` : null} size={38} radius="xl" color="blue">
          {empleado.nombre?.charAt(0)}
        </Avatar>
        <Box>
          <Text size="sm" fw={700} lh={1.1}>{empleado.nombre} {empleado.apellido}</Text>
          <Text size="xs" c="dimmed" fw={500}>{rol}</Text>
          {tieneHorario && (
            <Group gap={4} mt={2}>
              <IconClock size={10} color="var(--mantine-color-blue-6)" />
              <Text size="10px" fw={700} c="blue.7">Base: {entrada.substring(0, 5)} - {salida.substring(0, 5)}</Text>
            </Group>
          )}
        </Box>
      </Group>
    </UnstyledButton>
  )
}

const VehiculoItem = ({ activo }) => {
  const instancia = activo?.vehiculoInstancia || activo?.remolqueInstancia || activo?.maquinariaInstancia;
  if (!instancia) return null;
  return (
    <Group gap="xs" wrap="nowrap">
      <ThemeIcon size="xs" color="gray" variant="transparent"><IconSteeringWheel /></ThemeIcon>
      <Text size="xs" fw={600}>{instancia.placa} <Text span c="dimmed" fw={400}>{instancia.plantilla?.modelo}</Text></Text>
    </Group>
  )
}

// CACHÉ GLOBAL
const summaryCache = {};
const fetchStatus = {};

// ==========================================
// 2. COMPONENTE EVENT MINIATURE
// ==========================================
const EventMiniature = ({ event, router }) => {
  const props = event.extendedProps;
  const isODT = event.id.startsWith('odt');
  const isManualGroup = event.id.startsWith('group-manual');
  const eventId = event.id;

  // Lógica "En Curso"
  const isEnCurso = isODT && props.estado === 'En Curso';

  // --- CORRECCIÓN DE COLOR DE FONDO ---
  // Determinamos el color explícitamente para asegurar contraste
  let cardBgColor = COLORS.petrol; // Por defecto azul oscuro
  if (isODT && props.maquinariaId) {
    cardBgColor = COLORS.accentOrange; // Naranja si es maquinaria
  }
  // ------------------------------------

  const [resumenAI, setResumenAI] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);

  useEffect(() => {
    if (!isManualGroup) return;
    if (summaryCache[eventId]) { setResumenAI(summaryCache[eventId]); return; }
    if (fetchStatus[eventId] === 'loading') return;

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

    const esFechaReciente = fechaEvento >= viernesInicioSemana && fechaEvento <= hoy;
    const delay = esFechaReciente ? Math.floor(Math.random() * 1000) + 500 : 0;

    fetch(`/api/ai/generar-resumen?t=${Date.now()}`, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      },
      body: JSON.stringify({
        observaciones: props.registros.map(r => r.observaciones).filter(o => o?.length > 3),
        fecha: event.start,
        permitirGeneracion: esFechaReciente
      })
    })
      .then(res => { if (res.status === 429) throw new Error("Busy"); return res.json(); })
      .then(data => {
        const textoFinal = data.resumen || "Histórico sin resumen.";
        summaryCache[eventId] = textoFinal;
        fetchStatus[eventId] = 'done';
        setResumenAI(textoFinal);
      })
      .catch(err => {
        console.error(err);
        fetchStatus[eventId] = null;
        if (err.message === "Busy") setResumenAI("IA saturada.");
        else setResumenAI("Ver detalles.");
      })
      .finally(() => {
        console.log("Fetch IA finalizado para evento:", eventId);
        setLoadingAI(false)
      });
  }, [eventId, isManualGroup, event.start, props.registros]);


  // CONTENIDO DEL POPOVER
  const HoverContent = () => {
    const subGrupos = !isODT ? agruparRegistros(props.registros) : [];
    return (
      <Stack gap="md" p="md" w={{ base: 320, sm: 500 }}>
        {/* Header Popover */}
        <Group justify="space-between" align="start">
          <Box>
            <Badge size="lg" variant="filled" color={isODT ? (props.maquinariaId ? 'orange' : 'blue') : 'teal'} radius="sm">
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
          <>
            <Text size="sm" c="dimmed" lh={1.4}>{props.descripcionServicio}</Text>
            {/* Tiempos */}
            <Box bg="gray.0" p="xs" style={{ borderRadius: 8 }}>
              <Badge variant="dot" color="gray" size="sm">
                Labor Sitio: {props.horaLlegada?.substring(0, 5)} - {props.horaSalida?.substring(0, 5)}
              </Badge>
              {props.salidaActivosBase && (
                <Text size="xs" c="dimmed" mt={4}>
                  🚚 Flota Base: {props.salidaActivosBase.substring(0, 5)} - {props.llegadaActivosBase?.substring(0, 5)}
                </Text>
              )}
            </Box>

            {/* Flota */}
            <Box>
              <Text size="10px" tt="uppercase" fw={800} c="dimmed" mb={4}>Flota Asignada</Text>
              <Stack gap={6}>
                {props.vehiculoPrincipal && <VehiculoItem activo={props.vehiculoPrincipal} />}
                {props.vehiculoRemolque && <VehiculoItem activo={props.vehiculoRemolque} />}
                {props.maquinaria && <VehiculoItem activo={props.maquinaria} />}
              </Stack>
            </Box>

            {/* Personal */}
            <Box>
              <Text size="10px" tt="uppercase" fw={800} c="dimmed" mb={4}>Personal</Text>
              <Group gap="sm">
                <PersonalAvatar empleado={props.chofer} rol="Operador" router={router} entrada={props.choferEntradaBase} salida={props.choferSalidaBase} />
                <PersonalAvatar empleado={props.ayudante} rol="Ayudante" router={router} entrada={props.ayudanteEntradaBase} salida={props.ayudanteSalidaBase} />
              </Group>
            </Box>
          </>
        ) : (
          /* Manual Content */
          <ScrollArea.Autosize mah={400}>
            <Stack gap="md">
              {subGrupos.map((grupo, idx) => (
                <Paper key={idx} withBorder p="md" radius="md" bg="white" shadow="xs">
                  <Group align="flex-start" wrap="nowrap" mb="xs">
                    <Avatar.Group spacing="sm" mr={10}>
                      {grupo.empleados.map(emp => (
                        <Tooltip key={emp.id} label={`${emp.nombre} ${emp.apellido}`}>
                          <Avatar src={emp.imagen ? `${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/${emp.imagen}` : null} radius="xl" size={40} color="blue">{emp.nombre?.charAt(0)}</Avatar>
                        </Tooltip>
                      ))}
                    </Avatar.Group>
                    <Box style={{ flex: 1 }}>
                      <Text size="sm" fw={700} c="dark.8" lh={1.3}>{grupo.empleados.map(e => e.nombre).join(', ')}</Text>
                      <Badge size="sm" color="dark" variant="light" mt={4}>{grupo.horas} Horas</Badge>
                    </Box>
                  </Group>
                  <Text size="sm" c="dimmed" style={{ whiteSpace: 'pre-wrap' }}>{grupo.observaciones}</Text>
                </Paper>
              ))}
            </Stack>
          </ScrollArea.Autosize>
        )}
      </Stack>
    );
  };

  // RENDER MINIATURA (TARJETA VISIBLE)
  return (
    <HoverCard width="auto" shadow="xl" withArrow openDelay={200} position="right-start" radius="md">
      <HoverCard.Target>
        <div style={{ width: '100%', height: '100%' }}>
          <Box style={{
            width: '100%', height: '100%', overflow: 'hidden', padding: '8px 10px',
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 6,
            // AQUÍ APLICAMOS EL COLOR DE FONDO SÓLIDO (PETROL/ORANGE)
            backgroundColor: cardBgColor,
            // Borde amarillo si está en curso
            border: isEnCurso ? '2px solid #fcc419' : 'none',
            // Degradado sutil ENCIMA del color sólido para dar profundidad sin perder contraste
            backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(0,0,0,0.1) 100%)',
            color: 'white' // Forzamos texto blanco
          }}>

            {/* Header */}
            <Group gap={8} wrap="nowrap" align="flex-start" justify="space-between">
              <Group gap={6} wrap="nowrap" style={{ flex: 1 }}>
                {isManualGroup ? <IconUsers size={16} color="white" /> : <IconTruck size={16} color="white" />}
                <Box style={{ lineHeight: 1 }}>
                  <Text size="11px" fw={800} c="white" tt="uppercase" style={{ opacity: 0.9 }}>
                    {isODT ? `ODT #${props.nroODT}` : `TRABAJO EN BASE`}
                  </Text>

                  {isEnCurso ? (
                    <Badge size="xs" variant="filled" color="yellow" c="dark" className="pulsing-badge" style={{ marginTop: 2, fontSize: '9px', height: 16 }}>
                      ● EN CURSO
                    </Badge>
                  ) : (
                    <Text size="13px" fw={900} c="white" lineClamp={2} style={{ lineHeight: 1.1, marginTop: 2 }}>
                      {isODT ? props.cliente?.nombre : `${props.total} EMPLEADOS`}
                    </Text>
                  )}
                </Box>
              </Group>
            </Group>

            {isEnCurso && isODT && <Text size="11px" c="white" fw={700} lineClamp={1}>{props.cliente?.nombre}</Text>}

            {/* Avatares footer */}
            <Group mt="auto" pt={6} justify="space-between" align="center" style={{ borderTop: '1px solid rgba(255,255,255,0.2)' }}>
              <Avatar.Group spacing="md">
                {isODT && (
                  <>
                    {props.chofer && <Avatar src={props.chofer.imagen ? `${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/${props.chofer.imagen}` : null} size={30} radius="xl">{props.chofer.nombre?.charAt(0)}</Avatar>}
                    {props.ayudante && <Avatar src={props.ayudante.imagen ? `${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/${props.ayudante.imagen}` : null} size={30} radius="xl">{props.ayudante.nombre?.charAt(0)}</Avatar>}
                  </>
                )}
                {!isODT && props.registros?.slice(0, 3).map((r, i) => (
                  <Avatar key={i} src={r.Empleado?.imagen ? `${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/${r.Empleado.imagen}` : null} size={30} radius="xl">{r.Empleado?.nombre?.charAt(0)}</Avatar>
                ))}
                {!isODT && props.total > 3 && <Avatar size={24} radius="xl" bg="white" c="dark" fs="xs">+{props.total - 3}</Avatar>}
              </Avatar.Group>
            </Group>

            {/* Contenido Texto */}
            <Box style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              {isODT ? (
                <>
                  <Text size="11px" c="white" style={{ opacity: 0.9, lineHeight: 1.3, flex: 1, overflow: 'hidden' }}>{props.descripcionServicio}</Text>
                  <Box mt="auto" style={{ paddingTop: 4 }}>{props.vehiculoPrincipal && <VehiculoLine activo={props.vehiculoPrincipal} />}</Box>
                </>
              ) : (
                <>
                  <Divider color="white" my={4} style={{ opacity: 0.5 }} />
                  <Box style={{ flex: 1, overflow: 'hidden' }}>
                    {loadingAI ? (
                      <Group gap={4}><Loader size={10} color="white" /><Text size="10px" c="white">IA Analizando...</Text></Group>
                    ) : (
                      <Text size="14px" c="white" fw={700} style={{ lineHeight: 1.3, whiteSpace: 'pre-wrap', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>{resumenAI || "Generando..."}</Text>
                    )}
                  </Box>
                </>
              )}
            </Box>

          </Box>
        </div>
      </HoverCard.Target>
      <HoverCard.Dropdown p={0}><HoverContent /></HoverCard.Dropdown>
    </HoverCard>
  );
};


// ==========================================
// 3. PAGE MAIN COMPONENT
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

        const eventosOdt = Array.isArray(resOdts) ? resOdts.map(odt => ({
          id: `odt-${odt.id}`,
          realId: odt.id,
          tipo: 'odt',
          start: `${odt.fecha.split('T')[0]}T${odt.horaLlegada}`,
          end: `${odt.fecha.split('T')[0]}T${odt.horaSalida}`,
          extendedProps: { ...odt, fecha: toLocalDate(odt.fecha) },
          // NOTA: El color aquí ya no importa tanto porque lo forzamos en el componente, 
          // pero lo dejamos por si FullCalendar lo usa para algo más.
          backgroundColor: odt.maquinariaId ? COLORS.accentOrange : COLORS.petrol,
          borderColor: 'transparent',
          textColor: 'white'
        })) : [];

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
              extendedProps: { registros: registros, total: registros.length },
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

  const renderEventContent = (info) => <EventMiniature key={info.event.id} event={info.event} router={router} />;

  if (loading) return <Stack align="center" justify="center" h="100vh"><Loader color={COLORS.petrol} /><Text size="sm" c="dimmed">Cargando...</Text></Stack>;

  return (
    <Container size="xl" p="md" style={{ height: 'calc(100vh - 60px)', display: 'flex', flexDirection: 'column' }}>
      <PulseStyles />
      {/* HEADER */}
      <Paper shadow="xs" p="sm" radius="md" mb="md" withBorder bg="white">
        <Group justify="space-between">
          <Group>
            <ActionIcon variant="light" color="gray" onClick={() => router.back()} size="lg" radius="md"><IconArrowLeft size={20} /></ActionIcon>
            <Box visibleFrom="xs">
              <Text size="xs" tt="uppercase" fw={700} c="dimmed" lts={1}>Logística</Text>
              <Title order={3} c={COLORS.petrol}>Pizarra Semanal</Title>
            </Box>
            <Group gap={4} ml="md" visibleFrom="sm">
              <Tooltip label="Anterior"><ActionIcon variant="default" onClick={() => calendarRef.current?.getApi().prev()} radius="md"><IconChevronLeft size={18} /></ActionIcon></Tooltip>
              <Button variant="default" onClick={() => calendarRef.current?.getApi().today()} radius="md" fw={600}>Hoy</Button>
              <Tooltip label="Siguiente"><ActionIcon variant="default" onClick={() => calendarRef.current?.getApi().next()} radius="md"><IconChevronRight size={18} /></ActionIcon></Tooltip>
            </Group>
          </Group>
          <Group gap="xs">
            <ManualHoursButton />
            <Button onClick={() => router.push('/superuser/odt/nuevo')} color={COLORS.petrol} leftSection={<IconClipboardText size={18} />} radius="md">Nueva ODT</Button>
          </Group>
        </Group>
        <Group hiddenFrom="sm" mt="sm" grow>
          <Button variant="default" onClick={() => calendarRef.current?.getApi().prev()}><IconChevronLeft /></Button>
          <Button variant="default" onClick={() => calendarRef.current?.getApi().today()}>Hoy</Button>
          <Button variant="default" onClick={() => calendarRef.current?.getApi().next()}><IconChevronRight /></Button>
        </Group>
      </Paper>

      {/* CALENDAR */}
      <Box visibleFrom="sm" style={{ flex: 1, minHeight: 0 }}>
        <Paper shadow="sm" p={0} radius="md" withBorder style={{ height: '100%', overflow: 'hidden' }}>
          <FullCalendar
            ref={calendarRef}
            plugins={[timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            headerToolbar={false}
            locale={esLocale}
            firstDay={5}
            events={events}
            eventContent={renderEventContent}
            eventClick={(info) => info.event.id.startsWith('odt') && router.push(`/superuser/odt/${info.event.extendedProps.realId}`)}
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

      {/* MOBILE */}
      <Box hiddenFrom="sm">
        <MobileAgendaView events={events} router={router} />
      </Box>
    </Container>
  );
}

// ==========================================
// 4. MOBILE VIEW
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

  if (dates.length === 0) return <Paper p="xl" withBorder radius="md" ta="center" bg="gray.0" mt="xl"><Title order={4} c="dimmed">Sin operaciones</Title></Paper>;

  return (
    <Stack gap="lg" pb={80}>
      {dates.map((dateKey) => (
        <Box key={dateKey}>
          <Paper radius={0} p="sm" bg={COLORS.petrol} c="white" shadow="md" style={{ position: "sticky", top: 0, zIndex: 10 }}>
            <Group justify="space-between">
              <Group gap="xs">
                <IconCalendarEvent size={20} className="text-yellow-400" />
                <Text fw={700} tt="capitalize" size="lg">{formatDateLong(dateKey)}</Text>
              </Group>
              <Badge color="yellow" c="dark" variant="filled">{grouped[dateKey].length}</Badge>
            </Group>
          </Paper>
          <Stack gap="md" p="md" bg="gray.0">
            {grouped[dateKey].map((ev) => {
              const props = ev.extendedProps;
              const isGroup = ev.tipo === "manual-group";
              const isEnCurso = !isGroup && props.estado === 'En Curso';

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
                    <Stack gap="md">
                      {subGrupos.map((grupo, idx) => <GroupedEmployeeRow key={idx} grupo={grupo} router={router} />)}
                    </Stack>
                  </Card>
                )
              }
              return (
                <Card key={ev.id} shadow="sm" radius="md" withBorder padding="lg" onClick={() => router.push(`/superuser/odt/${props.id}`)}
                  style={{ cursor: "pointer", borderLeft: `5px solid ${props.maquinariaId ? COLORS.accentOrange : COLORS.petrol}` }}>
                  <Group justify="space-between" mb="xs" align="start">
                    <Box style={{ flex: 1 }}>
                      <Group gap="xs" mb={4}>
                        <Badge color={props.maquinariaId ? "orange" : "blue"} variant="filled" size="sm">ODT #{props.nroODT}</Badge>
                        {isEnCurso && <Badge color="yellow" variant="outline" size="sm" className="pulsing-badge">EN CURSO</Badge>}
                        <Group gap={4}>
                          <IconClock size={14} color="gray" />
                          <Text size="xs" c="dimmed" fw={600}>{props.horaLlegada?.substring(0, 5)} - {props.horaSalida?.substring(0, 5)}</Text>
                        </Group>
                      </Group>
                      <Title order={5} lineClamp={2} c="dark.8">{props.cliente?.nombre}</Title>
                      <Text size="sm" c="dimmed" lineClamp={2} mt={2}>{props.descripcionServicio}</Text>
                    </Box>
                  </Group>
                  <Divider my="sm" />
                  <Stack gap="xs">
                    {props.vehiculoPrincipal && <VehiculoLineMobile activo={props.vehiculoPrincipal} icon={<IconSteeringWheel size={16} />} />}
                    {props.maquinaria && <VehiculoLineMobile activo={props.maquinaria} icon={<IconTool size={16} />} color="orange" />}
                    <Group grow>
                      {props.chofer && <Group gap={8}><Avatar src={props.chofer.imagen ? `${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/${props.chofer.imagen}` : null} size="sm" radius="xl" /><Box><Text size="xs" fw={700}>{props.chofer.nombre}</Text></Box></Group>}
                      {props.ayudante && <Group gap={8}><Avatar src={props.ayudante.imagen ? `${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/${props.ayudante.imagen}` : null} size="sm" radius="xl" /><Box><Text size="xs" fw={700}>{props.ayudante.nombre}</Text></Box></Group>}
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

// 5. HELPER ROW MOBILE
const GroupedEmployeeRow = ({ grupo, router }) => {
  const [opened, setOpened] = useState(false);
  const isSingle = grupo.empleados.length === 1;
  const CardContent = (
    <Paper withBorder p="sm" radius="md" bg="white" style={{ position: 'relative' }}>
      {!isSingle && <Box style={{ position: 'absolute', top: 8, right: 8, opacity: 0.4 }}><IconChevronRight size={14} style={{ transform: opened ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} /></Box>}
      <Text size="xs" fw={700} c="dimmed" tt="uppercase" lts={1} mb="xs" style={{ borderBottom: '1px dashed #eee', paddingBottom: 4 }}>{grupo.observaciones}</Text>
      <Group align="flex-start" wrap="nowrap">
        <Avatar.Group spacing="sm">
          {grupo.empleados.slice(0, 4).map(emp => (
            <Avatar key={emp.id} src={emp.imagen ? `${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/${emp.imagen}` : null} size="md" radius="xl" color="blue" style={{ border: '2px solid white' }}>{emp.nombre?.charAt(0)}</Avatar>
          ))}
          {grupo.empleados.length > 4 && <Avatar size="md" radius="xl" color="gray" variant="light">+{grupo.empleados.length - 4}</Avatar>}
        </Avatar.Group>
        <Box style={{ flex: 1 }}>
          <Text size="sm" fw={600} c="dark.8" lh={1.3} lineClamp={2}>{grupo.empleados.map(e => `${e.nombre}`).join(', ')}</Text>
          <Badge size="sm" color="dark" variant="light" mt={4}>{grupo.horas} Horas</Badge>
        </Box>
      </Group>
    </Paper>
  );

  if (isSingle) return <UnstyledButton onClick={() => router.push(`/superuser/rrhh/empleados/${grupo.empleados[0].id}`)} style={{ width: '100%', display: 'block' }}>{CardContent}</UnstyledButton>;
  return (
    <Popover opened={opened} onChange={setOpened} width={320} position="bottom" withArrow shadow="xl">
      <Popover.Target><UnstyledButton onClick={() => setOpened((o) => !o)} style={{ width: '100%', display: 'block' }}>{CardContent}</UnstyledButton></Popover.Target>
      <Popover.Dropdown p={0} style={{ borderRadius: 12, overflow: 'hidden', border: `1px solid ${COLORS.petrol}` }}>
        <Box bg={COLORS.petrol} p="xs"><Text c="white" fw={700} size="sm" ta="center">Personal Asignado ({grupo.empleados.length})</Text></Box>
        <ScrollArea.Autosize mah={300} type="always">
          <Stack gap={0}>
            {grupo.empleados.map((emp) => (
              <UnstyledButton key={emp.id} onClick={() => router.push(`/superuser/rrhh/empleados/${emp.id}`)} style={{ padding: '10px 14px', borderBottom: '1px solid #f1f3f5' }}>
                <Group><Avatar src={emp.imagen ? `${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/${emp.imagen}` : null} size={32} radius="xl" color="blue">{emp.nombre?.charAt(0)}</Avatar><Text size="sm" fw={600}>{emp.nombre} {emp.apellido}</Text></Group>
              </UnstyledButton>
            ))}
          </Stack>
        </ScrollArea.Autosize>
      </Popover.Dropdown>
    </Popover>
  );
}