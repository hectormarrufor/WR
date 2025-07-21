// app/superuser/flota/[id]/nuevaInspeccion/page.jsx
'use client';

import { Container, Title, Text, Center, Loader, Box, Paper } from '@mantine/core';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { notifications } from '@mantine/notifications';
import { InspeccionForm } from './InspeccionForm'; // Importa el componente del formulario
import { httpGet } from '../../../../ApiFunctions/httpServices';

export default function NuevaInspeccionPage() {
  const { id } = useParams(); // ID del vehículo
  const [vehiculo, setVehiculo] = useState(null);
  // No necesitamos 'lastInspection' directamente, obtendremos los valores de kilometraje/horómetro de 'vehiculo'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const vehiculoData = await httpGet(`/api/vehiculos/${id}`); ///route.js]
        if (!vehiculoData) {
          throw new Error('Vehículo no encontrado.');
        }
        setVehiculo(vehiculoData);

      } catch (err) {
        console.error('Error al cargar datos del vehículo:', err);
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

  // Extraer el último kilometraje y horómetro directamente de los arrays del vehículo
  const latestKilometraje = vehiculo.kilometrajes?.[0]?.kilometrajeActual || 0;
  const latestHorometro = vehiculo.horometros?.[0]?.horas || 0;

  return (
    <Paper size="xl" py="xl" mx={20} mt={70}>
      <Title order={2} ta="center" mb="lg">
        Nueva Inspección para: {vehiculo.marca} {vehiculo.modelo} ({vehiculo.placa})
      </Title>
      {/* Pasa el ID del vehículo y los últimos datos de kilometraje/horómetro */}
      <InspeccionForm 
        vehiculoId={id} 
        lastKnownKilometraje={latestKilometraje} 
        lastKnownHorometro={latestHorometro} 
      />
    </Paper>
  );
}