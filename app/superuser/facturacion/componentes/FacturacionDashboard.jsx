// components/facturacion/FacturacionDashboard.jsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Paper, Title, Text, Group, Loader, Center, SimpleGrid, Card, Flex, Button } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle, IconRefresh } from '@tabler/icons-react';
import { endOfMonth, startOfMonth, formatISO } from 'date-fns'; // Para manejar fechas

export function FacturacionDashboard() {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dates, setDates] = useState([startOfMonth(new Date()), endOfMonth(new Date())]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [startDate, endDate] = dates;
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', formatISO(startDate, { representation: 'date' }));
      if (endDate) params.append('endDate', formatISO(endDate, { representation: 'date' }));

      const response = await fetch(`/api/reportes/facturacion/resumen?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Error fetching report data: ${response.statusText}`);
      }
      const result = await response.json();
      setReportData(result);
    } catch (err) {
      console.error('Failed to fetch billing report:', err);
      setError(err);
      notifications.show({
        title: 'Error',
        message: `No se pudo cargar el reporte de facturación: ${err.message}`,
        color: 'red',
        icon: <IconAlertCircle />,
      });
    } finally {
      setLoading(false);
    }
  }, [dates]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <Center style={{ height: '300px' }}>
        <Loader size="lg" />
        <Text ml="md">Cargando reporte de facturación...</Text>
      </Center>
    );
  }

  if (error || !reportData) {
    return (
      <Paper p="md" shadow="sm" radius="md">
        <Text color="red">Error al cargar el reporte o datos no disponibles. {error?.message}</Text>
        <Button onClick={fetchData} mt="md">Reintentar</Button>
      </Paper>
    );
  }

  return (
    <Box>
      <Group justify="space-between" mb="lg">
        <Title order={2}>Resumen de Facturación</Title>
        <Flex gap="md" align="center">
          <DatePickerInput
            type="range"
            placeholder="Selecciona rango de fechas"
            value={dates}
            onChange={setDates}
            mx="auto"
            maw={400}
            clearable
          />
          <Button onClick={fetchData} leftSection={<IconRefresh size={18} />} variant="light">
            Aplicar Filtro
          </Button>
        </Flex>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg" mb="xl">
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Text fw={700} size="md" c="blue">Total Facturado</Text>
          <Title order={3} c="blue">${parseFloat(reportData.totalFacturado).toFixed(2)}</Title>
        </Card>
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Text fw={700} size="md" c="green">Total Recibido (Pagos)</Text>
          <Title order={3} c="green">${parseFloat(reportData.totalPagado).toFixed(2)}</Title>
        </Card>
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Text fw={700} size="md" c="orange">Notas de Crédito Emitidas</Text>
          <Title order={3} c="orange">${parseFloat(reportData.totalNotasCredito).toFixed(2)}</Title>
        </Card>
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Text fw={700} size="md" c={reportData.saldoNeto > 0 ? 'red' : 'green'}>Saldo Neto Pendiente</Text>
          <Title order={3} c={reportData.saldoNeto > 0 ? 'red' : 'green'}>${parseFloat(reportData.saldoNeto).toFixed(2)}</Title>
        </Card>
      </SimpleGrid>

      <Title order={3} mb="md">Facturas por Estado</Title>
      <Paper p="md" shadow="sm" radius="md">
        {reportData.facturasPorEstado && reportData.facturasPorEstado.length > 0 ? (
          <Table striped highlightOnHover withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Estado</Table.Th>
                <Table.Th>Cantidad de Facturas</Table.Th>
                <Table.Th>Monto Total</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {reportData.facturasPorEstado.map((item, index) => (
                <Table.Tr key={index}>
                  <Table.Td>
                    <Badge color={
                      item.estado === 'Pagada' ? 'green' :
                      item.estado === 'Pendiente' ? 'orange' :
                      item.estado === 'Vencida' ? 'red' :
                      'gray'
                    }>
                      {item.estado}
                    </Badge>
                  </Table.Td>
                  <Table.Td>{item.cantidad}</Table.Td>
                  <Table.Td>${parseFloat(item.totalMonto).toFixed(2)}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        ) : (
          <Text align="center" color="dimmed">No hay datos de facturas para el período seleccionado.</Text>
        )}
      </Paper>
    </Box>
  );
}