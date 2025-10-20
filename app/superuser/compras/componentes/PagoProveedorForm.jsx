// components/compras/PagoProveedorForm.jsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  TextInput, Button, Group, Box, Select, NumberInput, Textarea,
  Loader, Center, Title, Paper, Flex, Text
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';

export function PagoProveedorForm({ facturaProveedorId }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [facturaData, setFacturaData] = useState(null);
  const [cuentasBancarias, setCuentasBancarias] = useState([]);
  const [empleados, setEmpleados] = useState([]);

  const form = useForm({
    initialValues: {
      facturaProveedorId: facturaProveedorId,
      monto: 0,
      fechaPago: new Date(),
      metodoPago: 'Transferencia',
      referenciaPago: '',
      cuentaBancariaId: null,
      registradoPorId: null,
      notas: '',
    },
    validate: {
      monto: (value) => (value > 0 ? null : 'El monto debe ser mayor a cero'),
      fechaPago: (value) => (value ? null : 'La fecha de pago es requerida'),
      metodoPago: (value) => (value ? null : 'El método de pago es requerido'),
      cuentaBancariaId: (value, values) => (values.metodoPago === 'Transferencia' || values.metodoPago === 'Cheque' ? (value ? null : 'La cuenta bancaria es requerida para este método de pago') : null),
    },
  });

  const fetchDependencies = useCallback(async () => {
    setLoading(true);
    try {
      const [facturaRes, cuentasRes, empleadosRes] = await Promise.all([
        fetch(`/api/compras/facturas-proveedor/${facturaProveedorId}`),
        fetch('/api/tesoreria/cuentas-bancarias'),
        fetch('/api/rrhh/empleados'),
      ]);

      if (!facturaRes.ok) throw new Error('No se pudo cargar la factura del proveedor.');
      const factura = await facturaRes.json();
      setFacturaData(factura);

      const cuentas = await cuentasRes.json();
      setCuentasBancarias(cuentas.map(c => ({ value: c.id.toString(), label: `${c.nombreBanco} - ${c.numeroCuenta}` })));

      const empleadosData = await empleadosRes.json();
      setEmpleados(empleadosData.map(e => ({ value: e.id.toString(), label: `${e.nombre} ${e.apellido}` })));

      // Establecer el monto por defecto al saldo pendiente
      const saldoPendiente = parseFloat(factura.totalAPagar) - parseFloat(factura.montoPagado);
      form.setFieldValue('monto', saldoPendiente);

    } catch (err) {
      notifications.show({
        title: 'Error de Carga',
        message: `No se pudieron cargar los datos necesarios: ${err.message}`,
        color: 'red',
      });
      // Redirigir si no se encuentra la factura o hay un error crítico
      router.push('/superuser/compras/facturas-proveedor');
    } finally {
      setLoading(false);
    }
  }, [facturaProveedorId, form, router]);

  useEffect(() => {
    fetchDependencies();
  }, [fetchDependencies]);

  const handleSubmit = async (values) => {
    setIsSubmitting(true);
    const payload = {
      ...values,
      facturaProveedorId: parseInt(facturaProveedorId),
      monto: parseFloat(values.monto),
      fechaPago: values.fechaPago.toISOString().split('T')[0],
      cuentaBancariaId: values.cuentaBancariaId ? parseInt(values.cuentaBancariaId) : null,
      registradoPorId: values.registradoPorId ? parseInt(values.registradoPorId) : null,
    };

    try {
      const response = await fetch('/api/compras/pagos-proveedor', {
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
        message: 'Pago a proveedor registrado exitosamente y factura actualizada.',
        color: 'green',
      });
      router.push(`/superuser/compras/facturas-proveedor/${facturaProveedorId}`);
    } catch (error) {
      console.error('Error al registrar pago:', error);
      notifications.show({
        title: 'Error',
        message: `Error al registrar pago a proveedor: ${error.message}`,
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
        <Text ml="md">Cargando datos del pago...</Text>
      </Center>
    );
  }

  if (!facturaData) {
    return (
      <Center style={{ height: '400px' }}>
        <Text>No se pudo cargar la información de la factura.</Text>
      </Center>
    );
  }

  const saldoPendiente = parseFloat(facturaData.totalAPagar) - parseFloat(facturaData.montoPagado);

  return (
    <Box maw={600} mx="auto" py="md">
      <Title order={2} mb="lg">Registrar Pago a Proveedor</Title>
      <Paper   shadow="md" p="md" mb="lg">
        <Text size="lg" fw={700}>Factura: {facturaData.numeroFactura}</Text>
        <Text>Proveedor: {facturaData.proveedor?.nombre}</Text>
        <Text>Monto Total: ${parseFloat(facturaData.totalAPagar).toFixed(2)}</Text>
        <Text>Monto Ya Pagado: ${parseFloat(facturaData.montoPagado).toFixed(2)}</Text>
        <Text fw={700} color="blue">Saldo Pendiente: ${saldoPendiente.toFixed(2)}</Text>
      </Paper>

      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Paper   shadow="md" p="md" mb="lg">
          <Title order={4} mb="sm">Detalles del Pago</Title>
          <NumberInput
            label="Monto a Pagar"
            placeholder="0.00"
            precision={2}
            min={0.01}
            max={saldoPendiente} // No se puede pagar más del saldo pendiente
            step={0.01}
            {...form.getInputProps('monto')}
            required
            mb="md"
          />
          <DateInput
            label="Fecha de Pago"
            placeholder="DD/MM/YYYY"
            valueFormat="DD/MM/YYYY"
            {...form.getInputProps('fechaPago')}
            maxDate={new Date()}
            required
            mb="md"
          />
          <Select
            label="Método de Pago"
            placeholder="Selecciona el método"
            data={['Transferencia', 'Cheque', 'Efectivo', 'Otro']}
            {...form.getInputProps('metodoPago')}
            required
            mb="md"
          />
          {(form.values.metodoPago === 'Transferencia' || form.values.metodoPago === 'Cheque') && (
            <Select
              label="Cuenta Bancaria (Origen)"
              placeholder="Selecciona la cuenta desde donde se pagará"
              data={cuentasBancarias}
              searchable
              {...form.getInputProps('cuentaBancariaId')}
              required
              mb="md"
            />
          )}
          <TextInput
            label="Referencia de Pago (Ej: N° de Transacción/Cheque)"
            placeholder="Introduce la referencia del pago"
            {...form.getInputProps('referenciaPago')}
            mb="md"
          />
          <Select
            label="Registrado Por (Empleado - Opcional)"
            placeholder="Selecciona el empleado que registra el pago"
            data={empleados}
            searchable
            clearable
            {...form.getInputProps('registradoPorId')}
            mb="md"
          />
          <Textarea
            label="Notas del Pago"
            placeholder="Notas específicas sobre este pago"
            {...form.getInputProps('notas')}
            rows={2}
            mb="md"
          />
        </Paper>

        <Group justify="flex-end" mt="xl">
          <Button variant="default" onClick={() => router.push(`/superuser/compras/facturas-proveedor/${facturaProveedorId}`)}>
            Cancelar
          </Button>
          <Button type="submit" loading={isSubmitting} disabled={isSubmitting || saldoPendiente <= 0}>
            Registrar Pago
          </Button>
        </Group>
      </form>
    </Box>
  );
}