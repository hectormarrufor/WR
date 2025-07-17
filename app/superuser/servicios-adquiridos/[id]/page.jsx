// src/app/superuser/servicios-adquiridos/[id]/page.jsx
'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import {
  Container, Title, Text, Button, Group, Paper, Stack, Grid,
  ActionIcon, Divider, Collapse, ThemeIcon, Badge, Center, Loader, Accordion
} from '@mantine/core';
import { IconArrowLeft, IconEdit, IconTrash, IconTruckDelivery, IconTools, IconClipboardText, IconRoute, IconContract } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { notifications } from '@mantine/notifications';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { EditRenglonModal } from '../../contratos/EditRenglonModal'; // Asegúrate de tener esto correcto


export default function RenglonDetailPage({ params }) {
  const { id } = use(params);
  const router = useRouter();

  const [renglon, setRenglon] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpened, setModalOpened] = useState(false);
  const [showResumen, setShowResumen] = useState(false);


  const fetchRenglon = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/contratos/renglones/${id}`);
      if (!response.ok) throw new Error('Error al cargar renglón');
      const data = await response.json();
      setRenglon(data);
    } catch (err) {
      console.error(err);
      setError(err.message);
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) fetchRenglon();
  }, [id, fetchRenglon]);

  const estadoColor = {
    Pendiente: 'yellow',
    'En Preparación': 'blue',
    Mudanza: 'orange',
    Operando: 'green',
    Finalizado: 'teal',
    Pausado: 'cyan',
    Cancelado: 'red',
  }[renglon?.estado] || 'gray';

  const handleDelete = async () => {
    if (!confirm(`¿Eliminar el renglón "${renglon.nombreRenglon}"?`)) return;
    try {
      const res = await fetch(`/api/contratos/renglones/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error eliminando renglón');
      notifications.show({ title: 'Eliminado', message: 'Renglón eliminado', color: 'green' });
      router.push('/superuser/contratos');
    } catch (error) {
      notifications.show({ title: 'Error', message: error.message, color: 'red' });
    }
  };

  if (loading) return <Center style={{ height: '80vh' }}><Loader size="lg" /></Center>;
  if (error) return <Text color="red" ta="center">Error: {error}</Text>;
  if (!renglon) return <Text ta="center">Renglón no encontrado</Text>;

  return (
    <Container size="lg" py="xl" mt={70}>
      <Paper withBorder shadow="sm" radius="md" p="lg">
        <Group justify="space-between" mb="lg">
          <Button variant="light" onClick={() => router.back()} leftSection={<IconArrowLeft size={16} />}>
            Volver
          </Button>
          <Title order={2}>{renglon.nombreRenglon}</Title>
          <Group>
            <ActionIcon variant="light" color="blue" onClick={() => setModalOpened(true)} size="lg">
              <IconEdit />
            </ActionIcon>
            <ActionIcon variant="light" color="red" onClick={handleDelete} size="lg">
              <IconTrash />
            </ActionIcon>
          </Group>
        </Group>
        {renglon?.contrato && (
          <Accordion variant="contained" radius="md" defaultValue={null} mt="xl" mb={20}>
            <Accordion.Item value="contrato">
              <Accordion.Control icon={<ThemeIcon color="blue" variant="light"><IconContract /></ThemeIcon>}>
                Información del Contrato Asociado
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap="xs">
                  <Text><strong>Número:</strong> {renglon.contrato.numeroContrato}</Text>
                  <Text><strong>Cliente:</strong> {renglon.contrato.cliente?.nombreCompleto}</Text>
                  <Text><strong>Inicio:</strong> {format(new Date(renglon.contrato.fechaInicio), 'dd/MM/yyyy', { locale: es })}</Text>
                  <Text><strong>Fin Estimada:</strong> {renglon.contrato.fechaFinEstimada ? format(new Date(renglon.contrato.fechaFinEstimada), 'dd/MM/yyyy', { locale: es }) : 'N/A'}</Text>
                  <Text><strong>Estado:</strong> <Badge color={renglon.contrato.estado === 'Activo' ? 'green' : 'gray'}>{renglon.contrato.estado}</Badge></Text>
                  <Text><strong>Descripción:</strong> {renglon.contrato.descripcion || 'No especificada'}</Text>
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        )}
        <Stack gap="sm">
          <Group>
            <Text size="md" fw={600}>Estado:</Text>
            <Badge color={estadoColor}>{renglon.estado}</Badge>
          </Group>

          <Grid>
            <Grid.Col span={6}>
              <Text><strong>Pozo:</strong> {renglon.pozoNombre}</Text>
              <Text><strong>Ubicación:</strong> {renglon.ubicacionPozo || 'No especificada'}</Text>
            </Grid.Col>
            <Grid.Col span={6}>
              <Text><strong>Inicio estimado:</strong> {renglon.fechaInicioEstimada ? format(new Date(renglon.fechaInicioEstimada), 'dd/MM/yyyy', { locale: es }) : 'N/A'}</Text>
              <Text><strong>Fin estimado:</strong> {renglon.fechaFinEstimada ? format(new Date(renglon.fechaFinEstimada), 'dd/MM/yyyy', { locale: es }) : 'N/A'}</Text>
            </Grid.Col>
          </Grid>

          <Divider mt="md" />
          <Group justify="space-around" mt="md">
            {!renglon.mudanza && <Button leftSection={<IconTruckDelivery />} onClick={() => router.push(`/superuser/renglones/${id}/mudanza/nueva`)}>Registrar Mudanza</Button>}
            {!renglon.operacion && <Button leftSection={<IconTools />} onClick={() => router.push(`/superuser/servicios-adquiridos/${id}/operaciones/nueva`)}>Registrar Operación</Button>}
            {!renglon.transporte && <Button leftSection={<IconClipboardText />} onClick={() => router.push(`/superuser/renglones/${id}/transporte`)}>Registrar Transporte</Button>}
            <Button color="red" onClick={() => router.push(`/superuser/renglones/${id}/cancelar`)}>Cancelar Renglón</Button>
          </Group>
        </Stack>
      </Paper>



      {renglon?.mudanza && (
        <Paper withBorder shadow="sm" radius="md" p="md" mt="xl" onClick={() => router.push(`/superuser/mudanzas/${renglon.mudanza.id}`)}>
          <Group mb="sm">
            <ThemeIcon color="orange" radius="xl" size="lg"><IconRoute /></ThemeIcon>
            <Title order={4}>Mudanza Registrada</Title>
          </Group>
          <Stack gap="xs">

            <Paper withBorder radius="md" p="sm" key={renglon.mudanza.id}>
              <Group justify="space-between">
                <Text><strong>Origen:</strong> {renglon.mudanza.puntoOrigen}</Text>
                <Text><strong>Destino:</strong> {renglon.mudanza.puntoDestino}</Text>
              </Group>
              <Text><strong>Kilómetros:</strong> {renglon.mudanza.kilometrosRecorridos} km</Text>
              <Text><strong>Estado:</strong> <Badge color={renglon.mudanza.estado === 'Finalizada' ? 'green' : 'yellow'}>{renglon.mudanza.estado}</Badge></Text>
              <Text><strong>Fecha de Inicio:</strong> {format(new Date(renglon.mudanza.fechaInicio), 'dd/MM/yyyy', { locale: es })}</Text>
              {renglon.mudanza.notas && <Text><strong>Notas:</strong> {renglon.mudanza.notas}</Text>}
            </Paper>

          </Stack>
        </Paper>
      )}

      {/* <Collapse in={showOperaciones} mt="lg">
        <Paper withBorder p="lg" radius="md">
          <Text fw={700}>Operaciones de Campo</Text>
          <Text>🛠️ Detalles como fechas, tiempo total, motivo de inactividad, personal asignado…</Text>
        </Paper>
      </Collapse>

      <Collapse in={showConsumos} mt="lg">
        <Paper withBorder p="lg" radius="md">
          <Text fw={700}>Consumos de Alimento</Text>
          <Text>🍽️ Listado con fechas, cantidad de personas y tipo de comida</Text>
        </Paper>
      </Collapse> */}

      {/* Modal */}
      {
        modalOpened && (
          <EditRenglonModal
            opened={modalOpened}
            onClose={() => setModalOpened(false)}
            renglon={renglon}
            onUpdate={fetchRenglon}
          />
        )
      }
    </Container >
  );
}