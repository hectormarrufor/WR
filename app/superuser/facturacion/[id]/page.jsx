// app/superuser/facturacion/[id]/page.js
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Title, Text, Paper, Group, Badge, Divider, Grid,
  ActionIcon, Tooltip, LoadingOverlay, Button, Modal, Card, Table, Flex
} from '@mantine/core';
import { IconEdit, IconCurrencyDollar, IconRefresh, IconPrinter, IconAlertCircle } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';
import { useDisclosure } from '@mantine/hooks';
import { PagoFacturaForm } from '@/components/facturacion/PagoFacturaForm'; // Importa el formulario de pagos

export default function FacturaDetailPage({ params }) {
  const { id } = params;
  const router = useRouter();
  const [factura, setFactura] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [paymentModalOpened, { open: openPaymentModal, close: closePaymentModal }] = useDisclosure(false);

  const fetchFactura = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/superuser/facturacion/${id}`);
      if (!response.ok) {
        throw new Error(`Error fetching factura: ${response.statusText}`);
      }
      const data = await response.json();
      setFactura(data);
    } catch (err) {
      console.error('Failed to fetch factura details:', err);
      setError(err);
      notifications.show({
        title: 'Error',
        message: `No se pudo cargar el detalle de la factura: ${err.message}`,
        color: 'red',
        icon: <IconAlertCircle />,
      });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchFactura();
  }, [fetchFactura]);

  const handlePaymentSuccess = () => {
    closePaymentModal();
    fetchFactura(); // Recargar datos de la factura para actualizar saldo y lista de pagos
  };

  if (loading) {
    return (
      <Paper p="md" shadow="sm" radius="md" style={{ position: 'relative', minHeight: '300px' }}>
        <LoadingOverlay visible={loading} overlayProps={{ radius: "sm", blur: 2 }} />
        <Text align="center">Cargando detalles de la factura...</Text>
      </Paper>
    );
  }

  if (error || !factura) {
    return (
      <Paper p="md" shadow="sm" radius="md">
        <Text color="red">Error al cargar la factura o no encontrada. {error?.message}</Text>
        <Button onClick={() => router.push('/superuser/facturacion')} mt="md">Volver al listado</Button>
      </Paper>
    );
  }

  // Calcular el total pagado hasta ahora
  const totalPagado = factura.pagos.reduce((sum, pago) => sum + parseFloat(pago.monto), 0);
  const saldoPendiente = parseFloat(factura.totalAPagar) - totalPagado;

  return (
    <Box>
      <Group justify="space-between" mb="lg">
        <Title order={2}>Factura Nº {factura.numeroFactura}</Title>
        <Group>
          <Tooltip label="Editar Factura">
            <ActionIcon variant="light" size="lg" onClick={() => router.push(`/superuser/facturacion/${factura.id}/editar`)}>
              <IconEdit size={24} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Registrar Pago">
            <ActionIcon variant="filled" color="green" size="lg" onClick={openPaymentModal}>
              <IconCurrencyDollar size={24} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Imprimir Factura (Funcionalidad futura)">
            <ActionIcon variant="light" size="lg" disabled>
              <IconPrinter size={24} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Refrescar Datos">
            <ActionIcon variant="light" size="lg" onClick={fetchFactura}>
              <IconRefresh size={24} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      <Paper p="md" shadow="sm" radius="md" mb="lg">
        <Grid>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Text fw={700}>Cliente:</Text>
            <Text>{factura.cliente?.razonSocial || `${factura.cliente?.nombreContacto} ${factura.cliente?.apellidoContacto}`}</Text>
            <Text fw={700} mt="sm">Número de Identificación:</Text>
            <Text>{factura.cliente?.tipoIdentificacion}-{factura.cliente?.identificacion}</Text>
            <Text fw={700} mt="sm">Contacto:</Text>
            <Text>{factura.cliente?.telefono} | {factura.cliente?.email}</Text>
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Text fw={700}>Fecha Emisión:</Text>
            <Text>{new Date(factura.fechaEmision).toLocaleDateString()}</Text>
            <Text fw={700} mt="sm">Fecha Vencimiento:</Text>
            <Text>{new Date(factura.fechaVencimiento).toLocaleDateString()}</Text>
            <Text fw={700} mt="sm">Estado:</Text>
            <Badge color={
              factura.estado === 'Pagada' ? 'green' :
              factura.estado === 'Pendiente' ? 'orange' :
              factura.estado === 'Vencida' ? 'red' :
              'gray'
            }>{factura.estado}</Badge>
          </Grid.Col>
        </Grid>
        <Divider my="md" />
        <Grid>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Text fw={700}>Contrato Asociado:</Text>
            <Text>{factura.contrato ? `Contrato Nº ${factura.contrato.numeroContrato}` : 'Ninguno'}</Text>
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Text fw={700}>Operación de Campo Asociada:</Text>
            <Text>{factura.operacionCampo ? `Operación Nº ${factura.operacionCampo.id}` : 'Ninguna'}</Text>
          </Grid.Col>
        </Grid>
        {factura.notas && (
          <>
            <Divider my="md" />
            <Text fw={700}>Notas:</Text>
            <Text>{factura.notas}</Text>
          </>
        )}
      </Paper>

      <Grid grow mb="lg">
        <Grid.Col span={{ base: 12, sm: 4 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Text size="xl" fw={700} ta="center" mb="xs">Subtotal</Text>
            <Text size="3rem" fw={900} c="blue" ta="center">${parseFloat(factura.montoTotal).toFixed(2)}</Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 4 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Text size="xl" fw={700} ta="center" mb="xs">Impuestos</Text>
            <Text size="3rem" fw={900} c="orange" ta="center">${parseFloat(factura.impuestos).toFixed(2)}</Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 4 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Text size="xl" fw={700} ta="center" mb="xs">Total a Pagar</Text>
            <Text size="3rem" fw={900} c="teal" ta="center">${parseFloat(factura.totalAPagar).toFixed(2)}</Text>
          </Card>
        </Grid.Col>
      </Grid>

      <Divider my="lg" label="Renglones de la Factura" labelPosition="center" />
      <Paper p="md" shadow="sm" radius="md" mb="lg">
        {factura.renglones && factura.renglones.length > 0 ? (
          <Table striped highlightOnHover withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Descripción</Table.Th>
                <Table.Th style={{ width: '100px' }}>Cantidad</Table.Th>
                <Table.Th style={{ width: '100px' }}>Unidad</Table.Th>
                <Table.Th style={{ width: '120px' }}>Precio Unitario</Table.Th>
                <Table.Th style={{ width: '120px' }}>Subtotal</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {factura.renglones.map((renglon, index) => (
                <Table.Tr key={index}>
                  <Table.Td>{renglon.descripcion}</Table.Td>
                  <Table.Td>{parseFloat(renglon.cantidad).toFixed(2)}</Table.Td>
                  <Table.Td>{renglon.unidadMedida}</Table.Td>
                  <Table.Td>${parseFloat(renglon.precioUnitario).toFixed(2)}</Table.Td>
                  <Table.Td>${parseFloat(renglon.subtotal).toFixed(2)}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        ) : (
          <Text align="center" color="dimmed">No hay renglones registrados para esta factura.</Text>
        )}
      </Paper>

      <Divider my="lg" label="Historial de Pagos" labelPosition="center" />
      <Paper p="md" shadow="sm" radius="md" mb="lg">
        <Flex justify="space-between" align="center" mb="md">
            <Text size="xl" fw={700}>Pagos Recibidos</Text>
            <Text fw={700} size="lg" color="green">Total Pagado: ${totalPagado.toFixed(2)}</Text>
            <Text fw={700} size="lg" color={saldoPendiente > 0 ? 'red' : 'green'}>Saldo Pendiente: ${saldoPendiente.toFixed(2)}</Text>
        </Flex>
        {factura.pagos && factura.pagos.length > 0 ? (
          <Table striped highlightOnHover withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Fecha de Pago</Table.Th>
                <Table.Th>Monto</Table.Th>
                <Table.Th>Método</Table.Th>
                <Table.Th>Referencia</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {factura.pagos.map((pago, index) => (
                <Table.Tr key={index}>
                  <Table.Td>{new Date(pago.fechaPago).toLocaleDateString()}</Table.Td>
                  <Table.Td>${parseFloat(pago.monto).toFixed(2)}</Table.Td>
                  <Table.Td>{pago.metodoPago}</Table.Td>
                  <Table.Td>{pago.referencia || 'N/A'}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        ) : (
          <Text align="center" color="dimmed">No hay pagos registrados para esta factura.</Text>
        )}
      </Paper>

      {/* Modal para registrar un nuevo pago */}
      <Modal opened={paymentModalOpened} onClose={closePaymentModal} title="Registrar Nuevo Pago" centered size="md">
        <PagoFacturaForm
          facturaId={factura.id}
          onSuccess={handlePaymentSuccess}
          onCancel={closePaymentModal}
        />
      </Modal>
    </Box>
  );
}