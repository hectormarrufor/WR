// components/facturacion/PagoFacturaForm.jsx
'use client';

import React, { useState } from 'react';
import { TextInput, Button, Group, Box, Select, NumberInput, Textarea } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';

export function PagoFacturaForm({ facturaId, onSuccess, onCancel }) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    initialValues: {
      fechaPago: new Date(),
      monto: 0.0,
      metodoPago: 'Transferencia Bancaria', // Valor por defecto
      referencia: '',
    },
    validate: {
      monto: (value) => (value > 0 ? null : 'El monto del pago debe ser mayor a cero'),
      fechaPago: (value) => (value ? null : 'La fecha de pago es requerida'),
      metodoPago: (value) => (value ? null : 'El método de pago es requerido'),
    },
  });

  const handleSubmit = async (values) => {
    setIsSubmitting(true);
    const payload = {
      ...values,
      facturaId: parseInt(facturaId), // Asegurar que el ID de factura sea entero
      fechaPago: values.fechaPago.toISOString().split('T')[0],
      monto: parseFloat(values.monto),
    };

    try {
      const response = await fetch(`/api/contratos/facturacion/${facturaId}/pagos`, { // API para registrar pagos
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
        message: 'Pago registrado exitosamente.',
        color: 'green',
      });
      form.reset(); // Limpiar formulario después de éxito
      onSuccess(); // Llama a la función de éxito para cerrar modal y/o recargar datos
    } catch (error) {
      console.error('Error registrando pago:', error);
      notifications.show({
        title: 'Error',
        message: `No se pudo registrar el pago: ${error.message}`,
        color: 'red',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box>
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <DateInput
          label="Fecha de Pago"
          placeholder="Selecciona la fecha del pago"
          valueFormat="DD/MM/YYYY"
          {...form.getInputProps('fechaPago')}
          mb="md"
        />
        <NumberInput
          label="Monto del Pago ($)"
          placeholder="0.00"
          precision={2}
          min={0.01}
          step={0.01}
          prefix="$"
          {...form.getInputProps('monto')}
          mb="md"
        />
        <Select
          label="Método de Pago"
          placeholder="Selecciona el método"
          data={['Transferencia Bancaria', 'Efectivo', 'Cheque', 'Tarjeta de Crédito', 'Zelle']} // Puedes expandir estos métodos
          {...form.getInputProps('metodoPago')}
          mb="md"
        />
        <TextInput
          label="Referencia del Pago (Opcional)"
          placeholder="Ej. Nro. de transferencia, Nro. de cheque"
          {...form.getInputProps('referencia')}
          mb="md"
        />

        <Group justify="flex-end" mt="xl">
          <Button variant="default" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" loading={isSubmitting} disabled={isSubmitting}>
            Registrar Pago
          </Button>
        </Group>
      </form>
    </Box>
  );
}