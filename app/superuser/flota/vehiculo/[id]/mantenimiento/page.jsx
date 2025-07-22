// app/superuser/flota/[id]/mantenimiento/page.jsx
'use client';

import { Container, Title, Text, Paper, Group, Button, Box, Divider, Badge, Center, Loader, Card, SimpleGrid } from '@mantine/core';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { notifications } from '@mantine/notifications';
import { httpGet } from '../../../../../ApiFunctions/httpServices'; // Asegúrate de la ruta correcta
import BackButton from '../../../../../components/BackButton';
import { IconTools, IconPlus, IconEye } from '@tabler/icons-react';

export default function ListaMantenimientosPage() {
  const router = useRouter();
  const { id: vehiculoId } = useParams(); // ID del vehículo

  const [vehiculo, setVehiculo] = useState(null);
  const [mantenimientos, setMantenimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchVehiculoAndMantenimientos = useCallback(async () => {
    setLoading(true);
    try {
      // Primero, obtenemos los detalles del vehículo (para el encabezado)
      const vehiculoData = await httpGet(`/api/vehiculos/${vehiculoId}`);
      if (!vehiculoData) {
        throw new Error('Vehículo no encontrado.');
      }
      setVehiculo(vehiculoData);

      // Luego, obtenemos todos los mantenimientos para este vehículo
      // Asumo que tu API /api/vehiculos/[id] ya incluye los mantenimientos
      // o que tienes un endpoint como /api/vehiculos/[id]/mantenimientos
      // Si solo /api/vehiculos/[id] trae los mantenimientos, los usamos directamente de vehiculoData
      // Si tienes un endpoint dedicado, sería: const mantenimientosData = await httpGet(`/api/vehiculos/${vehiculoId}/mantenimientos`);
      
      if (vehiculoData.mantenimientos) {
        setMantenimientos(vehiculoData.mantenimientos.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      } else {
        // Si no vienen con el vehículo principal, podrías hacer otra llamada aquí
        // Por ahora, asumimos que están en vehiculoData o que el endpoint general es el que manda
        console.warn("Mantenimientos no encontrados directamente en el objeto del vehículo. Asegúrate de que la API los incluya.");
        setMantenimientos([]);
      }

    } catch (err) {
      console.error('Error al cargar datos del vehículo o mantenimientos:', err);
      setError(err.message);
      notifications.show({
        title: 'Error',
        message: `No se pudieron cargar los mantenimientos: ${err.message}`,
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  }, [vehiculoId]);

  useEffect(() => {
    if (vehiculoId) {
      fetchVehiculoAndMantenimientos();
    }
  }, [vehiculoId, fetchVehiculoAndMantenimientos]);

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Center style={{ height: '300px' }}>
          <Loader size="lg" />
          <Text ml="md">Cargando lista de mantenimientos...</Text>
        </Center>
      </Container>
    );
  }

  if (error || !vehiculo) {
    return (
      <Container size="xl" py="xl">
        <Center style={{ height: '300px' }}>
          <Text color="red">Error: {error || 'Vehículo no encontrado.'}</Text>
        </Center>
      </Container>
    );
  }

  return (
    <Paper size="xl" p="xl" mt={60} mx={50}>
      <Group justify="space-between" mb="lg">
        <BackButton onClick={() => router.push(`/superuser/flota/vehiculo/${vehiculoId}`)} />
        <Title order={2} ta="center">
          Mantenimientos para: {vehiculo.marca} {vehiculo.modelo} ({vehiculo.placa})
        </Title>
        <Button
          leftSection={<IconPlus size={18} />}
          onClick={() => router.push(`/superuser/flota/vehiculo/${vehiculoId}/mantenimiento/nueva`)}
          color="blue"
        >
          Crear Nuevo Mantenimiento
        </Button>
      </Group>

      <Divider my="lg" />

      {mantenimientos.length === 0 ? (
        <Paper withBorder shadow="md" p="xl" radius="md" ta="center">
          <Text size="lg" color="dimmed">No hay órdenes de mantenimiento registradas para este vehículo.</Text>
        </Paper>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
          {mantenimientos.map((mantenimientoItem) => (
            <Card key={mantenimientoItem.id} shadow="sm" p="lg" radius="md" withBorder>
              <Group justify="space-between" mb="xs">
                <Text fw={700}>Orden # {mantenimientoItem.id}</Text>
                <Badge color={
                  mantenimientoItem.estado === 'Completado' ? 'green' :
                  mantenimientoItem.estado === 'Pendiente' ? 'orange' :
                  mantenimientoItem.estado === 'En Progreso' ? 'yellow' :
                  'gray'
                }>
                  {mantenimientoItem.estado}
                </Badge>
              </Group>

              <Text size="sm" c="dimmed">Tipo: {mantenimientoItem.tipo}</Text>
              <Text size="sm" c="dimmed">Fecha Inicio: {new Date(mantenimientoItem.fechaInicio).toLocaleDateString('es-VE')}</Text>
              {mantenimientoItem.fechaCompletado && (
                <Text size="sm" c="dimmed">Fecha Completado: {new Date(mantenimientoItem.fechaCompletado).toLocaleDateString('es-VE')}</Text>
              )}
              <Text size="sm" c="dimmed">Kilometraje: {mantenimientoItem.kilometrajeMantenimiento} km</Text>
              {mantenimientoItem.horometroMantenimiento > 0 && (
                <Text size="sm" c="dimmed">Horómetro: {mantenimientoItem.horometroMantenimiento} horas</Text>
              )}
              <Text size="sm" c="dimmed" mt="xs">{mantenimientoItem.descripcionGeneral}</Text>

              <Button
                variant="light"
                color="blue"
                fullWidth
                mt="md"
                radius="md"
                leftSection={<IconEye size={16} />}
                onClick={() => router.push(`/superuser/flota/vehiculo/${vehiculoId}/mantenimiento/${mantenimientoItem.id}`)}
              >
                Ver Detalles
              </Button>
            </Card>
          ))}
        </SimpleGrid>
      )}
    </Paper>
  );
}