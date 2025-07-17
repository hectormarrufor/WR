// app/superuser/compras/facturas-proveedor/[id]/page.js
'use client';

import React, { useEffect, useState, useCallback, use } from 'react';
import {
  Title, Text, Paper, Group, Divider, Grid,
  ActionIcon, Tooltip, LoadingOverlay, Button, Center, Badge, Anchor, List
} from '@mantine/core';
import { IconRefresh, IconAlertCircle, IconEdit, IconCurrencyDollar, IconPrinter } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';

const getEstadoColor = (estado) => {
  switch (estado) {
    case 'Pendiente': return 'red';
    case 'Parcialmente Pagada': return 'orange';
    case 'Pagada': return 'green';
    case 'Anulada': return 'gray';
    default: return 'gray';
  }
};

export default function FacturaProveedorDetailPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const [factura, setFactura] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchFacturaDetails = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/compras/facturas-proveedor/${id}`);
      if (!response.ok) {
        throw new Error(`Error fetching factura de proveedor: ${response.statusText}`);
      }
      const data = await response.json();
      setFactura(data);
    } catch (err) {
      console.error('Failed to fetch factura de proveedor details:', err);
      setError(err);
      notifications.show({
        title: 'Error',
        message: `No se pudo cargar el detalle de la factura de proveedor: ${err.message}`,
        color: 'red',
        icon: <IconAlertCircle />,
      });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchFacturaDetails();
  }, [fetchFacturaDetails]);

  if (loading) {
    return (
      <Paper p="md" shadow="sm" radius="md" style={{ position: 'relative', minHeight: '300px' }}>
        <LoadingOverlay visible={loading} overlayProps={{ radius: "sm", blur: 2 }} />
        <Text align="center">Cargando detalle de la Factura de Proveedor...</Text>
      </Paper>
    );
  }

  if (error || !factura) {
    return (
      <Paper p="md" shadow="sm" radius="md">
        <Text color="red">Error al cargar la factura de proveedor o no encontrada. {error?.message}</Text>
        <Button onClick={() => router.push('/superuser/compras/facturas-proveedor')} mt="md">Volver al listado</Button>
      </Paper>
    );
  }

  const saldoPendiente = parseFloat(factura.totalAPagar) - parseFloat(factura.montoPagado);

  return (
    <Box>
      <Group justify="space-between" mb="lg">
        <Title order={2}>Factura de Proveedor: {factura.numeroFactura}</Title>
        <Group>
          <Tooltip label="Editar Factura">
            <ActionIcon variant="light" size="lg" onClick={() => router.push(`/superuser/compras/facturas-proveedor/${factura.id}/editar`)}>
              <IconEdit size={24} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Registrar Pago">
            <ActionIcon variant="light" size="lg" onClick={() => router.push(`/superuser/compras/facturas-proveedor/${factura.id}/registrar-pago`)} disabled={factura.estado === 'Pagada' || factura.estado === 'Anulada'}>
              <IconCurrencyDollar size={24} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Imprimir (Próximamente)">
            <ActionIcon variant="light" size="lg" disabled>
              <IconPrinter size={24} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Refrescar Datos">
            <ActionIcon variant="light" size="lg" onClick={fetchFacturaDetails}>
              <IconRefresh size={24} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      <Paper p="md" shadow="sm" radius="md" mb="lg">
        <Grid>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Text fw={700}>Nº de Factura:</Text>
            <Text>{factura.numeroFactura}</Text>
            <Text fw={700} mt="sm">Proveedor:</Text>
            <Text>{factura.proveedor?.nombre || 'N/A'}</Text>
            {factura.ordenCompra && (
              <>
                <Text fw={700} mt="sm">Orden de Compra Asociada:</Text>
                <Anchor onClick={() => router.push(`/superuser/compras/ordenes-compra/${factura.ordenCompra.id}`)}>
                  {factura.ordenCompra.numeroOrden}
                </Anchor>
              </>
            )}
            <Text fw={700} mt="sm">Fecha de Emisión:</Text>
            <Text>{new Date(factura.fechaEmision).toLocaleDateString()}</Text>
            <Text fw={700} mt="sm">Fecha de Vencimiento:</Text>
            <Text>{new Date(factura.fechaVencimiento).toLocaleDateString()}</Text>
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Text fw={700}>Fecha de Recepción de Factura:</Text>
            <Text>{new Date(factura.fechaRecepcionFactura).toLocaleDateString()}</Text>
            <Text fw={700} mt="sm">Subtotal:</Text>
            <Text>${parseFloat(factura.subtotal).toFixed(2)}</Text>
            <Text fw={700} mt="sm">Impuestos:</Text>
            <Text>${parseFloat(factura.impuestos).toFixed(2)}</Text>
            <Text fw={700} mt="sm">Monto Total:</Text>
            <Text>${parseFloat(factura.montoTotal).toFixed(2)}</Text>
            <Text fw={700} mt="sm">Monto Pagado:</Text>
            <Text>${parseFloat(factura.montoPagado).toFixed(2)}</Text>
            <Text fw={700} mt="sm">Total Pendiente:</Text>
            <Text fw={700} color={saldoPendiente > 0 ? 'red' : 'green'}>${saldoPendiente.toFixed(2)}</Text>
            <Text fw={700} mt="sm">Estado:</Text>
            <Badge color={getEstadoColor(factura.estado)} variant="light" size="lg">
              {factura.estado}
            </Badge>
            <Text fw={700} mt="sm">Notas:</Text>
            <Text>{factura.notas || 'Sin notas'}</Text>
          </Grid.Col>
        </Grid>
      </Paper>

      <Paper p="md" shadow="sm" radius="md" mb="lg">
        <Title order={4} mb="sm">Detalles de la Factura</Title>
        {factura.detalles && factura.detalles.length > 0 ? (
          factura.detalles.map((detalle, index) => (
            <Box key={detalle.id || index} p="sm" my="sm" style={{ border: '1px solid var(--mantine-color-gray-3)', borderRadius: '4px' }}>
              <Text fw={500}>Consumible: {detalle.consumible?.nombre || 'N/A'}</Text>
              <Grid mt="xs">
                <Grid.Col span={{ base: 12, sm: 3 }}>
                  <Text fw={700}>Cantidad:</Text>
                  <Text>{parseFloat(detalle.cantidadFacturada).toFixed(2)}</Text>
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 3 }}>
                  <Text fw={700}>Precio Unitario:</Text>
                  <Text>${parseFloat(detalle.precioUnitarioFacturado).toFixed(2)}</Text>
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 3 }}>
                  <Text fw={700}>Impuestos Ítem:</Text>
                  <Text>${parseFloat(detalle.impuestos).toFixed(2)}</Text>
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 3 }}>
                  <Text fw={700}>Total Ítem:</Text>
                  <Text>${parseFloat(detalle.total).toFixed(2)}</Text>
                </Grid.Col>
              </Grid>
              {detalle.detalleOrdenCompraId && (
                <Text size="sm" c="dimmed" mt="xs">
                  Vinculado a Detalle OC ID: {detalle.detalleOrdenCompraId}
                </Text>
              )}
              {detalle.detalleRecepcionCompraId && (
                <Text size="sm" c="dimmed">
                  Vinculado a Detalle Recepción ID: {detalle.detalleRecepcionCompraId}
                </Text>
              )}
              {detalle.notas && (
                <>
                  <Text fw={700} mt="xs">Notas del Ítem:</Text>
                  <Text>{detalle.notas}</Text>
                </>
              )}
              {index < factura.detalles.length - 1 && <Divider my="xs" />}
            </Box>
          ))
        ) : (
          <Text c="dimmed" ta="center">No hay detalles registrados para esta factura de proveedor.</Text>
        )}
      </Paper>

      {factura.pagos && factura.pagos.length > 0 && (
        <Paper p="md" shadow="sm" radius="md" mb="lg">
            <Title order={4} mb="sm">Historial de Pagos</Title>
            <List spacing="xs" size="sm" center>
                {factura.pagos.map((pago) => (
                    <List.Item key={pago.id}>
                        <Group justify="space-between">
                            <Text>
                                Pago de ${parseFloat(pago.monto).toFixed(2)} el {new Date(pago.fechaPago).toLocaleDateString()}
                                {" "}vía {pago.metodoPago} {pago.referenciaPago ? `(${pago.referenciaPago})` : ''}
                            </Text>
                            <Anchor onClick={() => router.push(`/superuser/compras/pagos-proveedor/${pago.id}`)}>Ver Pago</Anchor>
                        </Group>
                    </List.Item>
                ))}
            </List>
        </Paper>
      )}

      <Group justify="flex-start" mt="xl">
        <Button variant="default" onClick={() => router.push('/superuser/compras/facturas-proveedor')}>
          Volver al Listado
        </Button>
      </Group>
    </Box>
  );
}