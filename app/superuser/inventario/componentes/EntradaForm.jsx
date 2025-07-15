// components/inventario/EntradaForm.jsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { TextInput, Button, Group, Box, Select, NumberInput, Textarea, Loader, Center, Title } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';

export function EntradaForm({ entradaId = null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [consumibles, setConsumibles] = useState([]);
  const [ordenesCompra, setOrdenesCompra] = useState([]);
  const [empleados, setEmpleados] = useState([]); // Para el campo 'recibidoPor'

  const form = useForm({
    initialValues: {
      consumibleId: null,
      cantidad: 0.0,
      fechaEntrada: new Date(),
      ordenCompraId: null,
      recibidoPorId: null,
      notas: '',
    },
    validate: {
      consumibleId: (value) => (value ? null : 'El consumible es requerido'),
      cantidad: (value) => (value > 0 ? null : 'La cantidad debe ser mayor a cero'),
      fechaEntrada: (value) => (value ? null : 'La fecha de entrada es requerida'),
    },
  });

  const fetchDependencies = useCallback(async () => {
    setLoading(true);
    try {
      const [consumiblesRes, ordenesRes, empleadosRes] = await Promise.all([
        fetch('/api/superuser/inventario/consumibles'),
        fetch('/api/superuser/inventario/ordenes-compra'), // Asume esta API para obtener órdenes de compra
        fetch('/api/superuser/empleados'), // Asume esta API para obtener empleados
      ]);

      const [consumiblesData, ordenesData, empleadosData] = await Promise.all([
        consumiblesRes.json(),
        ordenesRes.json(),
        empleadosRes.json(),
      ]);

      setConsumibles(consumiblesData.map(c => ({ value: c.id.toString(), label: c.nombre })));
      setOrdenesCompra(ordenesData.map(oc => ({ value: oc.id.toString(), label: `OC-${oc.numeroOrden} (Proveedor: ${oc.proveedor?.razonSocial || 'N/A'})` })));
      setEmpleados(empleadosData.map(e => ({ value: e.id.toString(), label: `${e.nombre} ${e.apellido}` })));

      if (entradaId) {
        const entradaRes = await fetch(`/api/superuser/inventario/entradas/${entradaId}`);
        if (!entradaRes.ok) throw new Error('Entrada no encontrada');
        const entradaData = await entradaRes.json();

        form.setValues({
          ...entradaData,
          consumibleId: entradaData.consumibleId?.toString(),
          ordenCompraId: entradaData.ordenCompraId?.toString() || null,
          recibidoPorId: entradaData.recibidoPorId?.toString() || null,
          cantidad: parseFloat(entradaData.cantidad),
          fechaEntrada: new Date(entradaData.fechaEntrada),
        });
      }
    } catch (err) {
      notifications.show({
        title: 'Error de Carga',
        message: `No se pudieron cargar los datos necesarios: ${err.message}`,
        color: 'red',
      });
      router.push('/superuser/inventario/entradas');
    } finally {
      setLoading(false);
    }
  }, [entradaId, router]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchDependencies();
  }, [fetchDependencies]);

  const handleSubmit = async (values) => {
    setIsSubmitting(true);
    const payload = {
      ...values,
      consumibleId: parseInt(values.consumibleId),
      cantidad: parseFloat(values.cantidad),
      fechaEntrada: values.fechaEntrada.toISOString().split('T')[0], // Formato YYYY-MM-DD
      ordenCompraId: values.ordenCompraId ? parseInt(values.ordenCompraId) : null,
      recibidoPorId: values.recibidoPorId ? parseInt(values.recibidoPorId) : null,
    };

    let response;
    let url = '/api/superuser/inventario/entradas';
    let method = 'POST';
    let successMessage = 'Entrada de inventario registrada exitosamente.';
    let errorMessage = 'Error al registrar entrada de inventario.';

    if (entradaId) {
      // Para la edición de entradas, la lógica de stock debería ser más compleja
      // implicando revertir el cambio original y aplicar el nuevo.
      // Por simplicidad, este formulario solo permitirá CREAR o ver los datos de una entrada existente.
      // La edición directa de 'cantidad' en una entrada existente se desaconseja por complejidad del stock.
      // Si se necesita corregir una entrada, se suele hacer una "contra-entrada" o "ajuste".
      // Para este ejemplo, solo permitiremos la edición de datos no relacionados con el stock (como notas, OC, etc.)
      url = `/api/superuser/inventario/entradas/${entradaId}`;
      method = 'PUT'; // Asume que la API PUT en entradas/[id] maneja los campos que no son de stock
      successMessage = 'Entrada de inventario actualizada exitosamente.';
      errorMessage = 'Error al actualizar entrada de inventario.';
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
      router.push('/superuser/inventario/entradas');
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
        <Text ml="md">Cargando datos...</Text>
      </Center>
    );
  }

  return (
    <Box maw={600} mx="auto" py="md">
      <Title order={2} mb="lg">{entradaId ? 'Editar Entrada de Inventario' : 'Registrar Nueva Entrada'}</Title>
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Select
          label="Consumible"
          placeholder="Selecciona un consumible"
          data={consumibles}
          searchable
          {...form.getInputProps('consumibleId')}
          mb="md"
          disabled={!!entradaId} // No permitir cambiar el consumible en edición para evitar inconsistencias de stock
        />
        <NumberInput
          label="Cantidad"
          placeholder="0.00"
          precision={2}
          min={0.01}
          step={0.01}
          {...form.getInputProps('cantidad')}
          mb="md"
          readOnly={!!entradaId} // No permitir cambiar la cantidad en edición para evitar inconsistencias de stock
          description={entradaId ? "La cantidad no puede ser editada directamente. Para correcciones, use ajustes de inventario." : ""}
        />
        <DateInput
          label="Fecha de Entrada"
          placeholder="Selecciona la fecha de entrada"
          valueFormat="DD/MM/YYYY"
          {...form.getInputProps('fechaEntrada')}
          mb="md"
        />
        <Select
          label="Orden de Compra Asociada (Opcional)"
          placeholder="Selecciona una orden de compra"
          data={ordenesCompra}
          searchable
          clearable
          {...form.getInputProps('ordenCompraId')}
          mb="md"
        />
        <Select
          label="Recibido Por (Empleado - Opcional)"
          placeholder="Selecciona el empleado que recibió"
          data={empleados}
          searchable
          clearable
          {...form.getInputProps('recibidoPorId')}
          mb="md"
        />
        <Textarea
          label="Notas Adicionales"
          placeholder="Cualquier nota relevante sobre esta entrada"
          {...form.getInputProps('notas')}
          rows={3}
          mb="md"
        />

        <Group justify="flex-end" mt="xl">
          <Button variant="default" onClick={() => router.push('/superuser/inventario/entradas')}>
            Cancelar
          </Button>
          <Button type="submit" loading={isSubmitting} disabled={isSubmitting || (!!entradaId && !form.isDirty())}>
            {entradaId ? 'Actualizar Entrada' : 'Registrar Entrada'}
          </Button>
        </Group>
      </form>
    </Box>
  );
}