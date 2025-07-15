// components/contratos/ContratoForm.jsx
'use client';

import React, { useEffect, useState } from 'react';
import { TextInput, Button, Group, Box, Paper, Title, Grid, Loader, Center, Select, NumberInput, Textarea, Switch, Container, Text } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';
import { SelectClienteConCreacion } from './SelectClienteConCreacion';
// No necesitas importar ModalCrearCliente aquí directamente, ya lo maneja SelectClienteConCreacion

export function ContratoForm({ initialData = null }) {
  const router = useRouter();
  // Eliminamos los estados clientes, loadingOptions y errorOptions
  // ya que SelectClienteConCreacion manejará su propia carga de datos

  const form = useForm({
    initialValues: {
      numeroContrato: '',
      clienteId: '', // Debe ser el ID del cliente (string porque Mantine Select lo espera)
      fechaInicio: null,
      fechaFin: null,
      montoTotal: 0.0,
      descripcion: '',
      activo: true,
      estado: 'Activo', // Puedes definir un valor por defecto o un enum
    },
    validate: {
      numeroContrato: (value) => (value ? null : 'El número de contrato es requerido'),
      clienteId: (value) => (value ? null : 'Seleccionar un cliente es requerido'),
      fechaInicio: (value) => (value ? null : 'La fecha de inicio es requerida'),
      montoTotal: (value) => (value > 0 ? null : 'El monto total debe ser mayor a 0'),
      fechaFin: (value, values) => {
        // Si el contrato no está activo, la fecha de fin es requerida
        if (!values.activo && !value) {
          return 'Si el contrato no está activo, la fecha de fin es requerida';
        }
        // Si hay fecha de fin y fecha de inicio, la fecha de fin no puede ser anterior
        if (value && values.fechaInicio && value < values.fechaInicio) {
          return 'La fecha de fin no puede ser anterior a la fecha de inicio';
        }
        return null;
      },
    },
  });

  // Cargar datos iniciales si se está editando
  useEffect(() => {
    if (initialData) {
      form.setValues({
        ...initialData,
        clienteId: initialData.clienteId.toString(), // Convertir a string para el Select
        fechaInicio: initialData.fechaInicio ? new Date(initialData.fechaInicio) : null,
        fechaFin: initialData.fechaFin ? new Date(initialData.fechaFin) : null,
      });
    }
  }, [initialData, form]); // Añadir 'form' a las dependencias del useEffect

  // El useEffect para cargar opciones de clientes ya no es necesario aquí.
  // Es manejado internamente por SelectClienteConCreacion.

  const handleSubmit = async (values) => {
    const payload = {
      ...values,
      clienteId: parseInt(values.clienteId), // Convertir a número para la API
      fechaInicio: values.fechaInicio ? values.fechaInicio.toISOString().split('T')[0] : null,
      fechaFin: values.fechaFin ? values.fechaFin.toISOString().split('T')[0] : null,
      montoTotal: parseFloat(values.montoTotal), // Asegurarse de que sea un número flotante
    };

    let response;
    let url = '/api/operaciones/contratos';
    let method = 'POST';
    let successMessage = 'Contrato registrado exitosamente';
    let errorMessage = 'Error al registrar contrato';

    if (initialData) {
      url = `/api/operaciones/contratos/${initialData.id}`;
      method = 'PUT';
      successMessage = 'Contrato actualizado exitosamente';
      errorMessage = 'Error al actualizar contrato';
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
      router.push('/superuser/contratos'); // Redirigir al listado
    } catch (error) {
      console.error(errorMessage, error);
      notifications.show({
        title: 'Error',
        message: `${errorMessage}: ${error.message}`,
        color: 'red',
      });
    }
  };

  // Eliminamos los loaders y mensajes de error específicos de carga de clientes
  // ya que SelectClienteConCreacion maneja su propio estado de carga y mensajes.

  return (
    <Box maw={800} mx="auto">
      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <Title order={2} ta="center" mb="lg">
          {initialData ? 'Editar Contrato' : 'Registrar Nuevo Contrato'}
        </Title>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Grid gutter="md">
            <Grid.Col span={{ base: 12, md: 6 }}>
              <TextInput
                label="Número de Contrato"
                placeholder="CONTRATO-001"
                required
                {...form.getInputProps('numeroContrato')}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              {/* Aquí usamos el nuevo componente SelectClienteConCreacion */}
              <SelectClienteConCreacion
                form={form}
                fieldName="clienteId" // El nombre del campo en tu objeto `form`
                label="Cliente"
                placeholder="Selecciona un cliente o crea uno nuevo"
                disabled={!!initialData} // Deshabilitar si se está editando un contrato existente
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <DateInput
                label="Fecha de Inicio"
                placeholder="Selecciona la fecha de inicio"
                valueFormat="DD/MM/YYYY"
                required
                {...form.getInputProps('fechaInicio')}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <DateInput
                label="Fecha de Fin (Opcional)"
                placeholder="Selecciona la fecha de fin"
                valueFormat="DD/MM/YYYY"
                {...form.getInputProps('fechaFin')}
                // Si está activo, la fecha de fin es opcional.
                // Si no está activo, la validación hará que sea requerida si está vacía.
                disabled={form.values.activo}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <NumberInput
                label="Monto Total"
                placeholder="Ej. 1500.00"
                prefix="Bs. " // Cambiado a Bs. para Venezuela
                decimalScale={2}
                fixedDecimalScale
                min={0}
                thousandSeparator="."
                decimalSeparator=","
                required
                {...form.getInputProps('montoTotal')}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Select
                label="Estado del Contrato"
                placeholder="Selecciona un estado"
                data={['Activo', 'Pausado', 'Finalizado', 'Cancelado']} // Ajusta estos estados a tu ENUM en Sequelize
                required
                {...form.getInputProps('estado')}
              />
            </Grid.Col>
            <Grid.Col span={12}>
              <Textarea
                label="Descripción"
                placeholder="Detalles y términos del contrato"
                {...form.getInputProps('descripcion')}
                rows={3}
              />
            </Grid.Col>
            <Grid.Col span={12}>
              <Switch
                label="Contrato Activo"
                checked={form.values.activo}
                {...form.getInputProps('activo', { type: 'checkbox' })}
                size="lg"
                onLabel="ACTIVO"
                offLabel="INACTIVO"
                mt="md"
                onChange={(event) => {
                  form.setFieldValue('activo', event.currentTarget.checked);
                  // Si se marca como activo, limpia la fecha de fin y establece estado a 'Activo'
                  if (event.currentTarget.checked) {
                    form.setFieldValue('fechaFin', null);
                    form.setFieldValue('estado', 'Activo');
                  } else {
                    // Si se desactiva, puedes establecer un estado por defecto o requerir fechaFin
                    form.setFieldValue('estado', 'Finalizado'); // O 'Inactivo' / 'Cancelado'
                    // La validación de fechaFin ya se encarga si es requerido
                  }
                }}
              />
            </Grid.Col>
          </Grid>

          <Group justify="flex-end" mt="xl">
            <Button variant="default" onClick={() => router.back()}>
              Cancelar
            </Button>
            <Button type="submit">
              {initialData ? 'Actualizar Contrato' : 'Registrar Contrato'}
            </Button>
          </Group>
        </form>
      </Paper>
    </Box>
  );
}