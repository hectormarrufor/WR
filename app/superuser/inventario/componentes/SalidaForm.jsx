// components/inventario/SalidaForm.jsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { TextInput, Button, Group, Box, Select, NumberInput, Textarea, Loader, Center, Title } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';

export function SalidaForm({ salidaId = null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [consumibles, setConsumibles] = useState([]);
  const [empleados, setEmpleados] = useState([]); // Para el campo 'entregadoPor'
  const [contratosServicio, setContratosServicio] = useState([]); // Para el campo 'contratoServicioId'

  const form = useForm({
    initialValues: {
      consumibleId: null,
      cantidad: 0.0,
      fechaSalida: new Date(),
      motivo: '', // Ej. "Mantenimiento Preventivo", "Venta", "Ajuste por Pérdida"
      entregadoPorId: null,
      contratoServicioId: null,
      notas: '',
    },
    validate: {
      consumibleId: (value) => (value ? null : 'El consumible es requerido'),
      cantidad: (value) => (value > 0 ? null : 'La cantidad debe ser mayor a cero'),
      fechaSalida: (value) => (value ? null : 'La fecha de salida es requerida'),
      motivo: (value) => (value ? null : 'El motivo de la salida es requerido'),
    },
  });

  const fetchDependencies = useCallback(async () => {
    setLoading(true);
    try {
      const [consumiblesRes, empleadosRes, contratosRes] = await Promise.all([
        fetch('/api/superuser/inventario/consumibles'), // API para obtener consumibles (con stock actual)
        fetch('/api/superuser/empleados'), // API para obtener empleados
        fetch('/api/superuser/contratos-servicio'), // Asume esta API para obtener contratos de servicio
      ]);

      const [consumiblesData, empleadosData, contratosData] = await Promise.all([
        consumiblesRes.json(),
        empleadosRes.json(),
        contratosRes.json(),
      ]);

      setConsumibles(consumiblesData.map(c => ({ value: c.id.toString(), label: `${c.nombre} (Stock: ${parseFloat(c.stockActual).toFixed(2)} ${c.unidadMedida})` })));
      setEmpleados(empleadosData.map(e => ({ value: e.id.toString(), label: `${e.nombre} ${e.apellido}` })));
      setContratosServicio(contratosData.map(cs => ({ value: cs.id.toString(), label: `Contrato ${cs.numeroContrato} - ${cs.cliente.nombre || cs.cliente.razonSocial}` }))); // Asume cliente incluido en contrato

      if (salidaId) {
        const salidaRes = await fetch(`/api/superuser/inventario/salidas/${salidaId}`);
        if (!salidaRes.ok) throw new Error('Salida no encontrada');
        const salidaData = await salidaRes.json();

        form.setValues({
          ...salidaData,
          consumibleId: salidaData.consumibleId?.toString(),
          entregadoPorId: salidaData.entregadoPorId?.toString() || null,
          contratoServicioId: salidaData.contratoServicioId?.toString() || null,
          cantidad: parseFloat(salidaData.cantidad),
          fechaSalida: new Date(salidaData.fechaSalida),
        });
      }
    } catch (err) {
      notifications.show({
        title: 'Error de Carga',
        message: `No se pudieron cargar los datos necesarios: ${err.message}`,
        color: 'red',
      });
      router.push('/superuser/inventario/salidas');
    } finally {
      setLoading(false);
    }
  }, [salidaId, router]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchDependencies();
  }, [fetchDependencies]);

  const handleSubmit = async (values) => {
    setIsSubmitting(true);
    const payload = {
      ...values,
      consumibleId: parseInt(values.consumibleId),
      cantidad: parseFloat(values.cantidad),
      fechaSalida: values.fechaSalida.toISOString().split('T')[0], // Formato YYYY-MM-DD
      entregadoPorId: values.entregadoPorId ? parseInt(values.entregadoPorId) : null,
      contratoServicioId: values.contratoServicioId ? parseInt(values.contratoServicioId) : null,
    };

    let response;
    let url = '/api/superuser/inventario/salidas';
    let method = 'POST';
    let successMessage = 'Salida de inventario registrada exitosamente.';
    let errorMessage = 'Error al registrar salida de inventario.';

    if (salidaId) {
      // Para la edición de salidas, la lógica de stock es compleja si se cambia cantidad/consumible.
      // Por simplicidad, este formulario solo permitirá CREAR o ver los datos de una salida existente.
      // La edición directa de 'cantidad' en una salida existente se desaconseja por complejidad del stock.
      // Si se necesita corregir una salida, se suele hacer una "contra-salida" o "ajuste".
      url = `/api/superuser/inventario/salidas/${salidaId}`;
      method = 'PUT';
      successMessage = 'Salida de inventario actualizada exitosamente.';
      errorMessage = 'Error al actualizar salida de inventario.';
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
      router.push('/superuser/inventario/salidas');
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
      <Title order={2} mb="lg">{salidaId ? 'Editar Salida de Inventario' : 'Registrar Nueva Salida'}</Title>
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Select
          label="Consumible"
          placeholder="Selecciona un consumible"
          data={consumibles}
          searchable
          {...form.getInputProps('consumibleId')}
          mb="md"
          disabled={!!salidaId} // No permitir cambiar el consumible en edición
        />
        <NumberInput
          label="Cantidad"
          placeholder="0.00"
          precision={2}
          min={0.01}
          step={0.01}
          {...form.getInputProps('cantidad')}
          mb="md"
          readOnly={!!salidaId} // No permitir cambiar la cantidad en edición
          description={salidaId ? "La cantidad no puede ser editada directamente. Para correcciones, use ajustes de inventario." : ""}
        />
        <DateInput
          label="Fecha de Salida"
          placeholder="Selecciona la fecha de salida"
          valueFormat="DD/MM/YYYY"
          {...form.getInputProps('fechaSalida')}
          mb="md"
        />
        <TextInput
          label="Motivo de la Salida"
          placeholder="Ej. Mantenimiento Preventivo, Venta, Ajuste"
          {...form.getInputProps('motivo')}
          mb="md"
        />
        <Select
          label="Entregado Por (Empleado - Opcional)"
          placeholder="Selecciona el empleado que entregó"
          data={empleados}
          searchable
          clearable
          {...form.getInputProps('entregadoPorId')}
          mb="md"
        />
        <Select
          label="Contrato de Servicio Asociado (Opcional)"
          placeholder="Selecciona un contrato de servicio"
          data={contratosServicio}
          searchable
          clearable
          {...form.getInputProps('contratoServicioId')}
          mb="md"
        />
        <Textarea
          label="Notas Adicionales"
          placeholder="Cualquier nota relevante sobre esta salida"
          {...form.getInputProps('notas')}
          rows={3}
          mb="md"
        />

        <Group justify="flex-end" mt="xl">
          <Button variant="default" onClick={() => router.push('/superuser/inventario/salidas')}>
            Cancelar
          </Button>
          <Button type="submit" loading={isSubmitting} disabled={isSubmitting || (!!salidaId && !form.isDirty())}>
            {salidaId ? 'Actualizar Salida' : 'Registrar Salida'}
          </Button>
        </Group>
      </form>
    </Box>
  );
}