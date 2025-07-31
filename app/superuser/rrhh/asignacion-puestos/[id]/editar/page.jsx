// app/superuser/rrhh/asignacion-puestos/[id]/editar/page.js
'use client';

import { use, useEffect, useState } from 'react';
import { Container, Text, Center, Loader } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { AsignacionPuestoForm } from '../../AsignacionPuestoForm';

export default function EditarAsignacionPuestoPage({ params }) {
  const { id } = use(params);
  const [asignacionData, setAsignacionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAsignacion = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const response = await fetch(`/api/rrhh/asignacion-puestos/${id}`);
        if (!response.ok) {
          throw new Error(`Error al cargar los datos de la asignación: ${response.statusText}`);
        }
        const data = await response.json();
        setAsignacionData(data);
      } catch (err) {
        console.error('Failed to fetch asignacion for editing:', err);
        setError(err);
        notifications.show({
          title: 'Error',
          message: `No se pudo cargar la asignación: ${err.message}`,
          color: 'red',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAsignacion();
  }, [id]);

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Center style={{ height: '300px' }}>
          <Loader size="lg" />
          <Text ml="md">Cargando datos de la asignación...</Text>
        </Center>
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="xl" py="xl">
        <Center style={{ height: '300px' }}>
          <Text color="red">Error: {error.message}</Text>
        </Center>
      </Container>
    );
  }

  if (!asignacionData) {
    return (
      <Container size="xl" py="xl">
        <Center style={{ height: '300px' }}>
          <Text>Asignación no encontrada.</Text>
        </Center>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <AsignacionPuestoForm initialData={asignacionData} />
    </Container>
  );
}