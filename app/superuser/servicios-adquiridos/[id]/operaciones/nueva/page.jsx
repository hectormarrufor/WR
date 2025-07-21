// src/app/superuser/servicios-adquiridos/[id]/operaciones/nueva/page.jsx
'use client';

import React, { use, useEffect, useState } from 'react';
import { Container, Title, Center, Loader, Text, Box } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { OperacionCampoForm } from '../../../../operaciones-campo/componentes/OperacionCampoForm';


export default function NuevaOperacionCampoParaRenglonPage({params}) {
  const { id: renglonIdFromUrl } = use(params); // Este 'id' es el renglonContratoId de la URL

  const [renglonInfo, setRenglonInfo] = useState(null);
  const [loadingRenglon, setLoadingRenglon] = useState(true);
  const [errorRenglon, setErrorRenglon] = useState(null);

  useEffect(() => {
    async function fetchRenglonData() {
      if (!renglonIdFromUrl) {
        setLoadingRenglon(false);
        setErrorRenglon('ID de servicio/fase no proporcionado en la URL.');
        return;
      }

      try {
        // Hacemos una llamada a la API para obtener la información del renglón de contrato
        const response = await fetch(`/api/contratos/renglones/${renglonIdFromUrl}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Error al cargar el renglón ${renglonIdFromUrl}`);
        }

        const data = await response.json();
        setRenglonInfo(data); // Guarda toda la información del renglón
      } catch (err) {
        console.error('Error al cargar la información del renglón:', err);
        notifications.show({
          title: 'Error de Carga',
          message: `No se pudo cargar la información del servicio/fase: ${err.message}.`,
          color: 'red',
        });
        setErrorRenglon(err.message);
      } finally {
        setLoadingRenglon(false);
      }
    }

    fetchRenglonData();
  }, [renglonIdFromUrl]);

  if (loadingRenglon) {
    return (
      <Container size="xl" py="xl">
        <Center>
          <Loader size="xl" />
          <Text ml="md">Cargando información del servicio/fase...</Text>
        </Center>
      </Container>
    );
  }

  if (errorRenglon) {
    return (
      <Container size="xl" py="xl">
        <Center>
          <Text c="red">Error: {errorRenglon}</Text>
        </Center>
      </Container>
    );
  }

  // Si no se encontró el renglón pero no hubo error HTTP (e.g. API devolvió null)
  if (!renglonInfo) {
    return (
      <Container size="xl" py="xl">
        <Center>
          <Text c="dimmed">No se encontró el servicio/fase con ID: {renglonIdFromUrl}.</Text>
        </Center>
      </Container>
    );
  }

  // Prepara los initialValues para el formulario
  const initialValuesForForm = {
    nombre: `Operación para ${renglonInfo.nombreRenglon} - ${renglonInfo.pozoNombre}`, // Puedes personalizar el nombre inicial
    contratoId: renglonInfo.contratoId.toString(), // El ID del contrato asociado al renglón
    fechaInicio: renglonInfo.fechaInicioEstimada ? new Date(renglonInfo.fechaInicioEstimada) : null, // Fecha de inicio estimada del renglón
    fechaFinEstimada: renglonInfo.fechaFinEstimada ? new Date(renglonInfo.fechaFinEstimada) : null, // Fecha fin estimada del renglón
    estado: 'Planificada', // Mantener el estado inicial por defecto
    tipoOperacion: 'Operación de Campo General', // Puedes poner un valor por defecto o dejarlo vacío
    descripcion: `Operación de campo asociada al servicio/fase "${renglonInfo.nombreRenglon}" en el pozo "${renglonInfo.pozoNombre}".`, // Descripción por defecto
    renglonContratoId: renglonIdFromUrl
  };

  return (
    <Container size="xl" py="xl">
      <OperacionCampoForm initialData={initialValuesForForm} />
    </Container>
  );
}