// app/superuser/operaciones-campo/[id]/editar/page.js
'use client';

import { useEffect, useState } from 'react';
import { Container, Text, Center, Loader } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { OperacionCampoForm } from '../../componentes/OperacionCampoForm';

export default function EditarOperacionCampoPage({ params }) {
  const { id } = params;
  const [operacionData, setOperacionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOperacion = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const response = await fetch(`/api/contratos/operaciones-campo/${id}`);
        if (!response.ok) {
          throw new Error(`Error al cargar los datos de la operación: ${response.statusText}`);
        }
        const data = await response.json();
        setOperacionData(data);
      } catch (err) {
        console.error('Failed to fetch operacion for editing:', err);
        setError(err);
        notifications.show({
          title: 'Error',
          message: `No se pudo cargar la operación: ${err.message}`,
          color: 'red',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchOperacion();
  }, [id]);

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Center style={{ height: '300px' }}>
          <Loader size="lg" />
          <Text ml="md">Cargando datos de la operación...</Text>
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

  if (!operacionData) {
    return (
      <Container size="xl" py="xl">
        <Center style={{ height: '300px' }}>
          <Text>Operación no encontrada.</Text>
        </Center>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <OperacionCampoForm initialData={operacionData} />
    </Container>
  );
}