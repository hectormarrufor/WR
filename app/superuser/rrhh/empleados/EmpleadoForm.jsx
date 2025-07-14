// components/rrhh/EmpleadoForm.jsx
'use client';

import React, { useEffect } from 'react';
import { TextInput, Button, Group, Box, Paper, Title, Grid, Switch } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation'; // o 'next/router'

export function EmpleadoForm({ initialData = null }) {
  const router = useRouter();

  const form = useForm({
    initialValues: {
      cedula: '',
      nombre: '',
      apellido: '',
      telefono: '',
      email: '',
      direccion: '',
      fechaContratacion: null, // Mantine DateInput usa Date objects
      activo: true,
      // Considera otros campos como 'puestoId' si se asigna desde aquí, o dejarlo en asignación de puestos
    },
    validate: {
      cedula: (value) => (value ? null : 'La cédula es requerida'),
      nombre: (value) => (value ? null : 'El nombre es requerido'),
      apellido: (value) => (value ? null : 'El apellido es requerido'),
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Email inválido'),
      fechaContratacion: (value) => (value ? null : 'La fecha de contratación es requerida'),
    },
  });

  // Cargar datos iniciales si se está editando
  useEffect(() => {
    if (initialData) {
      form.setValues({
        ...initialData,
        fechaContratacion: initialData.fechaContratacion ? new Date(initialData.fechaContratacion) : null,
      });
    }
  }, [initialData]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (values) => {
    const payload = {
      ...values,
      // Formatear la fecha para la API si es necesario (ej. a ISO string)
      fechaContratacion: values.fechaContratacion ? values.fechaContratacion.toISOString().split('T')[0] : null,
    };

    let response;
    let url = '/api/rrhh/empleados';
    let method = 'POST';
    let successMessage = 'Empleado registrado exitosamente';
    let errorMessage = 'Error al registrar empleado';

    if (initialData) {
      url = `/api/rrhh/empleados/${initialData.id}`;
      method = 'PUT';
      successMessage = 'Empleado actualizado exitosamente';
      errorMessage = 'Error al actualizar empleado';
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
        throw new Error(errorData.message || response.statusText);
      }

      notifications.show({
        title: 'Éxito',
        message: successMessage,
        color: 'green',
      });
      router.push('/superuser/rrhh/empleados'); // Redirigir al listado
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
    <Box maw={800} mx="auto">
      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <Title order={2} ta="center" mb="lg">
          {initialData ? 'Editar Empleado' : 'Registrar Nuevo Empleado'}
        </Title>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Grid gutter="md">
            <Grid.Col span={{ base: 12, md: 6 }}>
              <TextInput
                label="Cédula"
                placeholder="V-12345678"
                {...form.getInputProps('cedula')}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <TextInput
                label="Nombre"
                placeholder="Juan"
                {...form.getInputProps('nombre')}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <TextInput
                label="Apellido"
                placeholder="Pérez"
                {...form.getInputProps('apellido')}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <TextInput
                label="Teléfono"
                placeholder="0412-1234567"
                {...form.getInputProps('telefono')}
              />
            </Grid.Col>
            <Grid.Col span={12}>
              <TextInput
                label="Email"
                placeholder="juan.perez@example.com"
                {...form.getInputProps('email')}
              />
            </Grid.Col>
            <Grid.Col span={12}>
              <TextInput
                label="Dirección"
                placeholder="Calle, Ciudad, Estado, País"
                {...form.getInputProps('direccion')}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <DateInput
                label="Fecha de Contratación"
                placeholder="Selecciona una fecha"
                valueFormat="DD/MM/YYYY"
                {...form.getInputProps('fechaContratacion')}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Switch
                label="Activo"
                checked={form.values.activo}
                {...form.getInputProps('activo', { type: 'checkbox' })}
                size="lg"
                onLabel="SÍ"
                offLabel="NO"
                mt="xl"
              />
            </Grid.Col>
          </Grid>

          <Group justify="flex-end" mt="xl">
            <Button variant="default" onClick={() => router.back()}>
              Cancelar
            </Button>
            <Button type="submit">
              {initialData ? 'Actualizar Empleado' : 'Registrar Empleado'}
            </Button>
          </Group>
        </form>
      </Paper>
    </Box>
  );
}