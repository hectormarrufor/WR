// app/superuser/rrhh/empleados/[id]/editar/page.js
'use client';

import { useEffect, useState } from 'react';
import { EmpleadoForm } from '@/components/rrhh/EmpleadoForm';
import { Container, Text, Center, Loader } from '@mantine/core';
import { notifications } from '@mantine/notifications';

export default function EditarEmpleadoPage({ params }) {
  const { id } = params; // El ID del empleado viene de los parámetros de la URL
  const [empleadoData, setEmpleadoData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEmpleado = async () => {
      if (!id) return; // Asegurarse de que el ID esté disponible
      setLoading(true);
      try {
        const response = await fetch(`/api/rrhh/empleados/${id}`);
        if (!response.ok) {
          throw new Error(`Error al cargar los datos del empleado: ${response.statusText}`);
        }
        const data = await response.json();
        setEmpleadoData(data);
      } catch (err) {
        console.error('Failed to fetch employee for editing:', err);
        setError(err);
        notifications.show({
          title: 'Error',
          message: `No se pudo cargar el empleado: ${err.message}`,
          color: 'red',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchEmpleado();
  }, [id]);

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Center style={{ height: '300px' }}>
          <Loader size="lg" />
          <Text ml="md">Cargando datos del empleado...</Text>
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

  if (!empleadoData) {
    return (
      <Container size="xl" py="xl">
        <Center style={{ height: '300px' }}>
          <Text>Empleado no encontrado.</Text>
        </Center>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <EmpleadoForm initialData={empleadoData} />
    </Container>
  );
}