// app/superuser/contratos/[id]/editar/page.js
'use client';

import { use, useEffect, useState } from 'react';
import { Container, Text, Center, Loader } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { ContratoForm } from '../../contratoForm';

export default function EditarContratoPage({ params }) {
  const { id } = use(params);
  const [contratoData, setContratoData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchContrato = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const response = await fetch(`/api/contratos/${id}`);
        if (!response.ok) {
          throw new Error(`Error al cargar los datos del contrato: ${response.statusText}`);
        }
        const data = await response.json();
        setContratoData(data);
      } catch (err) {
        console.error('Failed to fetch contrato for editing:', err);
        setError(err);
        notifications.show({
          title: 'Error',
          message: `No se pudo cargar el contrato: ${err.message}`,
          color: 'red',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchContrato();
  }, [id]);

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Center style={{ height: '300px' }}>
          <Loader size="lg" />
          <Text ml="md">Cargando datos del contrato...</Text>
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

  if (!contratoData) {
    return (
      <Container size="xl" py="xl">
        <Center style={{ height: '300px' }}>
          <Text>Contrato no encontrado.</Text>
        </Center>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <ContratoForm initialData={contratoData} />
    </Container>
  );
}