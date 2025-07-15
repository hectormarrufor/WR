// components/compras/OrdenCompraForm.jsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  TextInput, Button, Group, Box, Select, NumberInput, Textarea,
  Loader, Center, Title, Paper, Divider, ActionIcon, Flex, Text
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';
import { IconPlus, IconTrash } from '@tabler/icons-react';

export function OrdenCompraForm({ ordenCompraId = null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [proveedores, setProveedores] = useState([]);
  const [consumibles, setConsumibles] = useState([]);
  const [empleados, setEmpleados] = useState([]); // Para el campo 'creadaPorId'

  const form = useForm({
    initialValues: {
      proveedorId: null,
      fechaCreacion: new Date(),
      fechaRequerida: null,
      estado: 'Pendiente',
      creadaPorId: null,
      notas: '',
      detalles: [], // Array para los ítems de la OC
    },
    validate: {
      proveedorId: (value) => (value ? null : 'El proveedor es requerido'),
      detalles: (value) => (value.length > 0 ? null : 'La orden de compra debe tener al menos un consumible'),
    },
  });

  // Función para calcular el subtotal y el total estimado
  const calculateTotals = useCallback((detalles) => {
    let total = 0;
    detalles.forEach(detail => {
      const cantidad = parseFloat(detail.cantidad);
      const precioUnitario = parseFloat(detail.precioUnitario);
      if (!isNaN(cantidad) && !isNaN(precioUnitario)) {
        detail.subtotal = (cantidad * precioUnitario).toFixed(2);
        total += (cantidad * precioUnitario);
      } else {
        detail.subtotal = (0).toFixed(2);
      }
    });
    form.setValues({ detalles: detalles }); // Actualiza los detalles con los subtotales calculados
    form.setFieldValue('totalEstimado', total.toFixed(2)); // Actualiza el total estimado
  }, [form]);


  const fetchDependencies = useCallback(async () => {
    setLoading(true);
    try {
      const [proveedoresRes, consumiblesRes, empleadosRes] = await Promise.all([
        fetch('/api/superuser/proveedores'),
        fetch('/api/superuser/inventario/consumibles'),
        fetch('/api/superuser/empleados'), // Asume esta API
      ]);

      const [proveedoresData, consumiblesData, empleadosData] = await Promise.all([
        proveedoresRes.json(),
        consumiblesRes.json(),
        empleadosRes.json(),
      ]);

      setProveedores(proveedoresData.map(p => ({ value: p.id.toString(), label: `${p.nombre} (${p.rif})` })));
      setConsumibles(consumiblesData.map(c => ({ value: c.id.toString(), label: `${c.nombre} (${c.unidadMedida})` })));
      setEmpleados(empleadosData.map(e => ({ value: e.id.toString(), label: `${e.nombre} ${e.apellido}` })));

      if (ordenCompraId) {
        const ocRes = await fetch(`/api/superuser/compras/ordenes-compra/${ordenCompraId}`);
        if (!ocRes.ok) throw new Error('Orden de Compra no encontrada');
        const ocData = await ocRes.json();

        // Mapear los detalles para el formulario
        const mappedDetalles = ocData.detalles.map(d => ({
          ...d,
          consumibleId: d.consumibleId?.toString(),
          cantidad: parseFloat(d.cantidad),
          precioUnitario: parseFloat(d.precioUnitario),
          subtotal: parseFloat(d.subtotal),
        }));

        form.setValues({
          ...ocData,
          proveedorId: ocData.proveedorId?.toString(),
          creadaPorId: ocData.creadaPorId?.toString() || null,
          fechaCreacion: new Date(ocData.fechaCreacion),
          fechaRequerida: ocData.fechaRequerida ? new Date(ocData.fechaRequerida) : null,
          detalles: mappedDetalles,
        });
        calculateTotals(mappedDetalles); // Recalcular totales al cargar
      }
    } catch (err) {
      notifications.show({
        title: 'Error de Carga',
        message: `No se pudieron cargar los datos necesarios: ${err.message}`,
        color: 'red',
      });
      router.push('/superuser/compras/ordenes-compra');
    } finally {
      setLoading(false);
    }
  }, [ordenCompraId, router, form, calculateTotals]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchDependencies();
  }, [fetchDependencies]);


  const addDetail = () => {
    form.insertListItem('detalles', {
      consumibleId: null,
      cantidad: 0.0,
      precioUnitario: 0.0,
      subtotal: 0.0,
      notas: '',
    });
  };

  const removeDetail = (index) => {
    form.removeListItem('detalles', index);
    calculateTotals(form.values.detalles.filter((_, i) => i !== index)); // Recalcula sin el ítem eliminado
  };

  const handleDetailChange = (index, field, value) => {
    form.setFieldValue(`detalles.${index}.${field}`, value);
    const updatedDetalles = [...form.values.detalles];
    updatedDetalles[index][field] = value;
    calculateTotals(updatedDetalles);
  };

  const handleSubmit = async (values) => {
    setIsSubmitting(true);
    const payload = {
      ...values,
      proveedorId: parseInt(values.proveedorId),
      fechaCreacion: values.fechaCreacion.toISOString().split('T')[0],
      fechaRequerida: values.fechaRequerida ? values.fechaRequerida.toISOString().split('T')[0] : null,
      creadaPorId: values.creadaPorId ? parseInt(values.creadaPorId) : null,
      detalles: values.detalles.map(d => ({
        ...d,
        consumibleId: parseInt(d.consumibleId),
        cantidad: parseFloat(d.cantidad),
        precioUnitario: parseFloat(d.precioUnitario),
        subtotal: parseFloat(d.subtotal),
      })),
      totalEstimado: parseFloat(values.totalEstimado), // Asegurarse de enviar como número
    };

    let response;
    let url = '/api/superuser/compras/ordenes-compra';
    let method = 'POST';
    let successMessage = 'Orden de Compra registrada exitosamente.';
    let errorMessage = 'Error al registrar orden de compra.';

    if (ordenCompraId) {
      url = `/api/superuser/compras/ordenes-compra/${ordenCompraId}`;
      method = 'PUT';
      successMessage = 'Orden de Compra actualizada exitosamente.';
      errorMessage = 'Error al actualizar orden de compra.';
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
      router.push('/superuser/compras/ordenes-compra');
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

  // Deshabilitar campos clave si la OC no está Pendiente (solo lectura para ciertos estados)
  const isReadOnly = ordenCompraId && form.values.estado !== 'Pendiente' && form.values.estado !== 'Rechazada';

  return (
    <Box maw={800} mx="auto" py="md">
      <Title order={2} mb="lg">{ordenCompraId ? `Editar Orden de Compra: ${form.values.numeroOrden || ''}` : 'Crear Nueva Orden de Compra'}</Title>
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Paper withBorder shadow="md" p="md" mb="lg">
          <Title order={4} mb="sm">Datos Generales</Title>
          <Select
            label="Proveedor"
            placeholder="Selecciona un proveedor"
            data={proveedores}
            searchable
            {...form.getInputProps('proveedorId')}
            mb="md"
            disabled={isReadOnly}
          />
          <Group grow mb="md">
            <DateInput
              label="Fecha de Creación"
              placeholder="DD/MM/YYYY"
              valueFormat="DD/MM/YYYY"
              {...form.getInputProps('fechaCreacion')}
              disabled // Siempre deshabilitado, es la fecha de creación
            />
            <DateInput
              label="Fecha Requerida"
              placeholder="Fecha de entrega esperada"
              valueFormat="DD/MM/YYYY"
              clearable
              {...form.getInputProps('fechaRequerida')}
              disabled={isReadOnly}
            />
          </Group>
          {ordenCompraId && (
            <Select
              label="Estado"
              placeholder="Selecciona el estado de la orden"
              data={[
                { value: 'Pendiente', label: 'Pendiente' },
                { value: 'Aprobada', label: 'Aprobada' },
                { value: 'Rechazada', label: 'Rechazada' },
                { value: 'Enviada', label: 'Enviada' },
                { value: 'Recibida Parcial', label: 'Recibida Parcial' },
                { value: 'Recibida Completa', label: 'Recibida Completa' },
                { value: 'Cancelada', label: 'Cancelada' },
              ]}
              {...form.getInputProps('estado')}
              mb="md"
              disabled={isSubmitting} // Solo el estado puede cambiar incluso si la OC está "cerrada"
            />
          )}
          <Select
            label="Creada Por (Empleado - Opcional)"
            placeholder="Selecciona el empleado que creó la OC"
            data={empleados}
            searchable
            clearable
            {...form.getInputProps('creadaPorId')}
            mb="md"
            disabled={isReadOnly}
          />
          <Textarea
            label="Notas de la Orden"
            placeholder="Notas generales sobre la orden de compra"
            {...form.getInputProps('notas')}
            rows={3}
            mb="md"
            disabled={isReadOnly}
          />
        </Paper>

        <Paper withBorder shadow="md" p="md" mb="lg">
          <Group justify="space-between" mb="sm">
            <Title order={4}>Detalles de la Orden</Title>
            {!isReadOnly && (
              <Button leftSection={<IconPlus size={16} />} onClick={addDetail} size="sm">
                Añadir Consumible
              </Button>
            )}
          </Group>

          {form.values.detalles.length === 0 && (
            <Text c="dimmed" ta="center" mt="md">No hay consumibles añadidos a esta orden.</Text>
          )}

          {form.values.detalles.map((detail, index) => (
            <Box key={index} p="sm" my="sm" style={{ border: '1px solid var(--mantine-color-gray-3)', borderRadius: '4px' }}>
              <Group justify="space-between">
                <Text fw={500}>Item #{index + 1}</Text>
                {!isReadOnly && (
                  <ActionIcon color="red" variant="light" onClick={() => removeDetail(index)}>
                    <IconTrash size={18} />
                  </ActionIcon>
                )}
              </Group>
              <Select
                label="Consumible"
                placeholder="Selecciona un consumible"
                data={consumibles}
                searchable
                {...form.getInputProps(`detalles.${index}.consumibleId`)}
                onChange={(value) => handleDetailChange(index, 'consumibleId', value)}
                mt="xs"
                disabled={isReadOnly}
              />
              <Group grow mt="md">
                <NumberInput
                  label="Cantidad"
                  placeholder="0.00"
                  precision={2}
                  min={0.01}
                  step={0.01}
                  {...form.getInputProps(`detalles.${index}.cantidad`)}
                  onChange={(value) => handleDetailChange(index, 'cantidad', value)}
                  disabled={isReadOnly}
                />
                <NumberInput
                  label="Precio Unitario"
                  placeholder="0.00"
                  precision={2}
                  min={0}
                  step={0.01}
                  {...form.getInputProps(`detalles.${index}.precioUnitario`)}
                  onChange={(value) => handleDetailChange(index, 'precioUnitario', value)}
                  disabled={isReadOnly}
                />
              </Group>
              <TextInput
                label="Subtotal"
                value={detail.subtotal} // Este campo se controla internamente
                readOnly
                disabled
                mt="md"
              />
              <Textarea
                label="Notas del Ítem (Opcional)"
                placeholder="Notas específicas para este consumible"
                {...form.getInputProps(`detalles.${index}.notas`)}
                mt="md"
                disabled={isReadOnly}
              />
              <Divider my="sm" />
            </Box>
          ))}
          <Flex justify="flex-end" mt="lg">
            <Text size="xl" fw={700}>Total Estimado: ${parseFloat(form.values.totalEstimado || 0).toFixed(2)}</Text>
          </Flex>
        </Paper>

        <Group justify="flex-end" mt="xl">
          <Button variant="default" onClick={() => router.push('/superuser/compras/ordenes-compra')}>
            Cancelar
          </Button>
          <Button type="submit" loading={isSubmitting} disabled={isSubmitting || (ordenCompraId && !form.isDirty() && !isReadOnly)}>
            {ordenCompraId ? 'Actualizar Orden' : 'Crear Orden'}
          </Button>
        </Group>
      </form>
    </Box>
  );
}