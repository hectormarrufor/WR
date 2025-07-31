// app/superuser/inventario/consumibles/[id]/page.js
'use client';

import React, { useEffect, useState, useCallback, use } from 'react';
import {
  Title, Text, Paper, Group, Divider, Grid,
  ActionIcon, Tooltip, LoadingOverlay, Button, Card, Table, Center, Flex, Badge
} from '@mantine/core';
import { IconEdit, IconRefresh, IconArrowUp, IconArrowDown, IconAlertTriangle } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';

export default function ConsumibleDetailPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const [consumible, setConsumible] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchConsumibleDetails = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/inventario/consumibles/${id}`);
      if (!response.ok) {
        throw new Error(`Error fetching consumible: ${response.statusText}`);
      }
      const data = await response.json();
      setConsumible(data);
    } catch (err) {
      console.error('Failed to fetch consumible details:', err);
      setError(err);
      notifications.show({
        title: 'Error',
        message: `No se pudo cargar el detalle del consumible: ${err.message}`,
        color: 'red',
        icon: <IconAlertTriangle />,
      });
    } finally {
      setLoading(false);
    }
  }, [id]);

  // También necesitaremos obtener las entradas y salidas de este consumible.
  // Podrías hacer llamadas separadas o modificar la API GET consumibles/[id]
  // para que incluya las asociaciones de entradas y salidas.
  // Por simplicidad en el frontend, haré llamadas separadas si la API no las incluye.
  // Si tu API GET /consumibles/[id] ya incluye `entradas` y `salidas`, puedes omitir esto.
  const [movimientos, setMovimientos] = useState([]);
  const [loadingMovimientos, setLoadingMovimientos] = useState(true);

  const fetchMovimientos = useCallback(async () => {
    setLoadingMovimientos(true);
    try {
      // Asume que tienes endpoints para filtrar entradas/salidas por consumibleId
      const [entradasRes, salidasRes] = await Promise.all([
        fetch(`/api/inventario/entradas?consumibleId=${id}`),
        fetch(`/api/inventario/salidas?consumibleId=${id}`),
      ]);

      const entradasData = await entradasRes.json();
      const salidasData = await salidasRes.json();

      const allMovimientos = [
        ...entradasData.map(e => ({ ...e, tipo: 'entrada' })),
        ...salidasData.map(s => ({ ...s, tipo: 'salida' })),
      ];

      // Ordenar por fecha, el más reciente primero
      allMovimientos.sort((a, b) => new Date(b.fechaEntrada || b.fechaSalida) - new Date(a.fechaEntrada || a.fechaSalida));
      setMovimientos(allMovimientos);

    } catch (err) {
      console.error('Failed to fetch movements for consumible:', err);
      notifications.show({
        title: 'Error',
        message: `No se pudo cargar el historial de movimientos: ${err.message}`,
        color: 'red',
      });
    } finally {
      setLoadingMovimientos(false);
    }
  }, [id]);

  useEffect(() => {
    fetchConsumibleDetails();
    fetchMovimientos();
  }, [fetchConsumibleDetails, fetchMovimientos]);


  if (loading) {
    return (
      <Paper p="md" shadow="sm" radius="md" style={{ position: 'relative', minHeight: '300px' }}>
        <LoadingOverlay visible={loading} overlayProps={{ radius: "sm", blur: 2 }} />
        <Text align="center">Cargando detalles del consumible...</Text>
      </Paper>
    );
  }

  if (error || !consumible) {
    return (
      <Paper p="md" shadow="sm" radius="md">
        <Text color="red">Error al cargar el consumible o no encontrado. {error?.message}</Text>
        <Button onClick={() => router.push('/superuser/inventario/consumibles')} mt="md">Volver al listado</Button>
      </Paper>
    );
  }

  const stockBajo = parseFloat(consumible.stockActual) <= parseFloat(consumible.stockMinimo);

  return (
    <Box>
      <Group justify="space-between" mb="lg">
        <Title order={2}>Detalle de Consumible: {consumible.nombre}</Title>
        <Group>
          <Tooltip label="Editar Consumible">
            <ActionIcon variant="light" size="lg" onClick={() => router.push(`/superuser/inventario/consumibles/${consumible.id}/editar`)}>
              <IconEdit size={24} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Refrescar Datos">
            <ActionIcon variant="light" size="lg" onClick={() => { fetchConsumibleDetails(); fetchMovimientos(); }}>
              <IconRefresh size={24} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      <Paper p="md" shadow="sm" radius="md" mb="lg">
        <Grid>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Text fw={700}>Nombre:</Text>
            <Text>{consumible.nombre}</Text>
            <Text fw={700} mt="sm">Descripción:</Text>
            <Text>{consumible.descripcion || 'N/A'}</Text>
            <Text fw={700} mt="sm">Unidad de Medida:</Text>
            <Text>{consumible.unidadMedida}</Text>
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Text fw={700}>Ubicación en Almacén:</Text>
            <Text>{consumible.ubicacionAlmacen || 'N/A'}</Text>
            <Text fw={700} mt="sm">Precio Unitario Promedio:</Text>
            <Text>${parseFloat(consumible.precioUnitarioPromedio).toFixed(2)}</Text>
          </Grid.Col>
        </Grid>
      </Paper>

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg" mb="xl">
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Flex align="center" gap="xs">
            <Text size="xl" fw={700} mb="xs" c="blue">Stock Actual</Text>
            {stockBajo && (
              <Tooltip label="¡Alerta! Stock por debajo o igual al mínimo." color="red">
                <IconAlertTriangle size={24} color="red" />
              </Tooltip>
            )}
          </Flex>
          <Title order={3} c="blue">{parseFloat(consumible.stockActual).toFixed(2)} {consumible.unidadMedida}</Title>
        </Card>
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Text size="xl" fw={700} mb="xs" c="orange">Stock Mínimo</Text>
          <Title order={3} c="orange">{parseFloat(consumible.stockMinimo).toFixed(2)} {consumible.unidadMedida}</Title>
        </Card>
      </SimpleGrid>

      <Divider my="lg" label="Historial de Movimientos" labelPosition="center" />
      <Paper p="md" shadow="sm" radius="md" mb="lg">
        {loadingMovimientos ? (
          <Center style={{ height: '150px' }}>
            <Loader size="sm" />
            <Text ml="md">Cargando movimientos...</Text>
          </Center>
        ) : movimientos.length > 0 ? (
          <Table striped highlightOnHover withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Fecha</Table.Th>
                <Table.Th>Tipo</Table.Th>
                <Table.Th>Cantidad</Table.Th>
                <Table.Th>Motivo/Referencia</Table.Th>
                <Table.Th>Empleado Involucrado</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {movimientos.map((mov, index) => (
                <Table.Tr key={index}>
                  <Table.Td>{new Date(mov.fechaEntrada || mov.fechaSalida).toLocaleDateString()}</Table.Td>
                  <Table.Td>
                    <Badge color={mov.tipo === 'entrada' ? 'green' : 'red'} leftSection={mov.tipo === 'entrada' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />}>
                      {mov.tipo === 'entrada' ? 'Entrada' : 'Salida'}
                    </Badge>
                  </Table.Td>
                  <Table.Td>{parseFloat(mov.cantidad).toFixed(2)}</Table.Td>
                  <Table.Td>{mov.tipo === 'entrada' ? (mov.ordenCompra ? `OC-${mov.ordenCompra.numeroOrden}` : 'Ajuste/Directa') : mov.motivo}</Table.Td>
                  <Table.Td>
                    {mov.tipo === 'entrada' ? (mov.recibidoPor ? `${mov.recibidoPor.nombre} ${mov.recibidoPor.apellido}` : 'N/A') : (mov.entregadoPor ? `${mov.entregadoPor.nombre} ${mov.entregadoPor.apellido}` : 'N/A')}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        ) : (
          <Text align="center" color="dimmed">No hay movimientos de inventario registrados para este consumible.</Text>
        )}
      </Paper>

      <Group justify="flex-start" mt="xl">
        <Button variant="default" onClick={() => router.push('/superuser/inventario/consumibles')}>
          Volver al Listado
        </Button>
      </Group>
    </Box>
  );
}