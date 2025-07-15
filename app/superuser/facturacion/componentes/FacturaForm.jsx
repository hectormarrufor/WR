// components/facturacion/FacturaForm.jsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { TextInput, Button, Group, Box, Select, NumberInput, Textarea, Loader, Center, Title, Divider } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconPlus } from '@tabler/icons-react';
import { RenglonFacturaForm } from './RenglonFacturaForm'; // Importa el sub-componente
import { useRouter } from 'next/navigation';

export function FacturaForm({ facturaId = null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [clientes, setClientes] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [operacionesCampo, setOperacionesCampo] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    initialValues: {
      numeroFactura: '',
      clienteId: null,
      contratoId: null,
      operacionCampoId: null,
      fechaEmision: new Date(),
      fechaVencimiento: null,
      montoTotal: 0.0, // Estos serán recalculados en el backend
      impuestos: 0.0,
      totalAPagar: 0.0,
      estado: 'Pendiente',
      notas: '',
      renglones: [], // Array para los renglones de la factura
    },
    validate: {
      numeroFactura: (value) => (value ? null : 'El número de factura es requerido'),
      clienteId: (value) => (value ? null : 'El cliente es requerido'),
      fechaVencimiento: (value) => (value ? null : 'La fecha de vencimiento es requerida'),
      renglones: (value) => (value.length > 0 ? null : 'La factura debe tener al menos un renglón'),
    },
  });

  const fetchDependencies = useCallback(async () => {
    setLoading(true);
    try {
      const [clientesRes, contratosRes, operacionesRes] = await Promise.all([
        fetch('/api/superuser/clientes?activo=true'),
        fetch('/api/superuser/contratos-servicio'), // Asegúrate de que esta API exista
        fetch('/api/superuser/operaciones-campo'), // Asegúrate de que esta API exista
      ]);

      const [clientesData, contratosData, operacionesData] = await Promise.all([
        clientesRes.json(),
        contratosRes.json(),
        operacionesRes.json(),
      ]);

      setClientes(clientesData.map(c => ({
        value: c.id.toString(),
        label: c.razonSocial || `${c.nombreContacto} ${c.apellidoContacto}`
      })));
      setContratos(contratosData.map(c => ({ value: c.id.toString(), label: `Contrato ${c.numeroContrato} - ${c.cliente?.razonSocial || 'N/A'}` })));
      setOperacionesCampo(operacionesData.map(o => ({ value: o.id.toString(), label: `Op. Campo #${o.id} - Contrato ${o.renglonContrato?.contrato?.numeroContrato || 'N/A'}` })));

      if (facturaId) {
        const facturaRes = await fetch(`/api/superuser/facturacion/${facturaId}`);
        if (!facturaRes.ok) throw new Error('Factura no encontrada');
        const facturaData = await facturaRes.json();

        form.setValues({
          ...facturaData,
          clienteId: facturaData.clienteId?.toString(),
          contratoId: facturaData.contratoId?.toString() || null,
          operacionCampoId: facturaData.operacionCampoId?.toString() || null,
          fechaEmision: new Date(facturaData.fechaEmision),
          fechaVencimiento: new Date(facturaData.fechaVencimiento),
          montoTotal: parseFloat(facturaData.montoTotal),
          impuestos: parseFloat(facturaData.impuestos),
          totalAPagar: parseFloat(facturaData.totalAPagar),
          renglones: facturaData.renglones.map(r => ({
            ...r,
            cantidad: parseFloat(r.cantidad),
            precioUnitario: parseFloat(r.precioUnitario),
            subtotal: parseFloat(r.subtotal)
          })),
        });
      }
    } catch (err) {
      notifications.show({
        title: 'Error de Carga',
        message: `No se pudieron cargar los datos necesarios: ${err.message}`,
        color: 'red',
      });
      router.push('/superuser/facturacion'); // Redirigir si falla la carga inicial
    } finally {
      setLoading(false);
    }
  }, [facturaId, router]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchDependencies();
  }, [fetchDependencies]);

  const handleAddRenglon = () => {
    form.insertListItem('renglones', {
      id: null, // Para nuevos renglones, el ID es null
      descripcion: '',
      cantidad: 1.0,
      unidadMedida: 'Unidad',
      precioUnitario: 0.0,
      subtotal: 0.0,
    });
  };

  const handleRemoveRenglon = (index) => {
    form.removeListItem('renglones', index);
  };

  const handleSubmit = async (values) => {
    setIsSubmitting(true);
    const payload = {
      ...values,
      clienteId: parseInt(values.clienteId),
      contratoId: values.contratoId ? parseInt(values.contratoId) : null,
      operacionCampoId: values.operacionCampoId ? parseInt(values.operacionCampoId) : null,
      fechaEmision: values.fechaEmision.toISOString().split('T')[0],
      fechaVencimiento: values.fechaVencimiento.toISOString().split('T')[0],
      // montoTotal, impuestos, totalAPagar se calculan en el backend API
      renglones: values.renglones.map(r => ({
        ...r,
        cantidad: parseFloat(r.cantidad),
        precioUnitario: parseFloat(r.precioUnitario),
      })),
    };

    let response;
    let url = '/api/superuser/facturacion';
    let method = 'POST';
    let successMessage = 'Factura creada exitosamente';
    let errorMessage = 'Error al crear factura';

    if (facturaId) {
      url = `/api/superuser/facturacion/${facturaId}`;
      method = 'PUT';
      successMessage = 'Factura actualizada exitosamente';
      errorMessage = 'Error al actualizar factura';
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
      router.push('/superuser/facturacion'); // Redirigir al listado después de guardar
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
    <Box maw={900} mx="auto" py="md">
      <Title order={2} mb="lg">{facturaId ? 'Editar Factura' : 'Crear Nueva Factura'}</Title>
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <TextInput
          label="Número de Factura"
          placeholder="Ej. F-2025-0001"
          {...form.getInputProps('numeroFactura')}
          mb="md"
        />
        <Select
          label="Cliente"
          placeholder="Selecciona un cliente"
          data={clientes}
          searchable
          {...form.getInputProps('clienteId')}
          mb="md"
        />
        <Select
          label="Contrato Asociado (Opcional)"
          placeholder="Selecciona un contrato"
          data={contratos}
          clearable
          searchable
          {...form.getInputProps('contratoId')}
          mb="md"
        />
        <Select
          label="Operación de Campo Asociada (Opcional)"
          placeholder="Selecciona una operación de campo"
          data={operacionesCampo}
          clearable
          searchable
          {...form.getInputProps('operacionCampoId')}
          mb="md"
        />
        <DateInput
          label="Fecha de Emisión"
          placeholder="Selecciona la fecha de emisión"
          valueFormat="DD/MM/YYYY"
          {...form.getInputProps('fechaEmision')}
          mb="md"
        />
        <DateInput
          label="Fecha de Vencimiento"
          placeholder="Selecciona la fecha de vencimiento"
          valueFormat="DD/MM/YYYY"
          {...form.getInputProps('fechaVencimiento')}
          mb="md"
        />
        <Select
          label="Estado de la Factura"
          placeholder="Selecciona el estado"
          data={['Pendiente', 'Pagada', 'Vencida', 'Anulada']}
          {...form.getInputProps('estado')}
          mb="md"
        />
        <Textarea
          label="Notas Adicionales"
          placeholder="Cualquier nota relevante sobre esta factura"
          {...form.getInputProps('notas')}
          rows={3}
          mb="md"
        />

        <Divider my="lg" label="Renglones de Factura" labelPosition="center" />

        {form.values.renglones.map((renglon, index) => (
          <RenglonFacturaForm
            key={renglon.id || index} // Usa el ID si existe, sino el índice
            index={index}
            form={form}
            onRemove={handleRemoveRenglon}
            renglon={renglon}
          />
        ))}

        {form.errors.renglones && (
          <Text c="red" size="sm" mb="md">{form.errors.renglones}</Text>
        )}

        <Button
          leftSection={<IconPlus size={20} />}
          variant="light"
          onClick={handleAddRenglon}
          mt="sm"
          mb="xl"
        >
          Agregar Renglón
        </Button>

        <Group justify="flex-end" mt="xl">
          <Button variant="default" onClick={() => router.push('/superuser/facturacion')}>
            Cancelar
          </Button>
          <Button type="submit" loading={isSubmitting} disabled={isSubmitting}>
            {facturaId ? 'Actualizar Factura' : 'Crear Factura'}
          </Button>
        </Group>
      </form>
    </Box>
  );
}