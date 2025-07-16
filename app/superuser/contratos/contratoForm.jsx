// components/contratos/ContratoForm.jsx
'use client';

import React, { useEffect } from 'react';
import {
  TextInput, Button, Group, Box, Paper, Title, Grid, Divider, ActionIcon,
  Select, NumberInput, Textarea, Switch, Container, Text
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import '@mantine/dates/styles.css';
import { SelectClienteConCreacion } from './SelectClienteConCreacion';

export function ContratoForm({ initialData = null }) {
  const router = useRouter();

  const form = useForm({
    initialValues: {
      numeroContrato: '',
      clienteId: '',
      fechaInicio: null,
      fechaFin: null,
      montoTotal: 0.0,
      descripcion: '',
      activo: true,
      estado: 'Activo',
      renglones: [],
    },
    validate: {
      numeroContrato: (value) => (value ? null : 'El número de contrato es requerido'),
      clienteId: (value) => (value ? null : 'Seleccionar un cliente es requerido'),
      fechaInicio: (value) => (value ? null : 'La fecha de inicio es requerida'),
      montoTotal: (value) => (value > 0 ? null : 'El monto total debe ser mayor a 0'),
      renglones: (value) => (value.length > 0 ? null : 'Debe agregar al menos un renglón/fase al contrato'),
      fechaFin: (value, values) => {
        if (!values.activo && !value) {
          return 'Si el contrato no está activo, la fecha de fin es requerida';
        }
        if (value && values.fechaInicio && value < values.fechaInicio) {
          return 'La fecha de fin no puede ser anterior a la fecha de inicio del contrato';
        }
        return null;
      },
    },
  });

  useEffect(() => {
    if (initialData) {
      form.setValues({
        ...initialData,
        clienteId: initialData.clienteId.toString(),
        fechaInicio: initialData.fechaInicio ? new Date(initialData.fechaInicio) : null,
        fechaFin: initialData.fechaFin ? new Date(initialData.fechaFin) : null,
        renglones: initialData.RenglonesContrato?.map(r => ({ // Asegúrate de mapear las fechas si vienen como strings
          ...r,
          fechaInicioEstimada: r.fechaInicioEstimada ? new Date(r.fechaInicioEstimada) : null,
          fechaFinEstimada: r.fechaFinEstimada ? new Date(r.fechaFinEstimada) : null,
        })) || [],
      });
    }
  }, [initialData]);

  useEffect(() => {
    const renglonesWithEndDate = form.values.renglones.filter(r => r.fechaFinEstimada);
    let newFechaFin = null;
    if (renglonesWithEndDate.length > 0) {
      newFechaFin = new Date(Math.max(...renglonesWithEndDate.map(r => new Date(r.fechaFinEstimada))));
    }

    const renglonesWithStartDate = form.values.renglones.filter(r => r.fechaInicioEstimada);
    let newFechaInicio = form.values.fechaInicio;
    if (renglonesWithStartDate.length > 0) {
      const earliestDate = new Date(Math.min(...renglonesWithStartDate.map(r => new Date(r.fechaInicioEstimada))));
      if (!newFechaInicio || earliestDate < newFechaInicio) {
        newFechaInicio = earliestDate;
      }
    }

    if (newFechaFin?.getTime() !== form.values.fechaFin?.getTime()) {
      form.setFieldValue('fechaFin', newFechaFin);
    }
    if (newFechaInicio?.getTime() !== form.values.fechaInicio?.getTime()) {
      form.setFieldValue('fechaInicio', newFechaInicio);
    }
  }, [form.values.renglones]);

  const handleSubmit = async (values) => {
    console.log("values before payload: ", values);
    const payload = {
      ...values,
      clienteId: parseInt(values.clienteId),
      fechaInicio: values.fechaInicio ? values.fechaInicio.toISOString().split('T')[0] : null,
      fechaFin: values.fechaFin ? values.fechaFin.toISOString().split('T')[0] : null,
      montoTotal: parseFloat(values.montoTotal),
      // IMPORTANTE: Aquí pasamos los renglones tal cual.
      // El backend se encargará de crear/actualizar/eliminar.
      renglones: values.renglones.map(renglon => ({
        ...renglon,
        fechaInicioEstimada: renglon.fechaInicioEstimada ? new Date(renglon.fechaInicioEstimada).toISOString().split('T')[0] : null,
        fechaFinEstimada: renglon.fechaFinEstimada ? new Date(renglon.fechaFinEstimada).toISOString().split('T')[0] : null,
      })),
    };
    console.log("values after payload: ", payload);
    // return
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
      router.push('/superuser/contratos');
    } catch (error) {
      console.error(errorMessage, error);
      notifications.show({
        title: 'Error',
        message: `${errorMessage}: ${error.message}`,
        color: 'red',
      });
    }
  };

  const addRenglon = () => {
    form.insertListItem('renglones', {
      nombreRenglon: '',
      pozoNombre: '',
      ubicacionPozo: '',
      fechaInicioEstimada: null,
      fechaFinEstimada: null,
      estado: 'Pendiente',
    });
  };

  const removeRenglon = (index) => {
    form.removeListItem('renglones', index);
  };

  const renglonesFields = form.values.renglones.map((item, index) => (
    <Paper key={index} withBorder shadow="xs" p="md" mb="sm">
      <Group justify="flex-end">
        <ActionIcon
          color="red"
          onClick={() => removeRenglon(index)}
          variant="light"
          size="sm"
          aria-label="Eliminar renglón"
        >
          <IconTrash style={{ width: '70%', height: '70%' }} stroke={1.5} />
        </ActionIcon>
      </Group>
      <Grid gutter="md">
        <Grid.Col span={{ base: 12, md: 6 }}>
          <TextInput
            label="Nombre del Renglón/Fase"
            placeholder="Ej: Instalación pozo X, Mantenimiento preventivo"
            required
            {...form.getInputProps(`renglones.${index}.nombreRenglon`)}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <TextInput
            label="Nombre del Pozo"
            placeholder="Ej: Pozo J-15, Campo Morichal"
            required
            {...form.getInputProps(`renglones.${index}.pozoNombre`)}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <TextInput
            label="Ubicación del Pozo"
            placeholder="Ej: Sector Las Mercedes, Bloque 3"
            {...form.getInputProps(`renglones.${index}.ubicacionPozo`)}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Select
            label="Estado de la Fase"
            placeholder="Selecciona el estado"
            data={['Pendiente', 'En Preparación', 'Mudanza', 'Operando', 'Finalizado', 'Pausado', 'Cancelado']}
            required
            {...form.getInputProps(`renglones.${index}.estado`)}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <DateInput
            label="Fecha Inicio Estimada"
            placeholder="Fecha estimada de inicio"
            valueFormat="DD/MM/YYYY"
            {...form.getInputProps(`renglones.${index}.fechaInicioEstimada`)}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <DateInput
            label="Fecha Fin Estimada"
            placeholder="Fecha estimada de fin"
            valueFormat="DD/MM/YYYY"
            {...form.getInputProps(`renglones.${index}.fechaFinEstimada`)}
          />
        </Grid.Col>
      </Grid>
    </Paper>
  ));

  return (
    <Box maw={1000} mx="auto">
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
              <SelectClienteConCreacion
                form={form}
                fieldName="clienteId"
                label="Cliente"
                placeholder="Selecciona un cliente o crea uno nuevo"
                disabled={!!initialData}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <DateInput
                label="Fecha de Inicio del Contrato"
                placeholder="Selecciona la fecha de inicio"
                valueFormat="DD/MM/YYYY"
                required
                readOnly
                disabled
                {...form.getInputProps('fechaInicio')}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <DateInput
                label="Fecha de Fin del Contrato"
                placeholder="Calculada automáticamente"
                valueFormat="DD/MM/YYYY"
                readOnly
                disabled
                {...form.getInputProps('fechaFin')}
              />
            </Grid.Col>
            <Grid.Col span={12}>
              <Textarea
                label="Descripción General del Contrato"
                placeholder="Detalles y términos generales del contrato"
                {...form.getInputProps('descripcion')}
                rows={3}
              />
            </Grid.Col>
            <Grid.Col span={12}>
              <NumberInput
                label="Monto Total Acordado del Contrato"
                placeholder="Ej. 1500.00"
                prefix="Bs. "
                decimalScale={2}
                fixedDecimalScale
                min={0}
                thousandSeparator="."
                decimalSeparator=","
                required
                {...form.getInputProps('montoTotal')}
                mt="lg"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Select
                label="Estado del Contrato"
                placeholder="Selecciona un estado"
                data={['Activo', 'Pausado', 'Finalizado', 'Cancelado']}
                required
                {...form.getInputProps('estado')}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
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
                  if (event.currentTarget.checked) {
                    form.setFieldValue('estado', 'Activo');
                  } else {
                    form.setFieldValue('estado', 'Finalizado');
                  }
                }}
              />
            </Grid.Col>

            <Grid.Col span={12}>
              <Divider my="md" label="Fases/Renglones de Servicio (Hitos)" labelPosition="center" />
              {renglonesFields.length > 0 ? (
                renglonesFields
              ) : (
                <Text c="dimmed" ta="center" mt="md">No hay fases/renglones agregados. Agregue uno.</Text>
              )}
              <Group justify="center" mt="md">
                <Button leftSection={<IconPlus size={16} />} onClick={addRenglon} variant="light">
                  Agregar Fase/Renglón
                </Button>
              </Group>
              {form.errors.renglones && form.values.renglones.length === 0 && (
                <Text c="red" size="sm" mt={4}>{form.errors.renglones}</Text>
              )}
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