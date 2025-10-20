// components/contratos/ContratoDetailCard.jsx
import React from 'react';
import { Paper, Title, Text, Group, Badge, Grid, Stack } from '@mantine/core';
import { format } from 'date-fns'; // Para formatear fechas
import { es } from 'date-fns/locale'; // Para fechas en español

export function ContratoDetailCard({ contrato }) {
  if (!contrato) return null;

  // Determinar el color de la insignia de estado
  let estadoColor = 'gray';
  switch (contrato.estado) {
    case 'Activo':
      estadoColor = 'green';
      break;
    case 'Finalizado':
      estadoColor = 'blue';
      break;
    case 'Cancelado':
      estadoColor = 'red';
      break;
    case 'Pausado':
      estadoColor = 'yellow';
      break;
    default:
      estadoColor = 'gray';
  }

  return (
    <Paper   shadow="md" p="xl" radius="md">
      <Group justify="space-between" mb="md" align="flex-start">
        <Stack gap={4}>
          <Title order={3}>{contrato.numeroContrato}</Title>
        
        </Stack>
        <Group>
          <Badge color={estadoColor} variant="light" size="lg">
            {contrato.estado}
          </Badge>
        </Group>
      </Group>

      <Text size="md" mb="xs">
        <strong>Cliente:</strong> {contrato.cliente?.nombreCompleto || contrato.cliente?.razonSocial || 'N/A'}
      </Text>
      <Text size="md" mb="md">
        <strong>RIF/Cédula Cliente: </strong> {contrato.cliente?.cedulaRif || 'N/A'}
      </Text>

   
        <Grid gutter="md">
   
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Text size="sm">
            <strong>Fecha de Inicio: </strong> {contrato.fechaInicio ? format(new Date(contrato.fechaInicio), 'dd/MM/yyyy', { locale: es }) : 'N/A'}
          </Text>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Text size="sm">
            <strong>Fecha de Fin:</strong>{contrato.fechaFinEstimada ? format(new Date(contrato.fechaFinEstimada), 'dd/MM/yyyy', { locale: es }) : 'N/A'}
          </Text>
        </Grid.Col>
        <Grid.Col span={12}>
          <Text size="sm">
            <strong>Monto Total:</strong> Bs. {contrato.montoTotal ? parseFloat(contrato.montoTotal).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00'}
          </Text>
        </Grid.Col>
        <Grid.Col span={12}>
          <Text size="sm">
            <strong>Descripción:</strong> {contrato.descripcion || 'Sin descripción.'}
          </Text>
        </Grid.Col>
      </Grid>
    </Paper>
  );
}