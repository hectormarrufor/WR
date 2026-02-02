"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import {
  Container, Title, Text, Group, Loader,
  Box, Button, Paper, HoverCard, Badge, Stack, Divider, ThemeIcon,
  Card, ScrollArea, Avatar,
  UnstyledButton
} from "@mantine/core";
import {
  IconChevronLeft, IconChevronRight, IconSteeringWheel,
  IconClipboardText,
  IconCalendarEvent,
  IconTruck,
  IconTool,
  IconUsers,
  IconArrowLeft
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import esLocale from "@fullcalendar/core/locales/es";
import { format, parse } from "date-fns";
import { es } from "date-fns/locale";

import "./fullcalendar-custom.css";
import ManualHoursButton from "./ManualHoursButton";
import { toLocalDate } from "@/app/helpers/fechaCaracas";

// ==========================================
// 1. HELPERS (Sin cambios)
// ==========================================
function VehiculoLine({ activo }) {
  if (!activo) return null;
  const instancia = activo.vehiculoInstancia || activo.remolqueInstancia || activo.maquinariaInstancia;
  const modelo = instancia?.plantilla?.modelo || 'Genérico';
  const placa = instancia?.placa || instancia?.serialVin || activo.codigoInterno || 'S/P';

  return (
    <Group gap={4} wrap="nowrap" style={{ overflow: 'hidden' }}>
      <IconSteeringWheel size={10} color="white" style={{ opacity: 0.7 }} />
      <Text size="9px" c="white" truncate fw={500} style={{ lineHeight: 1 }}>
        {placa} - {modelo}
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
    <Group gap="xs" wrap="nowrap">
      <ThemeIcon variant="light" color={color} size="sm">
        {icon || <IconTruck size={12} />}
      </ThemeIcon>
      <Text size="sm" c="dark.3">
        <Text span fw={700} c="dark.6">{placa}</Text> - {modelo}
      </Text>
    </Group>
  );
}

// ==========================================
// 2. COMPONENTE PRINCIPAL
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
          backgroundColor: odt.maquinariaId ? 'var(--mantine-color-orange-filled)' : 'var(--mantine-color-blue-filled)',
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
              backgroundColor: 'var(--mantine-color-teal-filled)',
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

  // --- RENDERIZADO VISUAL DEL EVENTO ---
  const renderEventContent = (info) => {
    const props = info.event.extendedProps;
    const isODT = info.event.id.startsWith('odt');
    const isManualGroup = info.event.id.startsWith('group-manual');

    // --- CONTENIDO DEL POPOVER (DETALLES) ---
    const HoverContent = () => {
      let content = null;

      if (isODT) {
        content = (
          <Stack gap="xs" p={4}>
            <Group justify="space-between">
              <Text fw={700} size="sm">ODT #{props.nroODT}</Text>
              <Badge size="sm" color={props.maquinariaId ? 'orange' : 'blue'}>
                {props.horaLlegada?.substring(0, 5)} - {props.horaSalida?.substring(0, 5)}
              </Badge>
            </Group>
            <Text size="sm" fw={600} lh={1.2}>{props.cliente?.nombre || 'Sin Cliente'}</Text>
            <Text size="xs" c="dimmed" lh={1.2}>{props.descripcionServicio}</Text>
            <Divider my={2} />
            <Text size="10px" tt="uppercase" fw={700} c="dimmed">Activos</Text>
            <Stack gap={2}>
              {props.vehiculoPrincipal &&
                <UnstyledButton onClick={() => router.push(`/superuser/flota/activos/${props.vehiculoPrincipal.id}`)}>
                  <Group key={props.vehiculoPrincipal.id} wrap="nowrap" align="flex-start">
                    <Avatar src={props.vehiculoPrincipal?.imagen ? `${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/${props.vehiculoPrincipal.imagen}` : null} size="sm" radius="xl" />
                    <Box>
                      <Text size="sm" fw={600} lh={1}>{props.vehiculoPrincipal?.vehiculoInstancia?.plantilla?.marca} {props.vehiculoPrincipal?.vehiculoInstancia?.plantilla?.modelo} {props.vehiculoPrincipal?.vehiculoInstancia?.placa}</Text>
                    </Box>
                  </Group>
                </UnstyledButton>
              }
              {props.vehiculoRemolque &&
                <UnstyledButton onClick={() => router.push(`/superuser/flota/activos/${props.vehiculoRemolque.id}`)}>
                  <Group key={props.vehiculoRemolque.id} wrap="nowrap" align="flex-start">
                    <Avatar src={props.vehiculoRemolque?.imagen ? `${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/${props.vehiculoRemolque.imagen}` : null} size="sm" radius="xl" />
                    <Box>
                      <Text size="sm" fw={600} lh={1}>{props.vehiculoRemolque?.remolqueInstancia?.plantilla?.marca} {props.vehiculoRemolque?.remolqueInstancia?.plantilla?.modelo} {props.vehiculoRemolque?.remolqueInstancia?.placa}</Text>
                    </Box>
                  </Group>
                </UnstyledButton>
              }
              {props.maquinaria &&
                <UnstyledButton onClick={() => router.push(`/superuser/flota/activos/${props.maquinaria.id}`)}>
                  <Group key={props.maquinaria.id} wrap="nowrap" align="flex-start">
                    <Avatar src={props.maquinaria?.imagen ? `${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/${props.maquinaria.imagen}` : null} size="sm" radius="xl" />
                    <Box>
                      <Text size="sm" fw={600} lh={1}>{props.maquinaria?.maquinaInstancia?.plantilla?.marca} {props.maquinaria?.maquinaInstancia?.plantilla?.modelo} {props.maquinaria?.maquinaInstancia?.placa}</Text>
                    </Box>
                  </Group>
                </UnstyledButton>
              }
            </Stack>
            <Text size="10px" tt="uppercase" fw={700} c="dimmed" mt={4}>Personal</Text>
            <UnstyledButton onClick={() => router.push(`/superuser/rrhh/empleados/${props.chofer.id}`)}>
              <Group key={props.id} wrap="nowrap" align="flex-start">
                <Avatar src={props.chofer?.imagen ? `${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/${props.chofer.imagen}` : null} size="sm" radius="xl" />
                <Box>
                  <Text size="sm" fw={600} lh={1}>{props.chofer?.nombre} {props.chofer?.apellido}</Text>
                </Box>
              </Group>
            </UnstyledButton>
            <UnstyledButton onClick={() => router.push(`/superuser/rrhh/empleados/${props.ayudante.id}`)}>
              <Group key={props.id} wrap="nowrap" align="flex-start">
                <Avatar src={props.ayudante?.imagen ? `${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/${props.ayudante.imagen}` : null} size="sm" radius="xl" />
                <Box>
                  <Text size="sm" fw={600} lh={1}>{props.ayudante?.nombre} {props.ayudante?.apellido}</Text>
                </Box>
              </Group>
            </UnstyledButton>
          </Stack>
        );
      } else if (isManualGroup) {
        content = (
          <Stack gap="xs" p={4} w={280}>
            <Group justify="space-between">
              <Group gap={5}>
                <IconClipboardText size={16} />
                <Text fw={700} size="sm">Trabajo en Base</Text>
              </Group>
              <Badge color="teal">{props.total} Personas</Badge>
            </Group>
            <Divider />
            <Stack gap="sm">
              {props.registros.map((reg) => (
                reg.observaciones !== "Dia de descanso" && <UnstyledButton key={reg.id} onClick={() => router.push(`/superuser/rrhh/empleados/${reg.Empleado.id}`)}>
                  <Group key={reg.id} wrap="nowrap" align="flex-start">
                    <Avatar src={reg.Empleado?.imagen ? `${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/${reg.Empleado.imagen}` : null} size="sm" radius="xl" />
                    <Box>
                      <Text size="sm" fw={600} lh={1}>{reg.Empleado?.nombre} {reg.Empleado?.apellido}</Text>
                      <Text size="xs" c="dimmed">
                        {reg.horas}h • {reg.observaciones || 'Sin obs.'}
                      </Text>
                    </Box>
                  </Group>
                </UnstyledButton>
              ))}
            </Stack>
          </Stack>
        );
      }

      return (
        <ScrollArea.Autosize mah={300} type="auto" scrollbars="y">
          {content}
        </ScrollArea.Autosize>
      )
    };

    return (
      <HoverCard
        width={300}
        shadow="md"
        withinPortal
        withArrow
        openDelay={100}
        zIndex={1001}
        position="right"
        offset={10}
      >
        <HoverCard.Target>
          <Box style={{ width: '100%', height: '100%', overflow: 'hidden', padding: '2px 4px' }}>
            <Text size="10px" fw={700} c="white" truncate style={{ lineHeight: 1.2 }}>
              {isODT ? `#${props.nroODT} ${props.cliente?.nombre}` : `Trabajo en Base (${props.total})`}
            </Text>

            {isODT && (
              <Box mt={2}>
                <Text size="9px" c="white" lineClamp={1} style={{ opacity: 0.85, lineHeight: 1.1, marginBottom: 2 }}>
                  {props.descripcionServicio}
                </Text>
                <Stack gap={1}>
                  {props.vehiculoPrincipal && <VehiculoLine activo={props.vehiculoPrincipal} />}
                  {props.vehiculoRemolque && <VehiculoLine activo={props.vehiculoRemolque} />}
                  {props.maquinaria && <VehiculoLine activo={props.maquinaria} />}
                </Stack>
              </Box>
            )}

            {isManualGroup && (
              <Box mt={2}>
                <Group gap={4} mb={2}>
                  <IconUsers size={10} color="white" />
                  <Text size="9px" c="white">Personal asignado:</Text>
                </Group>
                <Text size="9px" c="white" lineClamp={3} style={{ opacity: 0.9, lineHeight: 1.2 }}>
                  {props.registros.map(r => r.Empleado?.nombre).join(', ')}
                </Text>
              </Box>
            )}
          </Box>
        </HoverCard.Target>
        <HoverCard.Dropdown style={{ overflow: 'hidden', padding: 0 }}>
          <Box p="xs">
            <HoverContent />
          </Box>
        </HoverCard.Dropdown>
      </HoverCard>
    );
  };

  if (loading) return <Container h="100vh" p="xl"><Loader /></Container>;

  return (
    <Container size="xl" p="md" style={{ height: 'calc(100vh - 60px)', display: 'flex', flexDirection: 'column' }}>

      {/* HEADER RESPONSIVE */}
      <Box mb="sm">
        {/* VISTA DESKTOP (> sm) */}
        <Group justify="space-between" visibleFrom="sm">
          <Button variant="default" size="xs" onClick={() => router.back()} leftSection={<IconArrowLeft size={16} />}>Volver</Button>
          <Title order={3}>Pizarra Semanal</Title>
          <Group gap="xs">
            <Button variant="default" size="xs" onClick={() => calendarRef.current?.getApi().prev()}><IconChevronLeft size={16} /></Button>
            <Button variant="default" size="xs" onClick={() => calendarRef.current?.getApi().today()}>Esta Semana</Button>
            <Button variant="default" size="xs" onClick={() => calendarRef.current?.getApi().next()}><IconChevronRight size={16} /></Button>
            <Button onClick={() => router.push('/superuser/odt/nuevo')} size="xs">Nueva ODT</Button>
            <ManualHoursButton />
          </Group>
        </Group>

        {/* VISTA MOVIL (< sm) */}
        <Stack gap="xs" hiddenFrom="sm">
          <Group justify="space-between" align="center">
            {/* Botón volver solo icono */}
            <Button variant="default" size="xs" p={0} w={32} h={32} onClick={() => router.back()}>
              <IconArrowLeft size={18} />
            </Button>

            {/* Título centrado */}
            <Title order={4} style={{ textAlign: 'center' }}>Pizarra</Title>

            {/* Espacio vacío para equilibrar el header y que el título quede realmente en el medio */}
            <Box w={32} />
          </Group>

          {/* Botones de acción en una segunda fila */}
          <Group grow>
            <Button onClick={() => router.push('/superuser/odt/nuevo')} size="xs">Nueva ODT</Button>
            <ManualHoursButton />
          </Group>
        </Stack>
      </Box>

      {/* CALENDARIO */}
      <Box visibleFrom="sm" style={{ flex: 1, minHeight: 0 }}>
        <Paper shadow="sm" p={0} radius="md" withBorder style={{ height: '100%' }}>
          <FullCalendar
            ref={calendarRef}
            plugins={[timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            headerToolbar={false}
            locale={esLocale}
            firstDay={6}
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
            eventDisplay="block"
          />
        </Paper>
      </Box>

      {/* MÓVIL */}
      <Box hiddenFrom="sm">
        <MobileAgendaView events={events} router={router} />
      </Box>
    </Container>
  );
}

// ==========================================
// 3. VISTA MÓVIL
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

  if (dates.length === 0) return <Text c="dimmed" ta="center" mt="xl">No hay operaciones.</Text>;

  return (
    <Stack gap="lg" pb="xl">
      {dates.map((dateKey) => (
        <Box key={dateKey}>
          <Box bg="gray.1" p="sm" style={{ position: "sticky", top: 0, zIndex: 10, borderBottom: "1px solid var(--mantine-color-gray-3)" }}>
            <Group>
              <IconCalendarEvent size={20} className="text-gray-600" />
              <Text fw={700} tt="capitalize" size="lg">
                {format(parse(dateKey, "yyyy-MM-dd", new Date()), "EEEE, d 'de' MMMM", { locale: es })}
              </Text>
            </Group>
          </Box>

          <Stack gap="md" p="xs">
            {grouped[dateKey].map((ev) => {
              const isODT = ev.tipo === "odt";
              const isGroup = ev.tipo === "manual-group";
              const props = ev.extendedProps;
              const startTime = new Date(ev.start);
              const endTime = new Date(ev.end);

              if (isGroup) {
                return (
                  <Card key={ev.id} shadow="sm" radius="md" withBorder style={{ borderLeft: '4px solid var(--mantine-color-teal-filled)' }}>
                    <Group justify="space-between" mb="xs">
                      <Group gap="xs">
                        <IconClipboardText size={18} color="teal" />
                        <Text fw={700} size="sm" c="teal">Trabajo en Base</Text>
                      </Group>
                      <Badge color="teal" variant="light">8:00 - 16:00</Badge>
                    </Group>
                    <Text size="sm" mb="sm" fw={600}>{props.total} Empleados en planta:</Text>
                    <Stack gap="xs">
                      {props.registros.map(reg => (
                        <UnstyledButton onClick={() => router.push(`/superuser/rrhh/empleados/${reg.Empleado.id}`)} key={reg.id} style={{ width: '100%' }}>
                          <Group justify="space-between">
                            <Group gap="xs">
                              <Avatar src={reg.Empleado?.imagen ? `${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/${reg.Empleado.imagen}` : null} size={24} radius="xl" />
                              <Text size="sm">{reg.Empleado?.nombre} {reg.Empleado?.apellido}</Text>
                              <Text size="xs" c="dimmed">• {reg.observaciones || 'Sin obs.'}</Text>
                            </Group>
                            <Text size="xs" c="dimmed">{reg.horas}h</Text>
                          </Group>
                        </UnstyledButton>
                      ))}
                    </Stack>
                  </Card>
                )
              }

              return (
                <Card key={ev.id} shadow="sm" radius="md" withBorder onClick={() => router.push(`/superuser/odt/${props.id}`)} style={{ cursor: "pointer" }}>
                  <Group justify="space-between" mb="xs" align="start">
                    <Box>
                      <Badge color={props.maquinariaId ? "orange" : "blue"} variant="light" mb={4}>ODT #{props.nroODT}</Badge>
                      <Text fw={700} size="md" lineClamp={1}>{props.cliente?.nombre}</Text>
                    </Box>
                    <Stack gap={0} align="flex-end">
                      <Text size="xs" fw={700} c="dimmed">{format(startTime, "HH:mm")}</Text>
                      <Text size="xs" c="dimmed">{format(endTime, "HH:mm")}</Text>
                    </Stack>
                  </Group>
                  <Text size="sm" c="dimmed" lineClamp={2} mb="md" style={{ lineHeight: 1.3 }}>{props.descripcionServicio}</Text>
                  <Divider mb="xs" variant="dashed" />
                  <Stack gap="xs">
                    {props.vehiculoPrincipal && <VehiculoLineMobile activo={props.vehiculoPrincipal} icon={<IconSteeringWheel size={14} />} />}
                    {props.vehiculoRemolque && <VehiculoLineMobile activo={props.vehiculoRemolque} />}
                    {props.maquinaria && <VehiculoLineMobile activo={props.maquinaria} icon={<IconTool size={14} />} color="orange" />}
                    <UnstyledButton onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/superuser/rrhh/empleados/${props.chofer.id}`)
                    }
                    } style={{ width: '100%' }}>
                      <Group justify="space-between">
                        <Group gap="xs">
                          <Avatar src={props.chofer?.imagen ? `${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/${props.chofer.imagen}` : null} size={24} radius="xl" />
                          <Text size="sm">{props.chofer?.nombre} {props.chofer?.apellido}</Text>
                          <Text size="xs" c="dimmed">• {props.observaciones || 'Sin obs.'}</Text>
                        </Group>
                        <Text size="xs" c="dimmed">{props.horas}h</Text>
                      </Group>
                    </UnstyledButton>
                    <UnstyledButton onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/superuser/rrhh/empleados/${props.ayudante.id}`)
                    }
                    }
                      style={{ width: '100%' }}>
                      <Group justify="space-between">
                        <Group gap="xs">
                          <Avatar src={props.ayudante?.imagen ? `${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/${props.ayudante.imagen}` : null} size={24} radius="xl" />
                          <Text size="sm">{props.ayudante?.nombre} {props.ayudante?.apellido}</Text>
                          <Text size="xs" c="dimmed">• {props.observaciones || 'Sin obs.'}</Text>
                        </Group>
                        <Text size="xs" c="dimmed">{props.horas}h</Text>
                      </Group>
                    </UnstyledButton>
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