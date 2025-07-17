// components/operaciones-campo/OperacionCampoForm.jsx
'use client';

import React, { useEffect, useState } from 'react';
import { TextInput, Button, Group, Box, Paper, Title, Grid, Loader, Center, Select, Textarea } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';

export function OperacionCampoForm({ initialData = null }) {
  const router = useRouter();
  const [contratos, setContratos] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [errorOptions, setErrorOptions] = useState(null);

  const form = useForm({
    initialValues: {
      nombre: '', // O un campo como 'codigoOperacion'
      contratoId: '',
      fechaInicio: null,
      fechaFinEstimada: null,
      estado: 'Planificada', // Estado inicial por defecto
      tipoOperacion: '', // Ej. 'Mudanza Residencial', 'Transporte de Carga'
      descripcion: '',
    },
    validate: {
      nombre: (value) => (value ? null : 'El nombre/código de la operación es requerido'),
      contratoId: (value) => (value ? null : 'Seleccionar un contrato es requerido'),
      fechaInicio: (value) => (value ? null : 'La fecha de inicio es requerida'),
      estado: (value) => (value ? null : 'El estado de la operación es requerido'),
      tipoOperacion: (value) => (value ? null : 'El tipo de operación es requerido'),
    },
  });

  // Cargar datos iniciales si se está editando
  useEffect(() => {
    if (initialData) {
      form.setValues({
        ...initialData,
        contratoId: initialData.contratoId.toString(), // Convertir a string para el Select
        fechaInicio: initialData.fechaInicio ? new Date(initialData.fechaInicio) : null,
        fechaFinEstimada: initialData.fechaFinEstimada ? new Date(initialData.fechaFinEstimada) : null,
      });
    }
  }, [initialData]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cargar opciones para Selects (contratos)
  useEffect(() => {
    const fetchOptions = async () => {
      setLoadingOptions(true);
      setErrorOptions(null);
      try {
        // Asegúrate de que esta API exista y retorne un array de contratos con 'id' y 'numeroContrato'
        const contratosRes = await fetch('/api/contratos');
        if (!contratosRes.ok) throw new Error('Error al cargar contratos.');

        const contratosData = await contratosRes.json();
        setContratos(contratosData.map(c => ({ value: c.id.toString(), label: c.numeroContrato })));
      } catch (err) {
        console.error('Error loading form options:', err);
        setErrorOptions(err);
        notifications.show({
          title: 'Error de Carga',
          message: 'No se pudieron cargar las opciones de contratos.',
          color: 'red',
        });
      } finally {
        setLoadingOptions(false);
      }
    };

    fetchOptions();
  }, []);

  const handleSubmit = async (values) => {
    const payload = {
      ...values,
      contratoId: parseInt(values.contratoId), // Convertir a número para la API
      // Formatear las fechas a ISO string (YYYY-MM-DD)
      fechaInicio: values.fechaInicio ? values.fechaInicio.toISOString().split('T')[0] : null,
      fechaFinEstimada: values.fechaFinEstimada ? values.fechaFinEstimada.toISOString().split('T')[0] : null,
    };

    let response;
    let url = '/api/contratos/operaciones-campo';
    let method = 'POST';
    let successMessage = 'Operación registrada exitosamente';
    let errorMessage = 'Error al registrar operación';

    if (initialData) {
      url = `/api/contratos/operaciones-campo/${initialData.id}`;
      method = 'PUT';
      successMessage = 'Operación actualizada exitosamente';
      errorMessage = 'Error al actualizar operación';
    }

    try {
      response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || response.statusText);
      }

      notifications.show({
        title: 'Éxito',
        message: successMessage,
        color: 'green',
      });
      router.push('/superuser/operaciones-campo'); // Redirigir al listado
    } catch (error) {
      console.error(errorMessage, error);
      notifications.show({
        title: 'Error',
        message: `${errorMessage}: ${error.message}`,
        color: 'red',
      });
    }
  };

  if (loadingOptions) {
    return (
      <Container size="xl" py="xl">
        <Center style={{ height: '300px' }}>
          <Loader size="lg" />
          <Text ml="md">Cargando opciones de contratos...</Text>
        </Center>
      </Container>
    );
  }

  if (errorOptions) {
    return (
      <Container size="xl" py="xl">
        <Center style={{ height: '300px' }}>
          <Text color="red">Error al cargar opciones: {errorOptions.message}</Text>
        </Center>
      </Container>
    );
  }

  return (
    <Box maw={800} mx="auto">
      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <Title order={2} ta="center" mb="lg">
          {initialData ? 'Editar Operación de Campo' : 'Registrar Nueva Operación de Campo'}
        </Title>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Grid gutter="md">
            <Grid.Col span={{ base: 12, md: 6 }}>
              <TextInput
                label="Nombre / Código de Operación"
                placeholder="Ej. OP-2025-001"
                {...form.getInputProps('nombre')}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Select
                label="Contrato Asociado"
                placeholder="Selecciona un contrato"
                data={contratos}
                searchable
                {...form.getInputProps('contratoId')}
                disabled={!!initialData} // No permitir cambiar el contrato de una operación ya creada
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <DateInput
                label="Fecha de Inicio"
                placeholder="Selecciona la fecha de inicio"
                valueFormat="DD/MM/YYYY"
                {...form.getInputProps('fechaInicio')}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <DateInput
                label="Fecha Fin Estimada"
                placeholder="Selecciona la fecha de fin estimada"
                valueFormat="DD/MM/YYYY"
                {...form.getInputProps('fechaFinEstimada')}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Select
                label="Estado de la Operación"
                placeholder="Selecciona el estado"
                data={['Planificada', 'En Progreso', 'En Pausa', 'Finalizada', 'Cancelada']} // Ajusta a tus estados de Prisma
                {...form.getInputProps('estado')}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Select
                label="Tipo de Operación"
                placeholder="Selecciona el tipo"
                data={['Mudanza Residencial', 'Transporte de Carga', 'Servicio a Domicilio', 'Mantenimiento Preventivo']} // Ajusta a tus tipos de operación
                {...form.getInputProps('tipoOperacion')}
              />
            </Grid.Col>
            <Grid.Col span={12}>
              <Textarea
                label="Descripción de la Operación"
                placeholder="Detalles sobre lo que implica la operación"
                {...form.getInputProps('descripcion')}
                rows={3}
              />
            </Grid.Col>
          </Grid>

          <Group justify="flex-end" mt="xl">
            <Button variant="default" onClick={() => router.back()}>
              Cancelar
            </Button>
            <Button type="submit">
              {initialData ? 'Actualizar Operación' : 'Registrar Operación'}
            </Button>
          </Group>
        </form>
      </Paper>
    </Box>
  );
}