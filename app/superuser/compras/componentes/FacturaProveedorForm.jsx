// components/compras/FacturaProveedorForm.jsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  TextInput, Button, Group, Box, Select, NumberInput, Textarea,
  Loader, Center, Title, Paper, Divider, ActionIcon, Flex, Text, Tooltip
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useRouter, useSearchParams } from 'next/navigation';
import { IconTrash, IconInfoCircle } from '@tabler/icons-react';

export function FacturaProveedorForm({ facturaId }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialOrdenCompraId = searchParams.get('ordenCompraId'); // Si viene de un link desde la OC

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [proveedores, setProveedores] = useState([]);
  const [ordenesCompra, setOrdenesCompra] = useState([]); // Todas las OC para seleccionar
  const [ocItemsForFactura, setOcItemsForFactura] = useState([]); // Items de la OC que se pueden facturar

  const form = useForm({
    initialValues: {
      proveedorId: null,
      ordenCompraId: initialOrdenCompraId || null,
      numeroFactura: '',
      fechaEmision: new Date(),
      fechaVencimiento: new Date(new Date().setMonth(new Date().getMonth() + 1)), // 1 mes después
      fechaRecepcionFactura: new Date(),
      notas: '',
      detalles: [],
    },
    validate: {
      proveedorId: (value) => (value ? null : 'El proveedor es requerido'),
      numeroFactura: (value) => (value ? null : 'El número de factura es requerido'),
      fechaEmision: (value) => (value ? null : 'La fecha de emisión es requerida'),
      fechaVencimiento: (value) => (value ? null : 'La fecha de vencimiento es requerida'),
      fechaRecepcionFactura: (value) => (value ? null : 'La fecha de recepción de factura es requerida'),
      detalles: (value) => (value.length > 0 ? null : 'La factura debe tener al menos un detalle'),
    },
  });

  const fetchDependencies = useCallback(async () => {
    setLoading(true);
    try {
      const [provRes, ocRes] = await Promise.all([
        fetch('/api/superuser/compras/proveedores'),
        fetch('/api/superuser/compras/ordenes-compra?estado=Recibida Parcial&estado=Recibida Completa&estado=Aprobada&estado=Enviada'), // OCs que puedan ser facturadas
      ]);

      const [provData, ocData] = await Promise.all([
        provRes.json(),
        ocRes.json(),
      ]);

      setProveedores(provData.map(p => ({ value: p.id.toString(), label: p.nombre })));
      setOrdenesCompra(ocData.map(oc => ({ value: oc.id.toString(), label: `${oc.numeroOrden} (${oc.proveedor.nombre}) - ${oc.estado}` })));

      if (facturaId) {
        // Cargar datos de la factura existente para edición
        const facturaRes = await fetch(`/api/superuser/compras/facturas-proveedor/${facturaId}`);
        if (!facturaRes.ok) throw new Error('No se pudo cargar la factura.');
        const facturaData = await facturaRes.json();
        form.setValues({
          proveedorId: facturaData.proveedorId.toString(),
          ordenCompraId: facturaData.ordenCompraId ? facturaData.ordenCompraId.toString() : null,
          numeroFactura: facturaData.numeroFactura,
          fechaEmision: new Date(facturaData.fechaEmision),
          fechaVencimiento: new Date(facturaData.fechaVencimiento),
          fechaRecepcionFactura: new Date(facturaData.fechaRecepcionFactura),
          notas: facturaData.notas,
          detalles: facturaData.detalles.map(d => ({
            id: d.id,
            consumibleId: d.consumibleId.toString(),
            cantidadFacturada: parseFloat(d.cantidadFacturada),
            precioUnitarioFacturado: parseFloat(d.precioUnitarioFacturado),
            impuestos: parseFloat(d.impuestos),
            detalleOrdenCompraId: d.detalleOrdenCompraId ? d.detalleOrdenCompraId.toString() : null,
            detalleRecepcionCompraId: d.detalleRecepcionCompraId ? d.detalleRecepcionCompraId.toString() : null,
            notas: d.notas || '',
            consumibleNombre: d.consumible.nombre, // Para display
          })),
        });
        // Si hay una OC asociada, cargar sus items para asegurar que se puedan seleccionar
        if (facturaData.ordenCompraId) {
          await handleOrdenCompraChange(facturaData.ordenCompraId.toString(), true);
        }
      } else if (initialOrdenCompraId) {
          // Si viene de una OC pre-seleccionada, cargar sus detalles
          await handleOrdenCompraChange(initialOrdenCompraId, true);
      }

    } catch (err) {
      notifications.show({
        title: 'Error de Carga',
        message: `No se pudieron cargar los datos necesarios: ${err.message}`,
        color: 'red',
      });
      setError(err); // Considerar usar un estado de error
    } finally {
      setLoading(false);
    }
  }, [facturaId, form, initialOrdenCompraId]);

  useEffect(() => {
    fetchDependencies();
  }, [fetchDependencies]);

  const handleOrdenCompraChange = async (ocId, isInitialLoad = false) => {
    form.setFieldValue('ordenCompraId', ocId);
    setOcItemsForFactura([]);
    if (ocId) {
      try {
        const response = await fetch(`/api/superuser/compras/ordenes-compra/${ocId}`);
        if (!response.ok) {
          throw new Error('No se pudo cargar la Orden de Compra.');
        }
        const ocData = await response.json();
        // Filtrar los detalles de OC que aún no han sido facturados completamente
        const itemsPendientes = ocData.detalles.filter(d => !d.facturadoCompletamente);
        setOcItemsForFactura(itemsPendientes.map(d => ({
            value: d.id.toString(),
            label: `${d.consumible.nombre} - Cantidad Pendiente: ${parseFloat(d.cantidad) - parseFloat(d.cantidadFacturada)}`,
            consumibleId: d.consumibleId.toString(),
            consumibleNombre: d.consumible.nombre,
            cantidadPendiente: parseFloat(d.cantidad) - parseFloat(d.cantidadFacturada),
            precioUnitarioOC: parseFloat(d.precioUnitario),
            detalleOrdenCompraId: d.id.toString(), // Guardar el ID del DetalleOC
        })));

        if (!isInitialLoad && itemsPendientes.length > 0) { // Si no es carga inicial y hay items
            form.setFieldValue('proveedorId', ocData.proveedorId.toString()); // Sugerir proveedor de la OC
            // Puedes auto-llenar los detalles si la OC es para una factura completa
            // form.setFieldValue('detalles', itemsPendientes.map(item => ({
            //     consumibleId: item.consumibleId,
            //     cantidadFacturada: item.cantidadPendiente,
            //     precioUnitarioFacturado: item.precioUnitarioOC,
            //     impuestos: 0,
            //     detalleOrdenCompraId: item.detalleOrdenCompraId,
            //     notas: '',
            // })));
        }

      } catch (err) {
        notifications.show({
          title: 'Error',
          message: `Error al cargar detalles de la OC: ${err.message}`,
          color: 'red',
        });
        setOcItemsForFactura([]);
      }
    }
  };

  const addDetail = () => {
    form.insertListItem('detalles', {
      consumibleId: '',
      cantidadFacturada: 0,
      precioUnitarioFacturado: 0,
      impuestos: 0,
      detalleOrdenCompraId: null,
      detalleRecepcionCompraId: null,
      notas: '',
      consumibleNombre: '', // Para display
    });
  };

  const removeDetail = (index) => {
    form.removeListItem('detalles', index);
  };

  const handleConsumibleChange = (value, index) => {
    const selectedConsumible = ocItemsForFactura.find(item => item.value === value);
    if (selectedConsumible) {
        form.setFieldValue(`detalles.${index}.consumibleId`, selectedConsumible.consumibleId);
        form.setFieldValue(`detalles.${index}.cantidadFacturada`, selectedConsumible.cantidadPendiente);
        form.setFieldValue(`detalles.${index}.precioUnitarioFacturado`, selectedConsumible.precioUnitarioOC);
        form.setFieldValue(`detalles.${index}.detalleOrdenCompraId`, selectedConsumible.detalleOrdenCompraId);
        form.setFieldValue(`detalles.${index}.consumibleNombre`, selectedConsumible.consumibleNombre);
    }
  };

  const handleSubmit = async (values) => {
    setIsSubmitting(true);

    const payload = {
      ...values,
      proveedorId: parseInt(values.proveedorId),
      ordenCompraId: values.ordenCompraId ? parseInt(values.ordenCompraId) : null,
      fechaEmision: values.fechaEmision.toISOString().split('T')[0],
      fechaVencimiento: values.fechaVencimiento.toISOString().split('T')[0],
      fechaRecepcionFactura: values.fechaRecepcionFactura.toISOString().split('T')[0],
      detalles: values.detalles.map(d => ({
        ...d,
        consumibleId: parseInt(d.consumibleId),
        cantidadFacturada: parseFloat(d.cantidadFacturada),
        precioUnitarioFacturado: parseFloat(d.precioUnitarioFacturado),
        impuestos: parseFloat(d.impuestos || 0),
        detalleOrdenCompraId: d.detalleOrdenCompraId ? parseInt(d.detalleOrdenCompraId) : null,
        detalleRecepcionCompraId: d.detalleRecepcionCompraId ? parseInt(d.detalleRecepcionCompraId) : null,
      })),
    };

    try {
      const method = facturaId ? 'PUT' : 'POST';
      const url = facturaId ? `/api/superuser/compras/facturas-proveedor/${facturaId}` : '/api/superuser/compras/facturas-proveedor';
      const response = await fetch(url, {
        method: method,
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
        message: `Factura de Proveedor ${facturaId ? 'actualizada' : 'registrada'} exitosamente.`,
        color: 'green',
      });
      router.push('/superuser/compras/facturas-proveedor');
    } catch (error) {
      console.error('Error al registrar/actualizar factura:', error);
      notifications.show({
        title: 'Error',
        message: `Error al ${facturaId ? 'actualizar' : 'registrar'} factura de proveedor: ${error.message}`,
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
    <Box maw={1000} mx="auto" py="md">
      <Title order={2} mb="lg">{facturaId ? 'Editar Factura de Proveedor' : 'Registrar Nueva Factura de Proveedor'}</Title>
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Paper withBorder shadow="md" p="md" mb="lg">
          <Title order={4} mb="sm">Datos Generales de la Factura</Title>
          <Select
            label="Proveedor"
            placeholder="Selecciona un proveedor"
            data={proveedores}
            searchable
            {...form.getInputProps('proveedorId')}
            mb="md"
          />
          <Select
            label="Orden de Compra (Opcional)"
            placeholder="Vincula a una Orden de Compra"
            data={ordenesCompra}
            searchable
            clearable
            {...form.getInputProps('ordenCompraId')}
            onChange={handleOrdenCompraChange}
            mb="md"
          />
          <Group grow mb="md">
            <TextInput
              label="Número de Factura"
              placeholder="Ej: F001-2023-01"
              {...form.getInputProps('numeroFactura')}
              required
            />
            <DateInput
              label="Fecha de Emisión"
              placeholder="DD/MM/YYYY"
              valueFormat="DD/MM/YYYY"
              {...form.getInputProps('fechaEmision')}
              maxDate={new Date()}
              required
            />
          </Group>
          <Group grow mb="md">
            <DateInput
              label="Fecha de Vencimiento"
              placeholder="DD/MM/YYYY"
              valueFormat="DD/MM/YYYY"
              {...form.getInputProps('fechaVencimiento')}
              minDate={form.values.fechaEmision}
              required
            />
            <DateInput
              label="Fecha de Recepción de Factura"
              placeholder="DD/MM/YYYY"
              valueFormat="DD/MM/YYYY"
              {...form.getInputProps('fechaRecepcionFactura')}
              maxDate={new Date()}
              required
            />
          </Group>
          <Textarea
            label="Notas de la Factura"
            placeholder="Notas generales sobre la factura"
            {...form.getInputProps('notas')}
            rows={3}
            mb="md"
          />
        </Paper>

        <Paper withBorder shadow="md" p="md" mb="lg">
          <Group justify="space-between" mb="sm">
            <Title order={4}>Ítems Facturados</Title>
            <Button size="sm" onClick={addDetail}>
              Añadir Ítem
            </Button>
          </Group>

          {form.values.detalles.length === 0 && (
            <Text c="dimmed" ta="center" mt="md">Haz click en "Añadir Ítem" para empezar a detallar la factura.</Text>
          )}

          {form.values.detalles.map((detail, index) => (
            <Box key={detail.id || `new-${index}`} p="sm" my="sm" style={{ border: '1px solid var(--mantine-color-gray-3)', borderRadius: '4px' }}>
              <Group justify="space-between">
                {form.values.ordenCompraId ? (
                  <Select
                    label="Consumible / Ítem de OC"
                    placeholder="Selecciona un ítem de la OC o un consumible"
                    data={ocItemsForFactura}
                    searchable
                    value={detail.detalleOrdenCompraId || detail.consumibleId} // Usar detalleOCId si está vinculado
                    onChange={(value) => handleConsumibleChange(value, index)}
                    required
                    style={{ flexGrow: 1 }}
                  />
                ) : (
                  <TextInput
                    label="Nombre Consumible (Manual)"
                    value={detail.consumibleNombre} // Si no hay OC, el usuario debe escribirlo o buscar
                    onChange={(event) => {
                      form.setFieldValue(`detalles.${index}.consumibleNombre`, event.currentTarget.value);
                      // En un caso real, aquí buscarías el consumible y settearías consumibleId
                    }}
                    required
                    style={{ flexGrow: 1 }}
                  />
                )}
                <ActionIcon color="red" variant="light" onClick={() => removeDetail(index)}>
                  <IconTrash size={18} />
                </ActionIcon>
              </Group>
              <Text size="xs" c="dimmed">
                {detail.detalleOrdenCompraId && ocItemsForFactura.find(item => item.value === detail.detalleOrdenCompraId) ?
                  `Cantidad Pendiente de OC: ${ocItemsForFactura.find(item => item.value === detail.detalleOrdenCompraId).cantidadPendiente.toFixed(2)}`
                : 'Ítem no vinculado a OC o sin OC seleccionada'}
              </Text>

              <Group grow mt="md">
                <NumberInput
                  label="Cantidad Facturada"
                  placeholder="0.00"
                  precision={2}
                  min={0.01}
                  step={0.01}
                  {...form.getInputProps(`detalles.${index}.cantidadFacturada`)}
                  required
                />
                <NumberInput
                  label="Precio Unitario Facturado"
                  placeholder="0.00"
                  precision={2}
                  min={0}
                  step={0.01}
                  {...form.getInputProps(`detalles.${index}.precioUnitarioFacturado`)}
                  required
                />
                 <NumberInput
                  label="Impuestos (Opcional)"
                  placeholder="0.00"
                  precision={2}
                  min={0}
                  step={0.01}
                  {...form.getInputProps(`detalles.${index}.impuestos`)}
                />
              </Group>
              <Textarea
                label="Notas del Ítem (Opcional)"
                placeholder="Notas específicas para este ítem facturado"
                {...form.getInputProps(`detalles.${index}.notas`)}
                mt="md"
              />
              <Divider my="sm" />
            </Box>
          ))}
        </Paper>

        <Group justify="flex-end" mt="xl">
          <Button variant="default" onClick={() => router.push('/superuser/compras/facturas-proveedor')}>
            Cancelar
          </Button>
          <Button type="submit" loading={isSubmitting} disabled={isSubmitting || form.values.detalles.length === 0}>
            {facturaId ? 'Guardar Cambios' : 'Registrar Factura'}
          </Button>
        </Group>
      </form>
    </Box>
  );
}