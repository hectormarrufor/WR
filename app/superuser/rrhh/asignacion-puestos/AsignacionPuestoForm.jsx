// components/rrhh/AsignacionPuestoForm.jsx
'use client';

import React, { useEffect, useState } from 'react';
import { Select, Button, Group, Box, Paper, Title, Grid, Loader, Center, Switch, Container, Text } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';

export function AsignacionPuestoForm({ initialData = null }) {
  const router = useRouter();
  const [empleados, setEmpleados] = useState([]);
  const [puestos, setPuestos] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [errorOptions, setErrorOptions] = useState(null);

  const form = useForm({
    initialValues: {
      empleadoId: '',
      puestoId: '',
      fechaInicio: null,
      fechaFin: null,
      activo: true,
    },
    validate: {
      empleadoId: (value) => (value ? null : 'Seleccionar un empleado es requerido'),
      puestoId: (value) => (value ? null : 'Seleccionar un puesto es requerido'),
      fechaInicio: (value) => (value ? null : 'La fecha de inicio es requerida'),
      fechaFin: (value, values) => {
        if (!values.activo && !value) {
            return 'Si la asignación no está activa, la fecha de fin es requerida';
        }
        if (value && values.fechaInicio && value < values.fechaInicio) {
            return 'La fecha de fin no puede ser anterior a la fecha de inicio';
        }
        return null;
      },
    },
  });

  // Cargar datos iniciales si se está editando
  useEffect(() => {
    if (initialData) {
      form.setValues({
        ...initialData,
        // Convertir IDs a string para el Select si son números
        empleadoId: initialData.empleadoId.toString(),
        puestoId: initialData.puestoId.toString(),
        fechaInicio: initialData.fechaInicio ? new Date(initialData.fechaInicio) : null,
        fechaFin: initialData.fechaFin ? new Date(initialData.fechaFin) : null,
      });
    }
  }, [initialData]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cargar opciones para Selects (empleados y puestos)
  useEffect(() => {
    const fetchOptions = async () => {
      setLoadingOptions(true);
      setErrorOptions(null);
      try {
        const [empleadosRes, puestosRes] = await Promise.all([
          fetch('/api/rrhh/empleados'),
          fetch('/api/rrhh/puestos'),
        ]);

        if (!empleadosRes.ok) throw new Error('Error al cargar empleados.');
        if (!puestosRes.ok) throw new Error('Error al cargar puestos.');

        const empleadosData = await empleadosRes.json();
        const puestosData = await puestosRes.json();

        setEmpleados(empleadosData.map(e => ({ value: e.id.toString(), label: `${e.nombre} ${e.apellido}` })));
        setPuestos(puestosData.map(p => ({ value: p.id.toString(), label: p.nombre })));
      } catch (err) {
        console.error('Error loading form options:', err);
        setErrorOptions(err);
        notifications.show({
          title: 'Error de Carga',
          message: 'No se pudieron cargar las opciones de empleados o puestos.',
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
      // Convertir IDs de string a número para la API
      empleadoId: parseInt(values.empleadoId),
      puestoId: parseInt(values.puestoId),
      // Formatear las fechas a ISO string (YYYY-MM-DD)
      fechaInicio: values.fechaInicio ? values.fechaInicio.toISOString().split('T')[0] : null,
      fechaFin: values.fechaFin ? values.fechaFin.toISOString().split('T')[0] : null,
    };

    let response;
    let url = '/api/rrhh/asignacion-puestos';
    let method = 'POST';
    let successMessage = 'Asignación registrada exitosamente';
    let errorMessage = 'Error al registrar asignación';

    if (initialData) {
      url = `/api/rrhh/asignacion-puestos/${initialData.id}`;
      method = 'PUT';
      successMessage = 'Asignación actualizada exitosamente';
      errorMessage = 'Error al actualizar asignación';
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
      router.push('/superuser/rrhh/asignacion-puestos'); // Redirigir al listado
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
          <Text ml="md">Cargando opciones de empleados y puestos...</Text>
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
      <Paper   shadow="md" p={30} mt={30} radius="md">
        <Title order={2} ta="center" mb="lg">
          {initialData ? 'Editar Asignación de Puesto' : 'Registrar Nueva Asignación de Puesto'}
        </Title>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Grid gutter="md">
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Select
                label="Empleado"
                placeholder="Selecciona un empleado"
                data={empleados}
                searchable
                {...form.getInputProps('empleadoId')}
                disabled={!!initialData} // Deshabilitar si se está editando para evitar cambiar el empleado de una asignación existente
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Select
                label="Puesto"
                placeholder="Selecciona un puesto"
                data={puestos}
                searchable
                {...form.getInputProps('puestoId')}
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
                label="Fecha de Fin (Opcional)"
                placeholder="Selecciona la fecha de fin"
                valueFormat="DD/MM/YYYY"
                {...form.getInputProps('fechaFin')}
                disabled={form.values.activo} // Si está activa, la fecha de fin es opcional
              />
            </Grid.Col>
            <Grid.Col span={12}>
              <Switch
                label="Asignación Activa"
                checked={form.values.activo}
                {...form.getInputProps('activo', { type: 'checkbox' })}
                size="lg"
                onLabel="ACTIVA"
                offLabel="INACTIVA"
                mt="md"
                onChange={(event) => {
                    form.setFieldValue('activo', event.currentTarget.checked);
                    // Si se marca como activa, limpia la fecha de fin (si es lógica de negocio)
                    if (event.currentTarget.checked) {
                        form.setFieldValue('fechaFin', null);
                    }
                }}
              />
            </Grid.Col>
          </Grid>

          <Group justify="flex-end" mt="xl">
            <Button variant="default" onClick={() => router.back()}>
              Cancelar
            </Button>
            <Button type="submit">
              {initialData ? 'Actualizar Asignación' : 'Registrar Asignación'}
            </Button>
          </Group>
        </form>
      </Paper>
    </Box>
  );
}