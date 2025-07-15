// components/operaciones-campo/OrdenCompraOperacionForm.jsx
'use client';

import React, { useEffect, useState } from 'react';
import { Select, Button, Group, Box, Loader, Center, Textarea, Text } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';

export function OrdenCompraOperacionForm({ operacionId, initialData = null, onSuccess, onCancel }) {
  const [ordenesCompra, setOrdenesCompra] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [errorOptions, setErrorOptions] = useState(null);

  const form = useForm({
    initialValues: {
      ordenCompraId: '',
      notas: '', // Notas específicas de la vinculación a la operación
    },
    validate: {
      ordenCompraId: (value) => (value ? null : 'Seleccionar una Orden de Compra es requerido'),
    },
  });

  // Cargar datos iniciales si se está editando
  useEffect(() => {
    if (initialData) {
      form.setValues({
        ...initialData,
        ordenCompraId: initialData.ordenCompraId.toString(),
      });
    }
  }, [initialData]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cargar opciones para el Select (Órdenes de Compra)
  useEffect(() => {
    const fetchOptions = async () => {
      setLoadingOptions(true);
      setErrorOptions(null);
      try {
        // Asegúrate de que esta API exista y retorne un array de OCs con 'id', 'numeroOrden', 'proveedor.nombre'
        // Puedes filtrar por OCs que no estén ya asociadas si lo deseas.
        const ocRes = await fetch('/api/superuser/ordenes-compra'); // Asume esta API para listar OCs
        if (!ocRes.ok) throw new Error('Error al cargar órdenes de compra.');

        const ocData = await ocRes.json();
        setOrdenesCompra(ocData.map(oc => ({
          value: oc.id.toString(),
          label: `OC-${oc.numeroOrden} (Proveedor: ${oc.proveedor?.nombre || 'N/A'})`
        })));
      } catch (err) {
        console.error('Error loading form options:', err);
        setErrorOptions(err);
        notifications.show({
          title: 'Error de Carga',
          message: 'No se pudieron cargar las órdenes de compra disponibles.',
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
      operacionCampoId: operacionId, // Vincula al ID de la operación padre
      ordenCompraId: parseInt(values.ordenCompraId),
    };

    let response;
    let url = `/api/superuser/operaciones-campo/${operacionId}/ordenes-compra`; // Ruta POST para crear la vinculación
    let method = 'POST';
    let successMessage = 'Orden de Compra asociada exitosamente';
    let errorMessage = 'Error al asociar Orden de Compra';

    if (initialData) {
      url = `/api/superuser/operaciones-campo/${operacionId}/ordenes-compra/${initialData.id}`; // Ruta PUT para actualizar notas de la vinculación
      method = 'PUT';
      successMessage = 'Vinculación de Orden de Compra actualizada';
      errorMessage = 'Error al actualizar vinculación de Orden de Compra';
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
        <Text ml="md">Cargando órdenes de compra...</Text>
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
        <Select
          label="Orden de Compra"
          placeholder="Selecciona una Orden de Compra existente"
          data={ordenesCompra}
          searchable
          {...form.getInputProps('ordenCompraId')}
          disabled={!!initialData} // No permitir cambiar la OC si ya está vinculada (se desvincularía y se crearía nueva)
          mb="md"
        />
        <Textarea
          label="Notas de Vinculación"
          placeholder="Notas específicas sobre por qué esta OC se asocia a la operación"
          {...form.getInputProps('notas')}
          rows={3}
          mb="md"
        />

        <Group justify="flex-end" mt="xl">
          <Button variant="default" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit">
            {initialData ? 'Actualizar Vinculación' : 'Asociar Orden de Compra'}
          </Button>
        </Group>
      </form>
    </Box>
  );
}