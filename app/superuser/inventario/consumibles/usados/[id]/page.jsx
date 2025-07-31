// app/superuser/inventario/consumibles-usados/[id]/page.js
'use client';

import React, { useEffect, useState, useCallback, use } from 'react';
import {
  Title, Text, Paper, Group, Divider, Grid,
  ActionIcon, Tooltip, LoadingOverlay, Button, Center
} from '@mantine/core';
import { IconEdit, IconRefresh, IconAlertCircle } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';

export default function ConsumibleUsadoDetailPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const [consumibleUsado, setConsumibleUsado] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchConsumibleUsadoDetails = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/inventario/consumibles-usados/${id}`);
      if (!response.ok) {
        throw new Error(`Error fetching consumible usado: ${response.statusText}`);
      }
      const data = await response.json();
      setConsumibleUsado(data);
    } catch (err) {
      console.error('Failed to fetch consumible usado details:', err);
      setError(err);
      notifications.show({
        title: 'Error',
        message: `No se pudo cargar el detalle del uso del consumible: ${err.message}`,
        color: 'red',
        icon: <IconAlertCircle />,
      });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchConsumibleUsadoDetails();
  }, [fetchConsumibleUsadoDetails]);

  if (loading) {
    return (
      <Paper p="md" shadow="sm" radius="md" style={{ position: 'relative', minHeight: '300px' }}>
        <LoadingOverlay visible={loading} overlayProps={{ radius: "sm", blur: 2 }} />
        <Text align="center">Cargando detalle del uso...</Text>
      </Paper>
    );
  }

  if (error || !consumibleUsado) {
    return (
      <Paper p="md" shadow="sm" radius="md">
        <Text color="red">Error al cargar el uso del consumible o no encontrado. {error?.message}</Text>
        <Button onClick={() => router.push('/superuser/inventario/consumibles-usados')} mt="md">Volver al listado</Button>
      </Paper>
    );
  }

  return (
    <Box>
      <Group justify="space-between" mb="lg">
        <Title order={2}>Detalle de Uso de Consumible</Title>
        <Group>
          <Tooltip label="Editar Uso (Campos Auxiliares)">
            <ActionIcon variant="light" size="lg" onClick={() => router.push(`/superuser/inventario/consumibles-usados/${consumibleUsado.id}/editar`)}>
              <IconEdit size={24} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Refrescar Datos">
            <ActionIcon variant="light" size="lg" onClick={fetchConsumibleUsadoDetails}>
              <IconRefresh size={24} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      <Paper p="md" shadow="sm" radius="md" mb="lg">
        <Grid>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Text fw={700}>Consumible:</Text>
            <Text>{consumibleUsado.consumible?.nombre || 'N/A'}</Text>
            <Text fw={700} mt="sm">Cantidad Usada:</Text>
            <Text>{parseFloat(consumibleUsado.cantidadUsada).toFixed(2)} {consumibleUsado.consumible?.unidadMedida || ''}</Text>
            <Text fw={700} mt="sm">Fecha de Uso:</Text>
            <Text>{new Date(consumibleUsado.fechaUso).toLocaleDateString()}</Text>
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Text fw={700}>Contrato de Servicio Asociado:</Text>
            <Text>{consumibleUsado.contratoServicio ? `Contrato ${consumibleUsado.contratoServicio.numeroContrato} (${consumibleUsado.contratoServicio.cliente?.razonSocial || 'N/A'})` : 'Ninguno'}</Text>
            <Text fw={700} mt="sm">Equipo Asociado:</Text>
            <Text>{consumibleUsado.equipo ? `${consumibleUsado.equipo.nombre} (${consumibleUsado.equipo.modelo})` : 'Ninguno'}</Text>
            <Text fw={700} mt="sm">Reportado Por:</Text>
            <Text>{consumibleUsado.empleado ? `${consumibleUsado.empleado.nombre} ${consumibleUsado.empleado.apellido}` : 'N/A'}</Text>
            <Text fw={700} mt="sm">Notas del Uso:</Text>
            <Text>{consumibleUsado.notas || 'Sin notas'}</Text>
          </Grid.Col>
        </Grid>
      </Paper>

      <Group justify="flex-start" mt="xl">
        <Button variant="default" onClick={() => router.push('/superuser/inventario/consumibles-usados')}>
          Volver al Listado
        </Button>
      </Group>
    </Box>
  );
}