// app/superuser/compras/recepciones-compra/[id]/page.js
'use client';

import React, { useEffect, useState, useCallback, use } from 'react';
import {
  Title, Text, Paper, Group, Divider, Grid,
  ActionIcon, Tooltip, LoadingOverlay, Button, Center, Badge
} from '@mantine/core';
import { IconRefresh, IconAlertCircle } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';

const getEstadoColor = (estado) => {
  switch (estado) {
    case 'Parcial': return 'yellow';
    case 'Completa': return 'green';
    default: return 'gray';
  }
};

export default function RecepcionCompraDetailPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const [recepcion, setRecepcion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRecepcionDetails = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/compras/recepciones-compra/${id}`);
      if (!response.ok) {
        throw new Error(`Error fetching recepción de compra: ${response.statusText}`);
      }
      const data = await response.json();
      setRecepcion(data);
    } catch (err) {
      console.error('Failed to fetch recepción de compra details:', err);
      setError(err);
      notifications.show({
        title: 'Error',
        message: `No se pudo cargar el detalle de la recepción de compra: ${err.message}`,
        color: 'red',
        icon: <IconAlertCircle />,
      });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRecepcionDetails();
  }, [fetchRecepcionDetails]);

  if (loading) {
    return (
      <Paper p="md" shadow="sm" radius="md" style={{ position: 'relative', minHeight: '300px' }}>
        <LoadingOverlay visible={loading} overlayProps={{ radius: "sm", blur: 2 }} />
        <Text align="center">Cargando detalle de la Recepción de Compra...</Text>
      </Paper>
    );
  }

  if (error || !recepcion) {
    return (
      <Paper p="md" shadow="sm" radius="md">
        <Text color="red">Error al cargar la recepción de compra o no encontrada. {error?.message}</Text>
        <Button onClick={() => router.push('/superuser/compras/recepciones-compra')} mt="md">Volver al listado</Button>
      </Paper>
    );
  }

  return (
    <Box>
      <Group justify="space-between" mb="lg">
        <Title order={2}>Recepción de Compra: {recepcion.numeroGuia || 'N/A'}</Title>
        <Group>
          {/* No hay botón de edición para recepciones */}
          <Tooltip label="Refrescar Datos">
            <ActionIcon variant="light" size="lg" onClick={fetchRecepcionDetails}>
              <IconRefresh size={24} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      <Paper p="md" shadow="sm" radius="md" mb="lg">
        <Grid>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Text fw={700}>Nº de Orden de Compra:</Text>
            <Text>{recepcion.ordenCompra?.numeroOrden || 'N/A'}</Text>
            <Text fw={700} mt="sm">Proveedor:</Text>
            <Text>{recepcion.ordenCompra?.proveedor?.nombre || 'N/A'}</Text>
            <Text fw={700} mt="sm">Fecha de Recepción:</Text>
            <Text>{new Date(recepcion.fechaRecepcion).toLocaleDateString()}</Text>
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Text fw={700}>Número de Guía / Remisión:</Text>
            <Text>{recepcion.numeroGuia || 'N/A'}</Text>
            <Text fw={700} mt="sm">Recibida Por:</Text>
            <Text>{recepcion.recibidaPor ? `${recepcion.recibidaPor.nombre} ${recepcion.recibidaPor.apellido}` : 'N/A'}</Text>
            <Text fw={700} mt="sm">Estado de Recepción:</Text>
            <Badge color={getEstadoColor(recepcion.estadoRecepcion)} variant="light" size="lg">
              {recepcion.estadoRecepcion}
            </Badge>
            <Text fw={700} mt="sm">Notas Generales:</Text>
            <Text>{recepcion.notas || 'Sin notas'}</Text>
          </Grid.Col>
        </Grid>
      </Paper>

      <Paper p="md" shadow="sm" radius="md" mb="lg">
        <Title order={4} mb="sm">Detalles de la Recepción</Title>
        {recepcion.detalles && recepcion.detalles.length > 0 ? (
          recepcion.detalles.map((detalle, index) => (
            <Box key={detalle.id || index} p="sm" my="sm" style={{ border: '1px solid var(--mantine-color-gray-3)', borderRadius: '4px' }}>
              <Text fw={500}>Consumible: {detalle.consumible?.nombre || 'N/A'}</Text>
              <Grid mt="xs">
                <Grid.Col span={{ base: 12, sm: 4 }}>
                  <Text fw={700}>Cantidad Recibida:</Text>
                  <Text>{parseFloat(detalle.cantidadRecibida).toFixed(2)}</Text>
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 4 }}>
                  <Text fw={700}>Precio Unitario (Recepción):</Text>
                  <Text>${parseFloat(detalle.precioUnitarioActual).toFixed(2)}</Text>
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 4 }}>
                  <Text fw={700}>Subtotal (Recepción):</Text>
                  <Text>${(parseFloat(detalle.cantidadRecibida) * parseFloat(detalle.precioUnitarioActual)).toFixed(2)}</Text>
                </Grid.Col>
              </Grid>
              {detalle.notas && (
                <>
                  <Text fw={700} mt="xs">Notas del Ítem:</Text>
                  <Text>{detalle.notas}</Text>
                </>
              )}
              {index < recepcion.detalles.length - 1 && <Divider my="xs" />}
            </Box>
          ))
        ) : (
          <Text c="dimmed" ta="center">No hay detalles registrados para esta recepción de compra.</Text>
        )}
      </Paper>

      <Group justify="flex-start" mt="xl">
        <Button variant="default" onClick={() => router.push('/superuser/compras/recepciones-compra')}>
          Volver al Listado
        </Button>
      </Group>
    </Box>
  );
}