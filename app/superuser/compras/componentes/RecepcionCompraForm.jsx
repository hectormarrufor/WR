// components/compras/RecepcionCompraForm.jsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  TextInput, Button, Group, Box, Select, NumberInput, Textarea,
  Loader, Center, Title, Paper, Divider, ActionIcon, Flex, Text
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useRouter, useSearchParams } from 'next/navigation';
import { IconTrash } from '@tabler/icons-react';

export function RecepcionCompraForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialOrdenCompraId = searchParams.get('ordenCompraId'); // Si viene de un link desde la OC

   const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    // Este efecto solo se ejecuta en el cliente, después del primer renderizado.
    setIsClient(true);
  }, []);
  // ✨ --- FIN DE LA SOLUCIÓN --- ✨

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ordenesCompraPendientes, setOrdenesCompraPendientes] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [selectedOcDetails, setSelectedOcDetails] = useState([]); // Detalles de la OC seleccionada

  const form = useForm({
    initialValues: {
      ordenCompraId: initialOrdenCompraId || null,
      fechaRecepcion: new Date(),
      numeroGuia: '',
      recibidaPorId: null,
      notas: '',
      detalles: [], // Items a recibir
    },
    validate: {
      ordenCompraId: (value) => (value ? null : 'La Orden de Compra es requerida'),
      detalles: (value) => (value.length > 0 ? null : 'La recepción debe tener al menos un consumible'),
    },
  });

  const fetchDependencies = useCallback(async () => {
    setLoading(true);
    try {
      const [ocRes, empleadosRes] = await Promise.all([
        fetch('/api/compras/ordenes-compra?estado=Pendiente&estado=Aprobada&estado=Enviada&estado=Recibida Parcial'), // Solo OCs elegibles para recibir
        fetch('/api/rrhh/empleados'),
      ]);

      const [ocData, empleadosData] = await Promise.all([
        ocRes.json(),
        empleadosRes.json(),
      ]);

      setOrdenesCompraPendientes(ocData.map(oc => ({ value: oc.id.toString(), label: `${oc.numeroOrden} (${oc.proveedor.nombre}) - ${oc.estado}` })));
      setEmpleados(empleadosData.map(e => ({ value: e.id.toString(), label: `${e.nombre} ${e.apellido}` })));

      // Si hay una OC pre-seleccionada, cargar sus detalles
      if (initialOrdenCompraId) {
        const ocDetailsRes = await fetch(`/api/compras/ordenes-compra/${initialOrdenCompraId}`);
        if (ocDetailsRes.ok) {
          const ocDetailsData = await ocDetailsRes.json();
          form.setFieldValue('ordenCompraId', initialOrdenCompraId);
          loadOcDetails(ocDetailsData);
        } else {
            notifications.show({
                title: 'Error de Carga',
                message: `La Orden de Compra pre-seleccionada no pudo ser cargada o no es elegible.`,
                color: 'red',
            });
            form.setFieldValue('ordenCompraId', null); // Limpiar si no es válida
        }
      }

    } catch (err) {
      notifications.show({
        title: 'Error de Carga',
        message: `No se pudieron cargar los datos necesarios: ${err.message}`,
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  }, [initialOrdenCompraId, form]);

  useEffect(() => {
    fetchDependencies();
  }, [isClient, fetchDependencies]);


  const loadOcDetails = (ocData) => {
    // Filtrar solo los ítems que aún no han sido recibidos completamente
    const itemsPendientes = ocData.detalles.filter(d => !d.recibidoCompletamente);

    setSelectedOcDetails(itemsPendientes.map(d => ({
        ...d,
        consumibleNombre: d.consumible.nombre,
        consumibleUnidadMedida: d.consumible.unidadMedida,
        cantidadPendiente: parseFloat(d.cantidad) - parseFloat(d.cantidadRecibida),
        cantidadRecibidaInput: parseFloat(d.cantidad) - parseFloat(d.cantidadRecibida), // Valor por defecto
        precioUnitario: parseFloat(d.precioUnitario), // Precio de la OC
    })));

    // Inicializar los detalles del formulario con los items pendientes para recibir
    form.setFieldValue('detalles', itemsPendientes.map(d => ({
        consumibleId: d.consumibleId.toString(),
        cantidadRecibida: parseFloat(d.cantidad) - parseFloat(d.cantidadRecibida), // Recibir por defecto lo pendiente
        precioUnitarioActual: parseFloat(d.precioUnitario), // Precio sugerido de la OC
        notas: '',
    })));
  };

  const handleOrdenCompraChange = async (ocId) => {
    form.setFieldValue('ordenCompraId', ocId);
    if (ocId) {
      try {
        const response = await fetch(`/api/compras/ordenes-compra/${ocId}`);
        if (!response.ok) {
          throw new Error('No se pudo cargar la Orden de Compra.');
        }
        const ocData = await response.json();
        loadOcDetails(ocData);
      } catch (err) {
        notifications.show({
          title: 'Error',
          message: `Error al cargar detalles de la OC: ${err.message}`,
          color: 'red',
        });
        setSelectedOcDetails([]);
        form.setFieldValue('detalles', []);
      }
    } else {
      setSelectedOcDetails([]);
      form.setFieldValue('detalles', []);
    }
  };

  const removeDetail = (index) => {
    form.removeListItem('detalles', index);
    setSelectedOcDetails(prev => prev.filter((_, i) => i !== index)); // Sincroniza la visualización
  };

  const handleSubmit = async (values) => {
    setIsSubmitting(true);
    const payload = {
      ...values,
      ordenCompraId: parseInt(values.ordenCompraId),
      fechaRecepcion: values.fechaRecepcion.toISOString().split('T')[0],
      recibidaPorId: values.recibidaPorId ? parseInt(values.recibidaPorId) : null,
      detalles: values.detalles.map(d => ({
        ...d,
        consumibleId: parseInt(d.consumibleId),
        cantidadRecibida: parseFloat(d.cantidadRecibida),
        precioUnitarioActual: parseFloat(d.precioUnitarioActual),
      })),
    };

    try {
      const response = await fetch('/api/compras/recepciones-compra', {
        method: 'POST',
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
        message: 'Recepción de Compra registrada exitosamente y stock actualizado.',
        color: 'green',
      });
      router.push('/superuser/compras/recepciones-compra');
    } catch (error) {
      console.error('Error al registrar recepción:', error);
      notifications.show({
        title: 'Error',
        message: `Error al registrar recepción de compra: ${error.message}`,
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
    <Box maw={800} mx="auto" py="md">
      <Title order={2} mb="lg">Registrar Recepción de Compra</Title>
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Paper withBorder shadow="md" p="md" mb="lg">
          <Title order={4} mb="sm">Datos de la Recepción</Title>
          <Select
            label="Orden de Compra"
            placeholder="Selecciona una Orden de Compra para recibir"
            data={ordenesCompraPendientes}
            searchable
            {...form.getInputProps('ordenCompraId')}
            onChange={handleOrdenCompraChange}
            mb="md"
          />
          <Group grow mb="md">
            <DateInput
              label="Fecha de Recepción"
              placeholder="DD/MM/YYYY"
              valueFormat="DD/MM/YYYY"
              {...form.getInputProps('fechaRecepcion')}
              maxDate={new Date()} // No se puede registrar en el futuro
            />
            <TextInput
              label="Número de Guía / Remisión"
              placeholder="Número de documento del proveedor"
              {...form.getInputProps('numeroGuia')}
            />
          </Group>
          <Select
            label="Recibida Por (Empleado - Opcional)"
            placeholder="Selecciona el empleado que recibió la mercancía"
            data={empleados}
            searchable
            clearable
            {...form.getInputProps('recibidaPorId')}
            mb="md"
          />
          <Textarea
            label="Notas de la Recepción"
            placeholder="Notas generales sobre la recepción (ej. daños, diferencias)"
            {...form.getInputProps('notas')}
            rows={3}
            mb="md"
          />
        </Paper>

        <Paper withBorder shadow="md" p="md" mb="lg">
          <Group justify="space-between" mb="sm">
            <Title order={4}>Ítems Recibidos</Title>
          </Group>

          {form.values.detalles.length === 0 && (
            <Text c="dimmed" ta="center" mt="md">Selecciona una Orden de Compra para ver los ítems a recibir.</Text>
          )}

          {form.values.detalles.map((detail, index) => {
            const ocDetail = selectedOcDetails[index];
            if (!ocDetail) return null; // Fallback si no encuentra el detalle

            return (
              <Box key={ocDetail.consumibleId} p="sm" my="sm" style={{ border: '1px solid var(--mantine-color-gray-3)', borderRadius: '4px' }}>
                <Group justify="space-between">
                  <Text fw={500}>{ocDetail.consumibleNombre} ({ocDetail.consumibleUnidadMedida})</Text>
                  <ActionIcon color="red" variant="light" onClick={() => removeDetail(index)}>
                    <IconTrash size={18} />
                  </ActionIcon>
                </Group>
                <Text size="sm" c="dimmed">Cantidad ordenada: {parseFloat(ocDetail.cantidad).toFixed(2)}</Text>
                <Text size="sm" c="dimmed">Cantidad ya recibida: {parseFloat(ocDetail.cantidadRecibida).toFixed(2)}</Text>
                <Text size="sm" c="dimmed">Cantidad pendiente: {parseFloat(ocDetail.cantidadPendiente).toFixed(2)}</Text>

                <Group grow mt="md">
                  <NumberInput
                    label="Cantidad Recibida"
                    placeholder="0.00"
                    precision={2}
                    min={0.01}
                    max={ocDetail.cantidadPendiente} // Máximo a recibir es lo pendiente
                    step={0.01}
                    {...form.getInputProps(`detalles.${index}.cantidadRecibida`)}
                    onChange={(value) => form.setFieldValue(`detalles.${index}.cantidadRecibida`, value)}
                    required
                  />
                  <NumberInput
                    label="Precio Unitario (OC: ${ocDetail.precioUnitario.toFixed(2)})" // Sugerencia del precio de la OC
                    placeholder="0.00"
                    precision={2}
                    min={0}
                    step={0.01}
                    {...form.getInputProps(`detalles.${index}.precioUnitarioActual`)}
                    onChange={(value) => form.setFieldValue(`detalles.${index}.precioUnitarioActual`, value)}
                    required
                  />
                </Group>
                <Textarea
                  label="Notas del Ítem (Opcional)"
                  placeholder="Notas específicas para este ítem recibido"
                  {...form.getInputProps(`detalles.${index}.notas`)}
                  mt="md"
                />
                <Divider my="sm" />
              </Box>
            );
          })}
        </Paper>

        <Group justify="flex-end" mt="xl">
          <Button variant="default" onClick={() => router.push('/superuser/compras/recepciones-compra')}>
            Cancelar
          </Button>
          <Button type="submit" loading={isSubmitting} disabled={isSubmitting || form.values.detalles.length === 0}>
            Registrar Recepción
          </Button>
        </Group>
      </form>
    </Box>
  );
}