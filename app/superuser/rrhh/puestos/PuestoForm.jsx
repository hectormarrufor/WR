// components/rrhh/PuestoForm.jsx
'use client';

import React, { useEffect } from 'react';
import { TextInput, Button, Group, Box, Paper, Title, Grid } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';

export function PuestoForm({ initialData = null }) {
  const router = useRouter();

  const form = useForm({
    initialValues: {
      nombre: '',
      descripcion: '',
    },
    validate: {
      nombre: (value) => (value ? null : 'El nombre del puesto es requerido'),
      descripcion: (value) => (value ? null : 'La descripción es requerida'),
    },
  });

  // Cargar datos iniciales si se está editando
  useEffect(() => {
    if (initialData) {
      form.setValues(initialData);
    }
  }, [initialData]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (values) => {
    let response;
    let url = '/api/rrhh/puestos';
    let method = 'POST';
    let successMessage = 'Puesto registrado exitosamente';
    let errorMessage = 'Error al registrar puesto';

    if (initialData) {
      url = `/api/rrhh/puestos/${initialData.id}`;
      method = 'PUT';
      successMessage = 'Puesto actualizado exitosamente';
      errorMessage = 'Error al actualizar puesto';
    }

    try {
      response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
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
      router.push('/superuser/rrhh/puestos'); // Redirigir al listado
    } catch (error) {
      console.error(errorMessage, error);
      notifications.show({
        title: 'Error',
        message: `${errorMessage}: ${error.message}`,
        color: 'red',
      });
    }
  };

  return (
    <Box maw={600} mx="auto">
      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <Title order={2} ta="center" mb="lg">
          {initialData ? 'Editar Puesto' : 'Registrar Nuevo Puesto'}
        </Title>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Grid gutter="md">
            <Grid.Col span={12}>
              <TextInput
                label="Nombre del Puesto"
                placeholder="Ej. Gerente de Operaciones"
                {...form.getInputProps('nombre')}
              />
            </Grid.Col>
            <Grid.Col span={12}>
              <TextInput
                label="Descripción"
                placeholder="Breve descripción del puesto y sus responsabilidades"
                {...form.getInputProps('descripcion')}
                multiline
                rows={3}
              />
            </Grid.Col>
            {/* Agrega aquí más campos si tu modelo Puesto los tiene */}
          </Grid>

          <Group justify="flex-end" mt="xl">
            <Button variant="default" onClick={() => router.back()}>
              Atras
            </Button>
            <Button type="submit">
              {initialData ? 'Actualizar Puesto' : 'Registrar Puesto'}
            </Button>
          </Group>
        </form>
      </Paper>
    </Box>
  );
}