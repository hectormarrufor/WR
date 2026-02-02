"use client";

import { useEffect, useState } from "react";
import {
  Container, Paper, Title, Text, Group, Grid,
  Avatar, Badge, ThemeIcon, Stack, Divider,
  Button, LoadingOverlay, Box, Timeline, SimpleGrid
} from "@mantine/core";
import {
  IconUser, IconTruck, IconClock, IconCalendar,
  IconMapPin, IconPhone, IconPencil, IconArrowLeft,
  IconBuildingSkyscraper, IconUserBolt
} from "@tabler/icons-react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function ODTDetailPage() {
  const { id } = useParams(); // Hook para obtener ID en Client Component
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
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingOverlay visible={true} overlayProps={{ radius: "sm", blur: 2 }} />;
  if (!odt) return <Text>No se encontró la ODT</Text>;

  // Helpers visuales
  const getImageUrl = (img) => img ? `${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/${img}` : null;
  const totalHoras = odt.HorasTrabajadas?.reduce((acc, curr) => acc + parseFloat(curr.horas), 0) || 0;

  return (
    <Container size="xl" py="xl">

      {/* --- CABECERA --- */}
      <Group justify="space-between" mb="lg">
        <Button
          variant="subtle"
          color="gray"
          leftSection={<IconArrowLeft size={18} />}
          onClick={() => router.back()}
        >
          Volver
        </Button>
        {isAdmin && (
          <Button
            leftSection={<IconPencil size={18} />}
            onClick={() => router.push(`/superuser/odt/${id}/editar`)} // Asumiendo que tu form maneja query params o ruta de edición
          >
            Editar ODT
          </Button>
        )}
      </Group>

      <Paper shadow="xs" p="xl" radius="md" withBorder mb="xl" bg="var(--mantine-color-blue-light)">
        <Group justify="space-between" align="flex-start">
          <Box>
            <Group gap="xs" mb={5}>
              <Badge size="lg" variant="filled" color="blue">ODT #{odt.nroODT}</Badge>
              <Badge size="lg" variant="white" color="gray">{new Date(odt.fecha).toLocaleDateString()}</Badge>
            </Group>
            <Title order={2} mt="xs">Servicio de Transporte</Title>
            <Text c="dimmed" mt={5} maw={600}>{odt.descripcionServicio}</Text>
          </Box>
          <Stack align="flex-end" gap={0}>
            <Text size="sm" c="dimmed" tt="uppercase" fw={700}>Horario</Text>
            <Text size="xl" fw={900} variant="gradient" gradient={{ from: 'blue', to: 'cyan', deg: 90 }}>
              {odt.horaLlegada.substring(0, 5)} - {odt.horaSalida.substring(0, 5)}
            </Text>
          </Stack>
        </Group>
      </Paper>

      {/* --- GRID PRINCIPAL (Bento Layout) --- */}
      <Grid gutter="md">

        {/* COLUMNA IZQUIERDA: Cliente y Personal (4 columnas desktop) */}
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Stack>
            {/* CLIENTE CARD */}
            <Paper shadow="sm" p="md" radius="md" withBorder>
              <Group mb="md">
                <ThemeIcon color="grape" variant="light" size="lg"><IconBuildingSkyscraper size={20} /></ThemeIcon>
                <Text fw={700} size="lg">Cliente</Text>
              </Group>

              <Stack align="center" gap="xs" mb="md">
                <Avatar
                  src={getImageUrl(odt.cliente?.imagen)}
                  size={80}
                  radius="xl"
                  alt={odt.cliente?.nombre}
                />
                <Text fw={700} size="xl">{odt.cliente?.nombre}</Text>
                <Badge variant="outline">{odt.cliente?.identificacion || "S/I"}</Badge>
              </Stack>

              <Divider my="sm" />
              <Stack gap="xs">
                {odt.cliente?.telefono && (
                  <Group gap="xs">
                    <IconPhone size={16} color="gray" />
                    <Text size="sm">{odt.cliente.telefono}</Text>
                  </Group>
                )}
                {odt.cliente?.direccion && (
                  <Group gap="xs">
                    <IconMapPin size={16} color="gray" />
                    <Text size="sm" lineClamp={2}>{odt.cliente.direccion}</Text>
                  </Group>
                )}
              </Stack>
            </Paper>


          </Stack>
        </Grid.Col>

        {/* COLUMNA DERECHA: Activos y Trazabilidad (8 columnas desktop) */}
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Stack>

            {/* PERSONAL CARD */}
            <Paper shadow="sm" p="md" radius="md" withBorder>
              <Group mb="md">
                <ThemeIcon color="orange" variant="light" size="lg"><IconUserBolt size={20} /></ThemeIcon>
                <Text fw={700} size="lg">Personal Asignado</Text>
              </Group>

              <Stack gap="md">
                {/* Chofer */}
                {odt.chofer ? (
                  <Group wrap="nowrap">
                    <Avatar src={getImageUrl(odt.chofer.imagen)} size="md" radius="xl" />
                    <Box style={{ flex: 1 }}>
                      <Text size="sm" fw={600}>{odt.chofer.nombre} {odt.chofer.apellido}</Text>
                      <Text size="xs" c="dimmed">Chofer Principal • V-{odt.chofer.cedula}</Text>
                    </Box>
                  </Group>
                ) : (
                  <Text size="sm" c="dimmed" fs="italic">Sin Chofer asignado</Text>
                )}

                <Divider variant="dashed" />

                {/* Ayudante */}
                {odt.ayudante ? (
                  <Group wrap="nowrap">
                    <Avatar src={getImageUrl(odt.ayudante.imagen)} size="md" radius="xl" />
                    <Box style={{ flex: 1 }}>
                      <Text size="sm" fw={600}>{odt.ayudante.nombre} {odt.ayudante.apellido}</Text>
                      <Text size="xs" c="dimmed">Ayudante • V-{odt.ayudante.cedula}</Text>
                    </Box>
                  </Group>
                ) : (
                  <Text size="sm" c="dimmed" fs="italic">Sin Ayudante asignado</Text>
                )}
              </Stack>
            </Paper>

            {/* ACTIVOS CARD */}
            <Paper shadow="sm" p="md" radius="md" withBorder>
              <Group mb="md">
                <ThemeIcon color="blue" variant="light" size="lg"><IconTruck size={20} /></ThemeIcon>
                <Text fw={700} size="lg">Flota y Equipos</Text>
              </Group>

              <SimpleGrid cols={{ base: 1, sm: 3 }}>
                {/* Vehículo Principal */}
                {odt.vehiculoPrincipal && (
                  <CardActivo
                    titulo="Principal"
                    codigo={odt.vehiculoPrincipal.codigoInterno}
                    tipo={odt.vehiculoPrincipal.tipoActivo}
                    img={getImageUrl(odt.vehiculoPrincipal.imagen)}
                  />
                )}

                {/* Remolque */}
                {odt.vehiculoRemolque && (
                  <CardActivo
                    titulo="Remolque"
                    codigo={odt.vehiculoRemolque.codigoInterno}
                    tipo={odt.vehiculoRemolque.tipoActivo}
                    img={getImageUrl(odt.vehiculoRemolque.imagen)}
                  />
                )}

                {/* Maquinaria */}
                {odt.maquinaria && (
                  <CardActivo
                    titulo="Maquinaria"
                    codigo={odt.maquinaria.codigoInterno}
                    tipo={odt.maquinaria.tipoActivo}
                    img={getImageUrl(odt.maquinaria.imagen)}
                  />
                )}
              </SimpleGrid>

              {!odt.vehiculoPrincipal && !odt.maquinaria && (
                <Text c="dimmed" ta="center" py="lg">No hay activos vinculados a esta ODT.</Text>
              )}
            </Paper>

          </Stack>
        </Grid.Col>
      </Grid>
    </Container>
  );
}

// Subcomponente para las tarjetas de activos (para no repetir código)
function CardActivo({ titulo, codigo, tipo, img }) {
  return (
    <Paper withBorder p="sm" radius="md" bg="var(--mantine-color-gray-0)">
      <Group wrap="nowrap">
        <Avatar src={img} radius="md" size="md" color="blue">
          <IconTruck size={20} />
        </Avatar>
        <Box>
          <Text size="xs" tt="uppercase" c="dimmed" fw={700}>{titulo}</Text>
          <Text fw={600} size="sm">{codigo}</Text>
          <Badge size="xs" variant="transparent" p={0}>{tipo}</Badge>
        </Box>
      </Group>
    </Paper>
  );
}