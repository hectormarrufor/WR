// src/app/superuser/servicios-adquiridos/[id]/mudanzas/editar/page.jsx
'use client';

import React, { use, useEffect, useState } from 'react';
import { Container, Title, Center, Loader, Text, Box } from '@mantine/core';
import { useParams } from 'next/navigation';
import { notifications } from '@mantine/notifications';
import { MudanzaForm } from '../../../../mudanzas/componentes/MudanzaForm';

export default function EditMudanzaPage() {
  const params = useParams();
  const { id: renglonId } = use(params); // Este 'id' es el renglonContratoId
  const [mudanzaData, setMudanzaData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchMudanzaForRenglon() {
      if (!renglonId) {
        setLoading(false);
        setError('ID de servicio/fase no proporcionado.');
        return;
      }

      try {
        // Asumimos que hay una API para obtener las mudanzas por renglonContratoId
        // O, si tu API de renglones ya incluye las mudanzas, la usaremos.
        // Dada tu API de renglones, vamos a usarla para obtener las mudanzas asociadas.
        const response = await fetch(`/api/contratos/renglones/${renglonId}`); // Usamos la primera API que definiste
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Error al cargar el renglón ${renglonId}`);
        }

        const renglonInfo = await response.json();
        
        // Asumiendo que `renglonInfo.mudanzas` es un array y solo debe haber una
        if (renglonInfo.mudanzas && renglonInfo.mudanzas.length > 0) {
          setMudanzaData(renglonInfo.mudanzas[0]); // Toma la primera (y única) mudanza
        } else {
          setError(`No se encontró ninguna mudanza para el servicio/fase ID: ${renglonId}.`);
        }
      } catch (err) {
        console.error('Error al cargar la mudanza para edición:', err);
        notifications.show({
          title: 'Error de Carga',
          message: `No se pudo cargar la mudanza: ${err.message}.`,
          color: 'red',
        });
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchMudanzaForRenglon();
  }, [renglonId]);

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Center>
          <Loader size="xl" />
          <Text ml="md">Cargando datos de la mudanza...</Text>
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

  // Si no hay mudanzaData y no hubo error de carga (es decir, mudanzas.length fue 0)
  if (!mudanzaData) {
    return (
      <Container size="xl" py="xl">
        <Center>
          <Text c="dimmed">No se ha registrado una mudanza para este servicio/fase. No se puede editar.</Text>
        </Center>
      </Container>
    );
  }

  return (
    <Box>
      {/* El MudanzaForm ahora recibe los datos de la mudanza encontrada */}
      <MudanzaForm initialData={mudanzaData} />
    </Box>
  );
}