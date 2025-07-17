// components/inventario/ConsumibleUsadoForm.jsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { TextInput, Button, Group, Box, Select, NumberInput, Textarea, Loader, Center, Title } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';

export function ConsumibleUsadoForm({ consumibleUsadoId = null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [consumibles, setConsumibles] = useState([]);
  const [contratosServicio, setContratosServicio] = useState([]);
  const [equipos, setEquipos] = useState([]); // Asume que tienes un modelo de Equipos
  const [empleados, setEmpleados] = useState([]); // Para el campo 'empleadoId'

  const form = useForm({
    initialValues: {
      consumibleId: null,
      cantidadUsada: 0.0,
      fechaUso: new Date(),
      contratoServicioId: null,
      equipoId: null,
      empleadoId: null,
      notas: '',
    },
    validate: {
      consumibleId: (value) => (value ? null : 'El consumible es requerido'),
      cantidadUsada: (value) => (value > 0 ? null : 'La cantidad usada debe ser mayor a cero'),
      fechaUso: (value) => (value ? null : 'La fecha de uso es requerida'),
    },
  });

  const fetchDependencies = useCallback(async () => {
    setLoading(true);
    try {
      const [consumiblesRes, contratosRes, equiposRes, empleadosRes] = await Promise.all([
        fetch('/api/inventario/consumibles'), // Necesitamos los consumibles con su stock actual
        fetch('/api/contratos'), // Asume esta API
        fetch('/api/vehiculos'), // Asume esta API
        fetch('/api/rrhh/empleados'), // Asume esta API
      ]);

      const [consumiblesData, contratosData, equiposData, empleadosData] = await Promise.all([
        consumiblesRes.json(),
        contratosRes.json(),
        equiposRes.json(),
        empleadosRes.json(),
      ]);

      setConsumibles(consumiblesData.map(c => ({ value: c.id.toString(), label: `${c.nombre} (Stock: ${parseFloat(c.stockActual).toFixed(2)} ${c.unidadMedida})` })));
      setContratosServicio(contratosData.map(cs => ({ value: cs.id.toString(), label: `Contrato ${cs.numeroContrato} - ${cs.cliente?.razonSocial || 'N/A'}` })));
      setEquipos(equiposData.map(eq => ({ value: eq.id.toString(), label: `${eq.nombre} (${eq.modelo})` })));
      setEmpleados(empleadosData.map(e => ({ value: e.id.toString(), label: `${e.nombre} ${e.apellido}` })));

      if (consumibleUsadoId) {
        const usadoRes = await fetch(`/api/inventario/consumibles-usados/${consumibleUsadoId}`);
        if (!usadoRes.ok) throw new Error('Registro de uso no encontrado');
        const usadoData = await usadoRes.json();

        form.setValues({
          ...usadoData,
          consumibleId: usadoData.consumibleId?.toString(),
          contratoServicioId: usadoData.contratoServicioId?.toString() || null,
          equipoId: usadoData.equipoId?.toString() || null,
          empleadoId: usadoData.empleadoId?.toString() || null,
          cantidadUsada: parseFloat(usadoData.cantidadUsada),
          fechaUso: new Date(usadoData.fechaUso),
        });
      }
    } catch (err) {
      notifications.show({
        title: 'Error de Carga',
        message: `No se pudieron cargar los datos necesarios: ${err.message}`,
        color: 'red',
      });
      router.push('/superuser/inventario/consumibles-usados');
    } finally {
      setLoading(false);
    }
  }, [consumibleUsadoId, router]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchDependencies();
  }, [fetchDependencies]);

  const handleSubmit = async (values) => {
    setIsSubmitting(true);
    const payload = {
      ...values,
      consumibleId: parseInt(values.consumibleId),
      cantidadUsada: parseFloat(values.cantidadUsada),
      fechaUso: values.fechaUso.toISOString().split('T')[0], // Formato YYYY-MM-DD
      contratoServicioId: values.contratoServicioId ? parseInt(values.contratoServicioId) : null,
      equipoId: values.equipoId ? parseInt(values.equipoId) : null,
      empleadoId: values.empleadoId ? parseInt(values.empleadoId) : null,
    };

    let response;
    let url = '/api/inventario/consumibles-usados';
    let method = 'POST';
    let successMessage = 'Uso de consumible registrado exitosamente.';
    let errorMessage = 'Error al registrar uso de consumible.';

    if (consumibleUsadoId) {
      // Para la edición de un uso, solo permitimos modificar campos auxiliares, no cantidad/consumible.
      url = `/api/inventario/consumibles-usados/${consumibleUsadoId}`;
      method = 'PUT';
      successMessage = 'Uso de consumible actualizado exitosamente.';
      errorMessage = 'Error al actualizar uso de consumible.';
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
      router.push('/superuser/inventario/consumibles-usados');
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
      <Title order={2} mb="lg">{consumibleUsadoId ? 'Editar Registro de Uso de Consumible' : 'Registrar Nuevo Uso de Consumible'}</Title>
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Select
          label="Consumible"
          placeholder="Selecciona el consumible usado"
          data={consumibles}
          searchable
          {...form.getInputProps('consumibleId')}
          mb="md"
          disabled={!!consumibleUsadoId} // No permitir cambiar el consumible en edición
        />
        <NumberInput
          label="Cantidad Usada"
          placeholder="0.00"
          precision={2}
          min={0.01}
          step={0.01}
          {...form.getInputProps('cantidadUsada')}
          mb="md"
          readOnly={!!consumibleUsadoId} // No permitir cambiar la cantidad en edición
          description={consumibleUsadoId ? "La cantidad no puede ser editada directamente. Para correcciones, use ajustes." : ""}
        />
        <DateInput
          label="Fecha de Uso"
          placeholder="Selecciona la fecha de uso"
          valueFormat="DD/MM/YYYY"
          {...form.getInputProps('fechaUso')}
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
        <Select
          label="Equipo Asociado (Opcional)"
          placeholder="Selecciona un equipo"
          data={equipos}
          searchable
          clearable
          {...form.getInputProps('equipoId')}
          mb="md"
        />
        <Select
          label="Reportado Por (Empleado - Opcional)"
          placeholder="Selecciona el empleado que lo usó/reportó"
          data={empleados}
          searchable
          clearable
          {...form.getInputProps('empleadoId')}
          mb="md"
        />
        <Textarea
          label="Notas del Uso"
          placeholder="Detalles sobre cómo y dónde se utilizó el consumible"
          {...form.getInputProps('notas')}
          rows={3}
          mb="md"
        />

        <Group justify="flex-end" mt="xl">
          <Button variant="default" onClick={() => router.push('/superuser/inventario/consumibles-usados')}>
            Cancelar
          </Button>
          <Button type="submit" loading={isSubmitting} disabled={isSubmitting || (!!consumibleUsadoId && !form.isDirty())}>
            {consumibleUsadoId ? 'Actualizar Uso' : 'Registrar Uso'}
          </Button>
        </Group>
      </form>
    </Box>
  );
}