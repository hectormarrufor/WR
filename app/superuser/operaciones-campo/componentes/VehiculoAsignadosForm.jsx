// components/operaciones-campo/VehiculoAsignadoForm.jsx
'use client';

import React, { useEffect, useState } from 'react';
import { Select, Button, Group, Box, Paper, Title, Grid, Loader, Center, TextInput, Textarea } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';

export function VehiculoAsignadoForm({ operacionId, initialData = null, onSuccess, onCancel }) {
  const [vehiculos, setVehiculos] = useState([]);
  const [empleados, setEmpleados] = useState([]); // Asume que Empleados pueden ser conductores
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [errorOptions, setErrorOptions] = useState(null);

  const form = useForm({
    initialValues: {
      vehiculoId: '',
      empleadoId: '', // Conductor asignado al vehículo
      fechaAsignacion: null,
      fechaLiberacion: null,
      notas: '',
    },
    validate: {
      vehiculoId: (value) => (value ? null : 'Seleccionar un vehículo es requerido'),
      empleadoId: (value) => (value ? null : 'Seleccionar un conductor es requerido'),
      fechaAsignacion: (value) => (value ? null : 'La fecha de asignación es requerida'),
      fechaLiberacion: (value, values) => {
        if (value && values.fechaAsignacion && value < values.fechaAsignacion) {
          return 'La fecha de liberación no puede ser anterior a la fecha de asignación';
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
        vehiculoId: initialData.vehiculoId.toString(),
        empleadoId: initialData.empleadoId.toString(),
        fechaAsignacion: initialData.fechaAsignacion ? new Date(initialData.fechaAsignacion) : null,
        fechaLiberacion: initialData.fechaLiberacion ? new Date(initialData.fechaLiberacion) : null,
      });
    }
  }, [initialData]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cargar opciones para Selects (vehículos y empleados)
  useEffect(() => {
    const fetchOptions = async () => {
      setLoadingOptions(true);
      setErrorOptions(null);
      try {
        const [vehiculosRes, empleadosRes] = await Promise.all([
          fetch('/api/superuser/vehiculos'), // Asume esta API para listar vehículos
          fetch('/api/superuser/rrhh/empleados'), // API para listar empleados (conductores)
        ]);

        if (!vehiculosRes.ok) throw new Error('Error al cargar vehículos.');
        if (!empleadosRes.ok) throw new Error('Error al cargar empleados.');

        const vehiculosData = await vehiculosRes.json();
        const empleadosData = await empleadosRes.json();

        setVehiculos(vehiculosData.map(v => ({ value: v.id.toString(), label: `${v.marca} ${v.modelo} (${v.placa})` })));
        setEmpleados(empleadosData.map(e => ({ value: e.id.toString(), label: `${e.nombre} ${e.apellido}` })));
      } catch (err) {
        console.error('Error loading form options:', err);
        setErrorOptions(err);
        notifications.show({
          title: 'Error de Carga',
          message: 'No se pudieron cargar las opciones de vehículos o empleados.',
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
      operacionCampoId: operacionId, // Asegura que la asignación se vincule a la operación correcta
      vehiculoId: parseInt(values.vehiculoId),
      empleadoId: parseInt(values.empleadoId),
      fechaAsignacion: values.fechaAsignacion ? values.fechaAsignacion.toISOString().split('T')[0] : null,
      fechaLiberacion: values.fechaLiberacion ? values.fechaLiberacion.toISOString().split('T')[0] : null,
    };

    let response;
    let url = `/api/superuser/operaciones-campo/${operacionId}/vehiculos`; // Ruta POST para crear
    let method = 'POST';
    let successMessage = 'Vehículo asignado exitosamente';
    let errorMessage = 'Error al asignar vehículo';

    if (initialData) {
      url = `/api/superuser/operaciones-campo/${operacionId}/vehiculos/${initialData.id}`; // Ruta PUT para actualizar
      method = 'PUT';
      successMessage = 'Asignación de vehículo actualizada exitosamente';
      errorMessage = 'Error al actualizar asignación de vehículo';
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
      onSuccess(); // Llama a la función de éxito para cerrar el modal y recargar la tabla
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
      <Center style={{ height: '200px' }}>
        <Loader size="lg" />
        <Text ml="md">Cargando opciones...</Text>
      </Center>
    );
  }

  if (errorOptions) {
    return (
      <Center style={{ height: '200px' }}>
        <Text color="red">Error al cargar opciones: {errorOptions.message}</Text>
      </Center>
    );
  }

  return (
    <Box>
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Grid gutter="md">
          <Grid.Col span={12}>
            <Select
              label="Vehículo"
              placeholder="Selecciona un vehículo"
              data={vehiculos}
              searchable
              {...form.getInputProps('vehiculoId')}
              disabled={!!initialData} // Generalmente no se cambia el vehículo en una asignación existente
            />
          </Grid.Col>
          <Grid.Col span={12}>
            <Select
              label="Conductor Asignado"
              placeholder="Selecciona un empleado"
              data={empleados}
              searchable
              {...form.getInputProps('empleadoId')}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <DateInput
              label="Fecha de Asignación"
              placeholder="Fecha de inicio de uso"
              valueFormat="DD/MM/YYYY"
              {...form.getInputProps('fechaAsignacion')}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <DateInput
              label="Fecha de Liberación (Opcional)"
              placeholder="Fecha de fin de uso"
              valueFormat="DD/MM/YYYY"
              {...form.getInputProps('fechaLiberacion')}
            />
          </Grid.Col>
          <Grid.Col span={12}>
            <Textarea
              label="Notas Adicionales"
              placeholder="Cualquier nota relevante sobre la asignación"
              {...form.getInputProps('notas')}
              rows={2}
            />
          </Grid.Col>
        </Grid>

        <Group justify="flex-end" mt="xl">
          <Button variant="default" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit">
            {initialData ? 'Actualizar Asignación' : 'Asignar Vehículo'}
          </Button>
        </Group>
      </form>
    </Box>
  );
}