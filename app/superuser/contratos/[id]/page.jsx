// src/app/superuser/contratos/[id]/page.jsx
'use client';

import React, { useEffect, useState, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Title, Text, Loader, Center, Group, Button, Paper, Divider, Grid } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconArrowLeft } from '@tabler/icons-react';
import { ContratoDetailCard } from '../ContratoDetailCard';
import { RenglonContratoDetail } from '../RenglonContratoDetail';
import { EditRenglonModal } from '../EditRenglonModal';

export default function ContratoDetailPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const [contrato, setContrato] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpened, setModalOpened] = useState(false);
  const [selectedRenglon, setSelectedRenglon] = useState(null);

  const fetchContrato = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/contratos/${id}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al cargar el contrato');
      }
      const data = await response.json();
      setContrato(data);
    } catch (err) {
      console.error('Error fetching contrato:', err);
      setError(err.message);
      notifications.show({
        title: 'Error',
        message: err.message,
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchContrato();
    }
  }, [id, fetchContrato]);

  const handleOpenEditRenglon = (renglon) => {
    setSelectedRenglon(renglon);
    setModalOpened(true);
  };

  const handleRenglonUpdated = () => {
    setModalOpened(false);
    setSelectedRenglon(null);
    fetchContrato(); // Volver a cargar el contrato para ver los cambios actualizados
  };

  if (loading) {
    return (
      <Center style={{ height: '80vh' }}>
        <Loader size="xl" />
      </Center>
    );
  }

  if (error) {
    return (
      <Container size="md" mt="xl">
        <Paper   shadow="md" p={30} radius="md" ta="center">
          <Title order={3} color="red">¡Error!</Title>
          <Text color="dimmed" mt="sm">{error}</Text>
          <Button variant="light" onClick={() => router.back()} mt="md">
            <IconArrowLeft size={16} style={{ marginRight: 8 }} /> Volver
          </Button>
        </Paper>
      </Container>
    );
  }

  if (!contrato) {
    return (
      <Container size="md" mt="xl">
        <Paper   shadow="md" p={30} radius="md" ta="center">
          <Title order={3}>Contrato No Encontrado</Title>
          <Text color="dimmed" mt="sm">El contrato con ID "{id}" no existe o ha sido eliminado.</Text>
          <Button variant="light" onClick={() => router.back()} mt="md">
            <IconArrowLeft size={16} style={{ marginRight: 8 }} /> Volver
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Paper size="lg" py="xl" mx={50} px={50} mt={60}>
      <Group justify="space-between" mb="lg">
        <Button variant="default" onClick={() => router.back()} leftSection={<IconArrowLeft size={16} />}>
          Volver a Contratos
        </Button>
        <Title order={2}>Detalles del Contrato: {contrato.numeroContrato}</Title>
        <div style={{width: 150}}></div> {/* Espaciador para centrar el título */}
      </Group>

      {/* Tarjeta de Detalles del Contrato General */}
      <ContratoDetailCard contrato={contrato} />

      {/* Sección de Renglones del Contrato */}
      <Divider my="xl" label="Fases/Renglones de Servicio" labelPosition="center" />

      {contrato.renglones && contrato.renglones.length > 0 ? (
        <Grid gutter="md">
          {contrato.renglones.sort((a, b) => new Date(a.fechaInicioEstimada) - new Date(b.fechaInicioEstimada)).map((renglon) => (
            <Grid.Col key={renglon.id} span={{ base: 12, sm: 6, md: 4 }}>
              <RenglonContratoDetail  renglon={renglon} onEdit={handleOpenEditRenglon} />
            </Grid.Col>
          ))}
        </Grid>
      ) : (
        <Text color="dimmed" ta="center" mt="md">Este contrato no tiene fases/renglones asociados.</Text>
      )}

      {/* Modal para editar renglón */}
      {selectedRenglon && (
        <EditRenglonModal
          opened={modalOpened}
          onClose={() => setModalOpened(false)}
          renglon={selectedRenglon}
          onUpdate={handleRenglonUpdated}
        />
      )}
    </Paper>
  );
}