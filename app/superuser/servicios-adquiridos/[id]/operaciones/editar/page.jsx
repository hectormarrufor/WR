// src/app/superuser/operaciones-campo/editar/[id]/page.jsx
'use client';

import React, { use, useEffect, useState } from 'react';
import { Container, Title, Center, Loader, Text, Box } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { OperacionCampoForm } from '../../../../operaciones-campo/componentes/OperacionCampoForm';

export default function EditOperacionCampoPage({params}) {
  const { id } = use(params); // Este 'id' es el ID de la operación de campo
  console.log(id);
  

  const [operacionData, setOperacionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchOperacionData() {
      if (!id) {
        setLoading(false);
        setError('ID de operación de campo no proporcionado.');
        return;
      }

      try {
        // Hacemos una llamada a la API para obtener la información de la operación de campo
        // Asume que tienes una API como `/api/contratos/operaciones-campo/[id]`
        const response = await fetch(`/api/contratos/renglones/${id}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Error al cargar la operación ${id}`);
        }

        const data = await response.json();
        console.log(data)
        setOperacionData(data); // Guarda toda la información de la operación
      } catch (err) {
        console.error('Error al cargar la operación de campo para edición:', err);
        notifications.show({
          title: 'Error de Carga',
          message: `No se pudo cargar la operación de campo: ${err.message}.`,
          color: 'red',
        });
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchOperacionData();
  }, [id]);

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Center>
          <Loader size="xl" />
          <Text ml="md">Cargando datos de la operación de campo...</Text>
        </Center>
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="xl" py="xl">
        <Center>
          <Text c="red">Error: {error}</Text>
        </Center>
      </Container>
    );
  }

  // Si no se encontró la operación pero no hubo error HTTP
  if (!operacionData) {
    return (
      <Container size="xl" py="xl">
        <Center>
          <Text c="dimmed">No se encontró la operación de campo con ID: {id}.</Text>
        </Center>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      {/* El OperacionCampoForm recibe los datos completos de la operación encontrada */}
      <OperacionCampoForm initialData={operacionData} />
    </Container>
  );
}