"use client";

import { useEffect, useState } from "react";
import {
  Container, Paper, Title, Text, Group, Grid,
  Avatar, Badge, ThemeIcon, Stack, Divider,
  Button, LoadingOverlay, Box, SimpleGrid,
  Timeline, RingProgress, ActionIcon, Tooltip, Card,
  rem, Image
} from "@mantine/core";
import {
  IconUser, IconTruck, IconClock, IconCalendar,
  IconMapPin, IconPhone, IconPencil, IconArrowLeft,
  IconBuildingSkyscraper, IconUserBolt, IconSteeringWheel,
  IconTool, IconCheck, IconX, IconFlag,
  IconBarrierBlock,
  IconLogout
} from "@tabler/icons-react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

// --- HELPERS VISUALES ---
const getStatusColor = (estado) => {
  switch (estado) {
    case 'Finalizada': return 'green';
    case 'En Curso': return 'blue';
    case 'Cancelada': return 'red';
    default: return 'gray';
  }
};

const formatTime = (time) => time ? time.substring(0, 5) : '--:--';

export default function ODTDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { isAdmin } = useAuth();
  const [odt, setOdt] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/odts/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setOdt(data);
        console.log("ODT Data:", data); // Debug: Verificar estructura de datos
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingOverlay visible={true} overlayProps={{ radius: "sm", blur: 2 }} />;
  if (!odt) return (
    <Container size="sm" py="xl">
      <Paper p="xl" withBorder ta="center">
        <IconX size={50} color="red" style={{ margin: 'auto' }} />
        <Title order={3} mt="md">ODT no encontrada</Title>
        <Button mt="md" onClick={() => router.back()}>Volver</Button>
      </Paper>
    </Container>
  );

  const getImageUrl = (img) => img ? `${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/${img}` : null;

  return (
    <Container size="xl" py="lg" style={{ background: 'var(--mantine-color-gray-0)', minHeight: '100vh' }}>

      {/* --- HEADER FLOTANTE --- */}
      <Paper shadow="sm" radius="md" p="md" mb="lg" withBorder style={{ borderTop: `4px solid var(--mantine-color-${getStatusColor(odt.estado)}-6)` }}>
        <Group justify="space-between">
          <Group>
            <ActionIcon variant="light" color="gray" size="lg" onClick={() => router.back()}>
              <IconArrowLeft size={20} />
            </ActionIcon>
            <Box>
              <Group gap="xs" align="center">
                <Title order={2} c="dark.8">ODT #{odt.nroODT}</Title>
                <Badge size="lg" variant="light" color={getStatusColor(odt.estado)}>{odt.estado}</Badge>
              </Group>
              <Group gap="xs" c="dimmed" mt={4}>
                <IconCalendar size={14} />
                <Text size="sm">{new Date(odt.fecha).toLocaleDateString('es-VE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</Text>
              </Group>
            </Box>
          </Group>

          {isAdmin && odt.estado !== 'Finalizada' && (
            <Button
              leftSection={<IconPencil size={18} />}
              variant="filled"
              color="dark"
              onClick={() => router.push(`/superuser/odt/${id}/editar`)}
            >
              Editar ODT
            </Button>
          )}
        </Group>
      </Paper>

      <Grid gutter="md">

        {/* === COLUMNA IZQUIERDA (Info Operativa) === */}
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Stack gap="md">

            {/* 1. TIMELINE DE SERVICIO (La joya visual) */}
            <Paper shadow="sm" radius="md" p="xl" withBorder>
              <Group justify="space-between" mb="xl">
                <Group gap="xs">
                  <ThemeIcon color="blue" variant="light" size="lg"><IconClock size={20} /></ThemeIcon>
                  <Title order={4}>Cronología Operativa</Title>
                </Group>
                <Badge variant="outline" color="gray">Trazabilidad Total</Badge>
              </Group>

              <Timeline active={odt.horaSalida ? 5 : 2} bulletSize={30} lineWidth={2}>

                {/* 1. PERSONAL ENTRADA BASE */}
                <Timeline.Item
                  bullet={<IconUser size={16} />}
                  title="Personal en Base (Entrada)"
                  color="cyan"
                >
                  <Text c="dimmed" size="xs">Ingreso del operador a instalaciones</Text>
                  <Text size="sm" fw={600} mt={2}>
                    {odt.choferEntradaBase ? formatTime(odt.choferEntradaBase) : <Text span c="dimmed" fs="italic">No definido</Text>}
                  </Text>
                </Timeline.Item>

                {/* 2. EQUIPOS SALIDA BASE (NUEVO) */}
                <Timeline.Item
                  bullet={<IconTruck size={16} />}
                  title="Salida de Flota (Base)"
                  color="blue"
                >
                  <Text c="dimmed" size="xs">Salida de equipos por portón</Text>
                  <Text size="sm" fw={700} mt={2} c="blue.8">
                    {odt.salidaActivosBase ? formatTime(odt.salidaActivosBase) : <Text span c="dimmed" fs="italic">No definido</Text>}
                  </Text>
                </Timeline.Item>

                {/* 3. LLEGADA SITIO */}
                <Timeline.Item
                  bullet={<IconMapPin size={16} />}
                  title="Llegada al Cliente"
                  color="teal"
                >
                  <Text c="dimmed" size="xs">Inicio de labores en sitio</Text>
                  <Badge variant="dot" size="md" mt={2} color="teal">
                    {formatTime(odt.horaLlegada)}
                  </Badge>
                </Timeline.Item>

                {/* 4. SALIDA SITIO */}
                <Timeline.Item
                  bullet={<IconFlag size={16} />}
                  title="Fin de Labores (Sitio)"
                  lineVariant="dashed"
                  color="orange"
                >
                  <Text c="dimmed" size="xs">Retorno desde el cliente</Text>
                  <Badge variant="dot" size="md" mt={2} color="orange">
                    {formatTime(odt.horaSalida)}
                  </Badge>
                </Timeline.Item>

                {/* 5. EQUIPOS LLEGADA BASE (NUEVO) */}
                <Timeline.Item
                  bullet={<IconBarrierBlock size={16} />}
                  title="Retorno de Flota (Base)"
                  color="indigo"
                >
                  <Text c="dimmed" size="xs">Entrada de equipos por portón</Text>
                  <Text size="sm" fw={700} mt={2} c="indigo.8">
                    {odt.llegadaActivosBase ? formatTime(odt.llegadaActivosBase) : <Text span c="dimmed" fs="italic">No definido</Text>}
                  </Text>
                </Timeline.Item>

                {/* 6. PERSONAL SALIDA BASE */}
                <Timeline.Item
                  bullet={<IconLogout size={16} />}
                  title="Personal Salida (Base)"
                  color="gray"
                >
                  <Text c="dimmed" size="xs">Fin de jornada del operador</Text>
                  <Text size="sm" fw={600} mt={2}>
                    {odt.choferSalidaBase ? formatTime(odt.choferSalidaBase) : <Text span c="dimmed" fs="italic">No definido</Text>}
                  </Text>
                </Timeline.Item>
              </Timeline>
            </Paper>
            {/* 2. EQUIPO DE TRABAJO (Personal) */}
            <Title order={5} c="dimmed" tt="uppercase" ls={1} mt="sm">Personal Asignado</Title>
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              {/* Chofer Card */}
              <EmployeeCard
                role="Operador / Chofer"
                data={odt.chofer}
                times={{ entrada: odt.choferEntradaBase, salida: odt.choferSalidaBase }}
                icon={<IconSteeringWheel size={18} />}
                getImageUrl={getImageUrl}
              />

              {/* Ayudante Card */}
              <EmployeeCard
                role="Ayudante"
                data={odt.ayudante}
                times={{ entrada: odt.ayudanteEntradaBase, salida: odt.ayudanteSalidaBase }}
                icon={<IconUserBolt size={18} />}
                getImageUrl={getImageUrl}
              />
            </SimpleGrid>

            {/* 3. FLOTA (Activos) */}
            <Title order={5} c="dimmed" tt="uppercase" ls={1} mt="sm">Flota Vinculada</Title>
            <Paper shadow="sm" radius="md" p="md" withBorder>
              <SimpleGrid cols={{ base: 1, sm: 3 }}>
                {odt.vehiculoPrincipal && (
                  <AssetCard title="Vehículo" data={odt.vehiculoPrincipal} getImageUrl={getImageUrl} />
                )}
                {odt.vehiculoRemolque && (
                  <AssetCard title="Remolque" data={odt.vehiculoRemolque} getImageUrl={getImageUrl} type="remolque" />
                )}
                {odt.maquinaria && (
                  <AssetCard title="Maquinaria" data={odt.maquinaria} getImageUrl={getImageUrl} type="maquina" />
                )}

                {!odt.vehiculoPrincipal && !odt.maquinaria && (
                  <Text c="dimmed" ta="center" fs="italic" w="100%">No se asignaron activos.</Text>
                )}
              </SimpleGrid>
            </Paper>

          </Stack>
        </Grid.Col>

        {/* === COLUMNA DERECHA (Cliente y Metadatos) === */}
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Stack>
            {/* CLIENTE CARD */}
            <Paper shadow="sm" radius="md" p="xl" withBorder bg="white">
              <Stack align="center" mb="md">
                <Avatar
                  src={getImageUrl(odt.cliente?.imagen)}
                  size={100}
                  radius={100}
                  style={{ border: '4px solid var(--mantine-color-gray-1)' }}
                />
                <div style={{ textAlign: 'center' }}>
                  <Title order={3}>{odt.cliente?.nombre}</Title>
                  <Badge mt={5} variant="dot" size="md">{odt.cliente?.identificacion || 'N/A'}</Badge>
                </div>
              </Stack>

              <Divider my="sm" label="Contacto" labelPosition="center" />

              <Stack gap="sm">
                {odt.cliente?.telefono && (
                  <Group>
                    <ThemeIcon variant="light" color="gray"><IconPhone size={16} /></ThemeIcon>
                    <Text size="sm">{odt.cliente.telefono}</Text>
                  </Group>
                )}
                {odt.cliente?.direccion && (
                  <Group align="flex-start">
                    <ThemeIcon variant="light" color="gray"><IconMapPin size={16} /></ThemeIcon>
                    <Text size="sm" style={{ flex: 1 }}>{odt.cliente.direccion}</Text>
                  </Group>
                )}
              </Stack>
            </Paper>

            {/* METADATOS */}
            <Paper shadow="xs" radius="md" p="md" withBorder bg="transparent">
              <Title order={6} mb="xs">Detalles del Sistema</Title>
              <Stack gap="xs">
                <Group justify="space-between">
                  <Text size="xs" c="dimmed">Creado por:</Text>
                  <Text size="xs" fw={500}>{odt.nombreCreador || 'Sistema'}</Text>
                </Group>
                <Group justify="space-between">
                  <Text size="xs" c="dimmed">Fecha Registro:</Text>
                  <Text size="xs" fw={500}>{new Date(odt.createdAt).toLocaleDateString()}</Text>
                </Group>
                <Group justify="space-between">
                  <Text size="xs" c="dimmed">Última Edición:</Text>
                  <Text size="xs" fw={500}>{new Date(odt.updatedAt).toLocaleDateString()}</Text>
                </Group>
              </Stack>
            </Paper>

          </Stack>
        </Grid.Col>

      </Grid>
    </Container>
  );
}

// --- SUBCOMPONENTES PARA LIMPIEZA ---

function EmployeeCard({ role, data, times, icon, getImageUrl }) {
  if (!data) return (
    <Paper withBorder p="md" radius="md" style={{ borderStyle: 'dashed', borderColor: '#dee2e6' }}>
      <Group c="dimmed">
        <IconUser size={20} />
        <Text size="sm">Sin {role} asignado</Text>
      </Group>
    </Paper>
  );

  return (
    <Paper shadow="sm" radius="md" p="md" withBorder>
      <Group align="flex-start" wrap="nowrap">
        <Avatar src={getImageUrl(data.imagen)} size="lg" radius="md" color="blue" />
        <div style={{ flex: 1 }}>
          <Group justify="space-between" align="start">
            <div>
              <Text size="xs" tt="uppercase" c="dimmed" fw={700} ls={0.5}>{role}</Text>
              <Text fw={700} size="md" lh={1.2}>{data.nombre} {data.apellido}</Text>
              <Text size="xs" c="dimmed">V-{data.cedula}</Text>
            </div>
            <ThemeIcon variant="light" size="sm" color="gray">{icon}</ThemeIcon>
          </Group>

          <Divider my="xs" />

          {/* Tiempos Específicos de Base */}
          <Group grow gap="xs">
            <Box>
              <Text size="9px" c="dimmed" tt="uppercase">Entrada Base</Text>
              <Text size="sm" fw={600} c="blue.7">{formatTime(times.entrada)}</Text>
            </Box>
            <Box>
              <Text size="9px" c="dimmed" tt="uppercase">Salida Base</Text>
              <Text size="sm" fw={600} c="orange.7">{formatTime(times.salida)}</Text>
            </Box>
          </Group>
        </div>
      </Group>
    </Paper>
  );
}

function AssetCard({ title, data, getImageUrl, type }) {
  const icon = type === 'maquina' ? <IconTool size={18} /> : <IconTruck size={18} />;
  const color = type === 'maquina' ? 'orange' : 'blue';

  // Resolver nombre del activo (según tu modelo podría variar)
  const nombre = data.codigoInterno || 'S/C';
  const detalle = data.vehiculoInstancia?.placa || data.maquinaInstancia?.serialVin || '';

  return (
    <Paper withBorder radius="md" overflow="hidden">
      <Box h={80} bg="gray.1" style={{ position: 'relative' }}>
        {data.imagen ? (
          <Image
            src={getImageUrl(data.imagen)}
            alt="Activo"
            style={{ width: '100%', height: '100%', objectFit: 'fit' }}
          />
        ) : (
          <Center h="100%">
            <ThemeIcon variant="light" size={40} color="gray"><IconTruck size={24} /></ThemeIcon>
          </Center>
        )}
        <Badge
          style={{ position: 'absolute', top: 5, right: 5 }}
          color={color}
          variant="filled"
          size="xs"
        >
          {title}
        </Badge>
      </Box>
      <Box p="xs">
        <Text fw={700} size="sm">{nombre}</Text>
        <Text size="xs" c="dimmed" truncate>{detalle}</Text>
      </Box>
    </Paper>
  );
}

// Helper simple para centrar si no hay imagen
import { Center } from "@mantine/core";