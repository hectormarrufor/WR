// components/inventario/ConsumibleForm.jsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { TextInput, Button, Group, Box, Select, NumberInput, Textarea, Loader, Center, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';

export function ConsumibleForm({ consumibleId = null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    initialValues: {
      nombre: '',
      descripcion: '',
      unidadMedida: 'Unidad',
      stockActual: 0.0,
      stockMinimo: 0.0,
      precioUnitarioPromedio: 0.0,
      ubicacionAlmacen: '',
    },
    validate: {
      nombre: (value) => (value ? null : 'El nombre es requerido'),
      unidadMedida: (value) => (value ? null : 'La unidad de medida es requerida'),
      stockActual: (value) => (typeof value === 'number' && value >= 0 ? null : 'El stock actual debe ser un número positivo'),
      stockMinimo: (value) => (typeof value === 'number' && value >= 0 ? null : 'El stock mínimo debe ser un número positivo'),
    },
  });

  const fetchConsumibleData = useCallback(async () => {
    if (!consumibleId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`/api/inventario/consumibles/${consumibleId}`);
      if (!response.ok) {
        throw new Error('Consumible no encontrado');
      }
      const data = await response.json();
      form.setValues({
        ...data,
        stockActual: parseFloat(data.stockActual),
        stockMinimo: parseFloat(data.stockMinimo),
        precioUnitarioPromedio: parseFloat(data.precioUnitarioPromedio),
      });
    } catch (err) {
      notifications.show({
        title: 'Error de Carga',
        message: `No se pudo cargar el consumible: ${err.message}`,
        color: 'red',
      });
      router.push('/superuser/inventario/consumibles');
    } finally {
      setLoading(false);
    }
  }, [consumibleId, router]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchConsumibleData();
  }, [fetchConsumibleData]);

  const handleSubmit = async (values) => {
    setIsSubmitting(true);
    const payload = {
      ...values,
      stockActual: parseFloat(values.stockActual),
      stockMinimo: parseFloat(values.stockMinimo),
      precioUnitarioPromedio: parseFloat(values.precioUnitarioPromedio),
    };

    let response;
    let url = '/api/inventario/consumibles';
    let method = 'POST';
    let successMessage = 'Consumible creado exitosamente';
    let errorMessage = 'Error al crear consumible';

    if (consumibleId) {
      url = `/api/inventario/consumibles/${consumibleId}`;
      method = 'PUT';
      successMessage = 'Consumible actualizado exitosamente';
      errorMessage = 'Error al actualizar consumible';
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
      router.push('/superuser/inventario/consumibles');
    } catch (error) {
      console.error(errorMessage, error);
      notifications.show({
        title: 'Error',
        message: `${errorMessage}: ${error.message}`,
        color: 'red',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Center style={{ height: '400px' }}>
        <Loader size="lg" />
        <Text ml="md">Cargando datos del consumible...</Text>
      </Center>
    );
  }

  return (
    <Box maw={600} mx="auto" py="md">
      <Title order={2} mb="lg">{consumibleId ? 'Editar Consumible' : 'Crear Nuevo Consumible'}</Title>
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <TextInput
          label="Nombre del Consumible"
          placeholder="Ej. Filtro de Aceite, Aceite 15W-40"
          {...form.getInputProps('nombre')}
          mb="md"
        />
        <Textarea
          label="Descripción"
          placeholder="Descripción detallada del consumible"
          {...form.getInputProps('descripcion')}
          rows={3}
          mb="md"
        />
        <Select
          label="Unidad de Medida"
          placeholder="Selecciona la unidad"
          data={['Unidad', 'Litro', 'Galón', 'Kg', 'Metro', 'Caja']}
          {...form.getInputProps('unidadMedida')}
          mb="md"
        />
        <NumberInput
          label="Stock Actual"
          placeholder="0.00"
          precision={2}
          min={0}
          step={0.01}
          {...form.getInputProps('stockActual')}
          mb="md"
          readOnly={!!consumibleId} // Stock actual se actualiza por entradas/salidas, no directamente aquí
          description={consumibleId ? "El stock actual se actualiza mediante entradas y salidas." : ""}
        />
        <NumberInput
          label="Stock Mínimo"
          placeholder="0.00"
          precision={2}
          min={0}
          step={0.01}
          {...form.getInputProps('stockMinimo')}
          mb="md"
        />
        <NumberInput
          label="Precio Unitario Promedio ($)"
          placeholder="0.00"
          precision={2}
          min={0}
          step={0.01}
          prefix="$"
          {...form.getInputProps('precioUnitarioPromedio')}
          mb="md"
        />
        <TextInput
          label="Ubicación en Almacén"
          placeholder="Ej. Estante A1, Sección Herramientas"
          {...form.getInputProps('ubicacionAlmacen')}
          mb="md"
        />

        <Group justify="flex-end" mt="xl">
          <Button variant="default" onClick={() => router.push('/superuser/inventario/consumibles')}>
            Cancelar
          </Button>
          <Button type="submit" loading={isSubmitting} disabled={isSubmitting}>
            {consumibleId ? 'Actualizar Consumible' : 'Crear Consumible'}
          </Button>
        </Group>
      </form>
    </Box>
  );
}