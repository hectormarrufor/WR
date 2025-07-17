// app/superuser/operaciones-campo/[id]/page.js
'use client';

import { useEffect, useState, Suspense } from 'react';
import { Container, Title, Text, Center, Loader, Tabs, Paper, Flex, Badge, Group, ActionIcon, Tooltip } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useRouter, useSearchParams } from 'next/navigation'; // Importa useSearchParams
import { IconCar, IconClipboardList, IconHammer, IconFileInvoice, IconEdit, IconArrowLeft } from '@tabler/icons-react';
import { VehiculosAsignadosTable } from '../componentes/VehiculosAsignadosTable';
import { RenglonesOperacionTable } from '../componentes/RenglonesOperacionTable';
import { TrabajosExtraTable } from '../componentes/TrabajosExtraTable';
import { OrdenesCompraOperacionTable } from '../componentes/OrdenesCompraOperacionTable';

export default function OperacionCampoDetailPage({ params }) {
  const { id } = params; // ID de la operación
  const router = useRouter();
  const searchParams = useSearchParams();
  const [operacionData, setOperacionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Controla la pestaña activa usando el query param 'tab'
  const currentTab = searchParams.get('tab') || 'general'; // 'general' es la pestaña por defecto

  const handleTabChange = (value) => {
    router.replace(`/superuser/operaciones-campo/${id}?tab=${value}`, undefined, { shallow: true });
  };

  useEffect(() => {
    const fetchOperacion = async () => {
      if (!id) return;
      setLoading(true);
      try {
        // Tu API GET para una operación individual debe incluir los datos del contrato
        // y opcionalmente los datos de sus relaciones (vehiculosAsignados, renglones, etc.)
        // Si no los incluyes aquí, cada sub-componente de tabla los fetcherá individualmente.
        const response = await fetch(`/api/contratos/operaciones-campo/${id}`);
        if (!response.ok) {
          throw new Error(`Error al cargar los datos de la operación: ${response.statusText}`);
        }
        const data = await response.json();
        setOperacionData(data);
      } catch (err) {
        console.error('Failed to fetch operacion details:', err);
        setError(err);
        notifications.show({
          title: 'Error',
          message: `No se pudo cargar los detalles de la operación: ${err.message}`,
          color: 'red',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchOperacion();
  }, [id]);

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Center style={{ height: '300px' }}>
          <Loader size="lg" />
          <Text ml="md">Cargando detalles de la operación...</Text>
        </Center>
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="xl" py="xl">
        <Center style={{ height: '300px' }}>
          <Text color="red">Error: {error.message}</Text>
        </Center>
      </Container>
    );
  }

  if (!operacionData) {
    return (
      <Container size="xl" py="xl">
        <Center style={{ height: '300px' }}>
          <Text>Operación no encontrada.</Text>
        </Center>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Flex align="center" justify="space-between" mb="lg">
        <Group>
          <Tooltip label="Volver al Listado">
            <ActionIcon variant="light" size="lg" onClick={() => router.push('/superuser/operaciones-campo')}>
              <IconArrowLeft size={24} />
            </ActionIcon>
          </Tooltip>
          <Title order={2}>
            Detalles de Operación: {operacionData.nombre || `Operación #${operacionData.id}`}
          </Title>
        </Group>
        <Tooltip label="Editar datos principales de la Operación">
          <ActionIcon
            variant="filled"
            color="blue"
            size="lg"
            onClick={() => router.push(`/superuser/operaciones-campo/${id}/editar`)}
          >
            <IconEdit size={20} />
          </ActionIcon>
        </Tooltip>
      </Flex>

      {/* Información principal de la operación */}
      <Paper withBorder shadow="md" p="md" mb="xl">
        <Grid gutter="xs">
          <Grid.Col span={6}>
            <Text fw={700}>Contrato Asociado:</Text>
            <Text>{operacionData.contrato?.numeroContrato || 'N/A'}</Text>
          </Grid.Col>
          <Grid.Col span={6}>
            <Text fw={700}>Tipo de Operación:</Text>
            <Text>{operacionData.tipoOperacion}</Text>
          </Grid.Col>
          <Grid.Col span={6}>
            <Text fw={700}>Fecha de Inicio:</Text>
            <Text>{new Date(operacionData.fechaInicio).toLocaleDateString()}</Text>
          </Grid.Col>
          <Grid.Col span={6}>
            <Text fw={700}>Fecha Fin Estimada:</Text>
            <Text>{operacionData.fechaFinEstimada ? new Date(operacionData.fechaFinEstimada).toLocaleDateString() : 'N/A'}</Text>
          </Grid.Col>
          <Grid.Col span={12}>
            <Text fw={700}>Estado:</Text>
            <Badge color={
              operacionData.estado === 'Finalizada' ? 'green' :
              operacionData.estado === 'En Progreso' ? 'blue' :
              operacionData.estado === 'Cancelada' ? 'red' :
              'gray'
            }>
              {operacionData.estado}
            </Badge>
          </Grid.Col>
          <Grid.Col span={12}>
            <Text fw={700}>Descripción:</Text>
            <Text>{operacionData.descripcion || 'Sin descripción'}</Text>
          </Grid.Col>
        </Grid>
      </Paper>

      {/* Pestañas para sub-módulos */}
      <Tabs value={currentTab} onChange={handleTabChange} defaultValue="general" variant="outline">
        <Tabs.List>
          <Tabs.Tab value="general" leftSection={<IconClipboardList size={20} />}>
            General
          </Tabs.Tab>
          <Tabs.Tab value="vehiculos" leftSection={<IconCar size={20} />}>
            Vehículos Asignados
          </Tabs.Tab>
          <Tabs.Tab value="renglones" leftSection={<IconClipboardList size={20} />}>
            Renglones
          </Tabs.Tab>
          <Tabs.Tab value="trabajos-extra" leftSection={<IconHammer size={20} />}>
            Trabajos Extra
          </Tabs.Tab>
          <Tabs.Tab value="ordenes-compra" leftSection={<IconFileInvoice size={20} />}>
            Órdenes de Compra
          </Tabs.Tab>
        </Tabs.List>

        <Paper withBorder shadow="md" p="md" mt="md">
            <Suspense fallback={<Center style={{ height: '200px' }}><Loader /><Text ml="md">Cargando sub-módulo...</Text></Center>}>
                <Tabs.Panel value="general" pt="xs">
                    <Text>Esta sección puede mostrar un resumen de la operación o campos adicionales no mostrados arriba.</Text>
                    {/* Aquí puedes añadir más detalles o un dashboard específico de la operación */}
                </Tabs.Panel>

                <Tabs.Panel value="vehiculos" pt="xs">
                    <Title order={3} mb="md">Vehículos Asignados</Title>
                    <VehiculosAsignadosTable operacionId={id} />
                    {/* <Text color="dimmed"> (Aquí irá el componente para gestionar Vehículos Asignados) </Text> */}
                </Tabs.Panel>

                <Tabs.Panel value="renglones" pt="xs">
                    <Title order={3} mb="md">Renglones de la Operación</Title>
                    <RenglonesOperacionTable operacionId={id} />
                </Tabs.Panel>

                <Tabs.Panel value="trabajos-extra" pt="xs">
                    <Title order={3} mb="md">Trabajos Extra</Title>
                    <TrabajosExtraTable operacionId={id} />
                    {/* <Text color="dimmed"> (Aquí irá el componente para gestionar Trabajos Extra) </Text> */}
                </Tabs.Panel>

                <Tabs.Panel value="ordenes-compra" pt="xs">
                    <Title order={3} mb="md">Órdenes de Compra Asociadas</Title>
                    <OrdenesCompraOperacionTable operacionId={id} />
                    {/* <Text color="dimmed"> (Aquí irá el componente para gestionar Órdenes de Compra) </Text> */}
                </Tabs.Panel>
            </Suspense>
        </Paper>
      </Tabs>
    </Container>
  );
}