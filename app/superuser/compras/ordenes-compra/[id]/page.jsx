// app/superuser/compras/ordenes-compra/[id]/page.js
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Title, Text, Paper, Group, Divider, Grid,
  ActionIcon, Tooltip, LoadingOverlay, Button, Center, Badge
} from '@mantine/core';
import { IconEdit, IconRefresh, IconAlertCircle } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';

const getEstadoColor = (estado) => {
  switch (estado) {
    case 'Pendiente': return 'orange';
    case 'Aprobada': return 'blue';
    case 'Enviada': return 'cyan';
    case 'Recibida Parcial': return 'yellow';
    case 'Recibida Completa': return 'green';
    case 'Rechazada': return 'red';
    case 'Cancelada': return 'gray';
    default: return 'gray';
  }
};

export default function OrdenCompraDetailPage({ params }) {
  const { id } = params;
  const router = useRouter();
  const [ordenCompra, setOrdenCompra] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOrdenCompraDetails = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/superuser/compras/ordenes-compra/${id}`);
      if (!response.ok) {
        throw new Error(`Error fetching orden de compra: ${response.statusText}`);
      }
      const data = await response.json();
      setOrdenCompra(data);
    } catch (err) {
      console.error('Failed to fetch orden de compra details:', err);
      setError(err);
      notifications.show({
        title: 'Error',
        message: `No se pudo cargar el detalle de la orden de compra: ${err.message}`,
        color: 'red',
        icon: <IconAlertCircle />,
      });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrdenCompraDetails();
  }, [fetchOrdenCompraDetails]);

  if (loading) {
    return (
      <Paper p="md" shadow="sm" radius="md" style={{ position: 'relative', minHeight: '300px' }}>
        <LoadingOverlay visible={loading} overlayProps={{ radius: "sm", blur: 2 }} />
        <Text align="center">Cargando detalle de la Orden de Compra...</Text>
      </Paper>
    );
  }

  if (error || !ordenCompra) {
    return (
      <Paper p="md" shadow="sm" radius="md">
        <Text color="red">Error al cargar la orden de compra o no encontrada. {error?.message}</Text>
        <Button onClick={() => router.push('/superuser/compras/ordenes-compra')} mt="md">Volver al listado</Button>
      </Paper>
    );
  }

  return (
    <Box>
      <Group justify="space-between" mb="lg">
        <Title order={2}>Orden de Compra: {ordenCompra.numeroOrden}</Title>
        <Group>
          <Tooltip label="Editar Orden de Compra">
            <ActionIcon variant="light" size="lg" onClick={() => router.push(`/superuser/compras/ordenes-compra/${ordenCompra.id}/editar`)}>
              <IconEdit size={24} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Refrescar Datos">
            <ActionIcon variant="light" size="lg" onClick={fetchOrdenCompraDetails}>
              <IconRefresh size={24} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      <Paper p="md" shadow="sm" radius="md" mb="lg">
        <Grid>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Text fw={700}>Nº de Orden:</Text>
            <Text>{ordenCompra.numeroOrden}</Text>
            <Text fw={700} mt="sm">Proveedor:</Text>
            <Text>{ordenCompra.proveedor?.nombre || 'N/A'}</Text>
            <Text fw={700} mt="sm">Fecha de Creación:</Text>
            <Text>{new Date(ordenCompra.fechaCreacion).toLocaleDateString()}</Text>
            <Text fw={700} mt="sm">Fecha Requerida:</Text>
            <Text>{ordenCompra.fechaRequerida ? new Date(ordenCompra.fechaRequerida).toLocaleDateString() : 'N/A'}</Text>
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Text fw={700}>Estado:</Text>
            <Badge color={getEstadoColor(ordenCompra.estado)} variant="light" size="lg">
              {ordenCompra.estado}
            </Badge>
            <Text fw={700} mt="sm">Total Estimado:</Text>
            <Text>${parseFloat(ordenCompra.totalEstimado).toFixed(2)}</Text>
            <Text fw={700} mt="sm">Creada Por:</Text>
            <Text>{ordenCompra.creadaPor ? `${ordenCompra.creadaPor.nombre} ${ordenCompra.creadaPor.apellido}` : 'N/A'}</Text>
            <Text fw={700} mt="sm">Notas Generales:</Text>
            <Text>{ordenCompra.notas || 'Sin notas'}</Text>
          </Grid.Col>
        </Grid>
      </Paper>

      <Paper p="md" shadow="sm" radius="md" mb="lg">
        <Title order={4} mb="sm">Detalles de la Orden</Title>
        {ordenCompra.detalles && ordenCompra.detalles.length > 0 ? (
          ordenCompra.detalles.map((detalle, index) => (
            <Box key={detalle.id || index} p="sm" my="sm" style={{ border: '1px solid var(--mantine-color-gray-3)', borderRadius: '4px' }}>
              <Text fw={500}>Consumible: {detalle.consumible?.nombre || 'N/A'}</Text>
              <Grid mt="xs">
                <Grid.Col span={{ base: 12, sm: 4 }}>
                  <Text fw={700}>Cantidad:</Text>
                  <Text>{parseFloat(detalle.cantidad).toFixed(2)}</Text>
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 4 }}>
                  <Text fw={700}>Precio Unitario:</Text>
                  <Text>${parseFloat(detalle.precioUnitario).toFixed(2)}</Text>
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 4 }}>
                  <Text fw={700}>Subtotal:</Text>
                  <Text>${parseFloat(detalle.subtotal).toFixed(2)}</Text>
                </Grid.Col>
              </Grid>
              {detalle.notas && (
                <>
                  <Text fw={700} mt="xs">Notas del Ítem:</Text>
                  <Text>{detalle.notas}</Text>
                </>
              )}
              {index < ordenCompra.detalles.length - 1 && <Divider my="xs" />}
            </Box>
          ))
        ) : (
          <Text c="dimmed" ta="center">No hay detalles registrados para esta orden de compra.</Text>
        )}
      </Paper>

      <Group justify="flex-start" mt="xl">
        <Button variant="default" onClick={() => router.push('/superuser/compras/ordenes-compra')}>
          Volver al Listado
        </Button>
      </Group>
    </Box>
  );
}