// app/superuser/flota/[id]/nuevaInspeccion/page.jsx
'use client';

import { Container, Title, Text, Center, Loader, Box, Paper } from '@mantine/core';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { notifications } from '@mantine/notifications';
import { InspeccionForm } from './InspeccionForm';
import { httpGet } from '../../../../ApiFunctions/httpServices';

export default function NuevaInspeccionPage() {
  const { id } = useParams(); // ID del vehículo
  const [vehiculo, setVehiculo] = useState(null);
  const [lastInspection, setLastInspection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const vehiculoData = await httpGet(`/api/vehiculos/${id}`);
        if (!vehiculoData) {
          throw new Error('Vehículo no encontrado.');
        }
        setVehiculo(vehiculoData);

        // Obtener la última inspección para precargar kilometraje/horómetro
        // Tu API /api/vehiculos/[id] ya incluye `inspecciones`, así que podemos usarla
        if (vehiculoData.inspecciones && vehiculoData.inspecciones.length > 0) {
          setLastInspection(vehiculoData.inspecciones[0]); // La última inspección ya viene primero por el order
        }
      } catch (err) {
        console.error('Error al cargar datos del vehículo o última inspección:', err);
        setError(err.message);
        notifications.show({
          title: 'Error',
          message: `No se pudieron cargar los datos del vehículo: ${err.message}`,
          color: 'red',
        });
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchData();
    }
  }, [id]);

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Center style={{ height: '300px' }}>
          <Loader size="lg" />
          <Text ml="md">Cargando datos del vehículo para la inspección...</Text>
        </Center>
      </Container>
    );
  }

  if (error || !vehiculo) {
    return (
      <Container size="xl" py="xl">
        <Center style={{ height: '300px' }}>
          <Text color="red">Error: {error || 'Vehículo no encontrado para registrar inspección.'}</Text>
        </Center>
      </Container>
    );
  }

  return (
    <Paper size="xl" py="xl" mx={50} mt={70} px="sm">
      <Title order={2} ta="center" mb="lg">
        Nueva Inspección para: {vehiculo.marca} {vehiculo.modelo} ({vehiculo.placa})
      </Title>
      <InspeccionForm vehiculoId={id} lastInspectionData={lastInspection} />
    </Paper>
  );
}