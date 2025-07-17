// components/contratos/RenglonContratoDetail.jsx
import React from 'react';
import { Paper, Text, Group, Badge, ActionIcon, Stack } from '@mantine/core';
import { IconEdit } from '@tabler/icons-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function RenglonContratoDetail({ renglon, onEdit }) {
  if (!renglon) return null;

  // Determinar el color de la insignia de estado del renglón
  let estadoColor = 'gray';
  switch (renglon.estado) {
    case 'Pendiente':
      estadoColor = 'yellow';
      break;
    case 'En Preparación':
      estadoColor = 'blue';
      break;
    case 'Mudanza':
      estadoColor = 'orange';
      break;
    case 'Operando':
      estadoColor = 'green';
      break;
    case 'Finalizado':
      estadoColor = 'teal';
      break;
    case 'Pausado':
      estadoColor = 'cyan';
      break;
    case 'Cancelado':
      estadoColor = 'red';
      break;
    default:
      estadoColor = 'gray';
  }

  return (
    <Paper withBorder shadow="sm" p="md" radius="md" h="100%">
      <Group justify="space-between" mb="sm" align="flex-start">
        <Stack gap={2}>
          <Text size="lg" fw={500} lineClamp={1}>{renglon.nombreRenglon}</Text>
          <Text size="xs" color="dimmed">ID: {renglon.id}</Text>
        </Stack>
        <ActionIcon
          variant="light"
          color="blue"
          onClick={() => onEdit(renglon)}
          size="sm"
          aria-label="Editar renglón"
        >
          <IconEdit style={{ width: '70%', height: '70%' }} stroke={1.5} />
        </ActionIcon>
      </Group>

      <Group mb="xs">
        <Badge color={estadoColor} variant="filled">{renglon.estado}</Badge>
      </Group>

      <Text size="sm" mb={4}>**Pozo:** {renglon.pozoNombre}</Text>
      <Text size="sm" mb={8}>**Ubicación:** {renglon.ubicacionPozo || 'No especificada'}</Text>

      <Group gap="xs" wrap="nowrap" grow>
        <Text size="xs" color="dimmed">
          Inicio: {renglon.fechaInicioEstimada ? format(new Date(renglon.fechaInicioEstimada), 'dd/MM/yyyy', { locale: es }) : 'N/A'}
        </Text>
        <Text size="xs" color="dimmed">
          Fin: {renglon.fechaFinEstimada ? format(new Date(renglon.fechaFinEstimada), 'dd/MM/yyyy', { locale: es }) : 'N/A'}
        </Text>
      </Group>
    </Paper>
  );
}