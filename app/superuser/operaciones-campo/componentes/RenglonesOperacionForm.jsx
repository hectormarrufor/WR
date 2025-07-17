// components/operaciones-campo/RenglonOperacionForm.jsx
'use client';

import React from 'react';
import { TextInput, Button, Group, Box, Select, NumberInput, Textarea } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';

export function RenglonOperacionForm({ operacionId, initialData = null, onSuccess, onCancel }) {
  const form = useForm({
    initialValues: {
      descripcion: '',
      cantidad: 1,
      unidadMedida: 'Unidad', // Valor por defecto
      precioUnitario: 0.0,
      estado: 'Pendiente', // Estado inicial por defecto
    },
    validate: {
      descripcion: (value) => (value ? null : 'La descripción es requerida'),
      cantidad: (value) => (value > 0 ? null : 'La cantidad debe ser mayor a 0'),
      unidadMedida: (value) => (value ? null : 'La unidad de medida es requerida'),
      precioUnitario: (value) => (value >= 0 ? null : 'El precio unitario debe ser un número positivo'),
      estado: (value) => (value ? null : 'El estado es requerido'),
    },
  });

  // Cargar datos iniciales si se está editando
  React.useEffect(() => {
    if (initialData) {
      form.setValues({
        ...initialData,
        cantidad: parseFloat(initialData.cantidad), // Asegurar que sea número
        precioUnitario: parseFloat(initialData.precioUnitario), // Asegurar que sea número
      });
    }
  }, [initialData]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (values) => {
    const payload = {
      ...values,
      operacionCampoId: operacionId, // Vincula al ID de la operación padre
      cantidad: parseFloat(values.cantidad),
      precioUnitario: parseFloat(values.precioUnitario),
    };

    let response;
    let url = `/api/contratos/operaciones-campo/${operacionId}/renglones`; // Ruta POST para crear
    let method = 'POST';
    let successMessage = 'Renglón agregado exitosamente';
    let errorMessage = 'Error al agregar renglón';

    if (initialData) {
      url = `/api/contratos/operaciones-campo/${operacionId}/renglones/${initialData.id}`; // Ruta PUT para actualizar
      method = 'PUT';
      successMessage = 'Renglón actualizado exitosamente';
      errorMessage = 'Error al actualizar renglón';
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
          label="Descripción del Renglón"
          placeholder="Ej. Suministro de combustible, Horas de trabajo"
          {...form.getInputProps('descripcion')}
          mb="md"
        />
        <NumberInput
          label="Cantidad"
          placeholder="1"
          min={1}
          precision={2} // Permite decimales si necesitas fracciones de unidades
          {...form.getInputProps('cantidad')}
          mb="md"
        />
        <Select
          label="Unidad de Medida"
          placeholder="Selecciona la unidad"
          data={['Unidad', 'Litros', 'Metros', 'Horas', 'Kilogramos']} // Ajusta tus unidades
          {...form.getInputProps('unidadMedida')}
          mb="md"
        />
        <NumberInput
          label="Precio Unitario"
          placeholder="0.00"
          prefix="$"
          decimalScale={2}
          fixedDecimalScale
          min={0}
          {...form.getInputProps('precioUnitario')}
          mb="md"
        />
        <Select
          label="Estado del Renglón"
          placeholder="Selecciona el estado"
          data={['Pendiente', 'En Progreso', 'Completado', 'Cancelado']} // Ajusta tus estados
          {...form.getInputProps('estado')}
          mb="md"
        />

        <Group justify="flex-end" mt="xl">
          <Button variant="default" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit">
            {initialData ? 'Actualizar Renglón' : 'Agregar Renglón'}
          </Button>
        </Group>
      </form>
    </Box>
  );
}