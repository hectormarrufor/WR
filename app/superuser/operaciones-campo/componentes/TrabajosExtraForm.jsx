// components/operaciones-campo/TrabajoExtraForm.jsx
'use client';

import React from 'react';
import { TextInput, Button, Group, Box, Select, NumberInput, Textarea } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';

export function TrabajoExtraForm({ operacionId, initialData = null, onSuccess, onCancel }) {
  const form = useForm({
    initialValues: {
      descripcion: '',
      fechaRealizacion: null,
      costoEstimado: 0.0,
      estado: 'Pendiente', // Estado inicial por defecto
      notas: '',
    },
    validate: {
      descripcion: (value) => (value ? null : 'La descripción del trabajo extra es requerida'),
      fechaRealizacion: (value) => (value ? null : 'La fecha de realización es requerida'),
      costoEstimado: (value) => (value >= 0 ? null : 'El costo estimado debe ser un número positivo'),
      estado: (value) => (value ? null : 'El estado es requerido'),
    },
  });

  // Cargar datos iniciales si se está editando
  React.useEffect(() => {
    if (initialData) {
      form.setValues({
        ...initialData,
        fechaRealizacion: initialData.fechaRealizacion ? new Date(initialData.fechaRealizacion) : null,
        costoEstimado: parseFloat(initialData.costoEstimado),
      });
    }
  }, [initialData]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (values) => {
    const payload = {
      ...values,
      operacionCampoId: operacionId, // Vincula al ID de la operación padre
      fechaRealizacion: values.fechaRealizacion ? values.fechaRealizacion.toISOString().split('T')[0] : null,
      costoEstimado: parseFloat(values.costoEstimado),
    };

    let response;
    let url = `/api/superuser/operaciones-campo/${operacionId}/trabajos-extra`; // Ruta POST para crear
    let method = 'POST';
    let successMessage = 'Trabajo extra registrado exitosamente';
    let errorMessage = 'Error al registrar trabajo extra';

    if (initialData) {
      url = `/api/superuser/operaciones-campo/${operacionId}/trabajos-extra/${initialData.id}`; // Ruta PUT para actualizar
      method = 'PUT';
      successMessage = 'Trabajo extra actualizado exitosamente';
      errorMessage = 'Error al actualizar trabajo extra';
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

  return (
    <Box>
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <TextInput
          label="Descripción del Trabajo Extra"
          placeholder="Ej. Reubicación de punto de red, Desmontaje adicional"
          {...form.getInputProps('descripcion')}
          mb="md"
        />
        <DateInput
          label="Fecha de Realización"
          placeholder="Selecciona la fecha"
          valueFormat="DD/MM/YYYY"
          {...form.getInputProps('fechaRealizacion')}
          mb="md"
        />
        <NumberInput
          label="Costo Estimado"
          placeholder="0.00"
          prefix="$"
          decimalScale={2}
          fixedDecimalScale
          min={0}
          {...form.getInputProps('costoEstimado')}
          mb="md"
        />
        <Select
          label="Estado"
          placeholder="Selecciona el estado"
          data={['Pendiente', 'Aprobado', 'Rechazado', 'Facturado']} // Ajusta tus estados
          {...form.getInputProps('estado')}
          mb="md"
        />
        <Textarea
          label="Notas Adicionales"
          placeholder="Cualquier nota relevante sobre este trabajo extra"
          {...form.getInputProps('notas')}
          rows={2}
          mb="md"
        />

        <Group justify="flex-end" mt="xl">
          <Button variant="default" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit">
            {initialData ? 'Actualizar Trabajo Extra' : 'Registrar Trabajo Extra'}
          </Button>
        </Group>
      </form>
    </Box>
  );
}