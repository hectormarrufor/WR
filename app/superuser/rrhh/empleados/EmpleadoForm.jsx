'use client';

import React, { useEffect, useState } from 'react';
import {
  TextInput, Button, Group, Box, Paper, Title, Grid, Select, Textarea, NumberInput,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';
import '@mantine/dates/styles.css';

export function EmpleadoForm({ initialData = null }) {
  const [puestos, setPuestos] = useState([])
  const router = useRouter();

  const form = useForm({
    initialValues: {
      cedula: '',
      nombre: '',
      apellido: '',
      telefono: '',
      email: '',
      direccion: '',
      fechaContratacion: null,
      fechaNacimiento: null,
      fechaRetorno: null,
      estado: 'Activo',
      puesto: '',
      sueldo: 0,
      genero: '',
      notas: '',
    },
    validate: {
      cedula: (value) => value ? null : 'La cédula es requerida',
      nombre: (value) => value ? null : 'El nombre es requerido',
      apellido: (value) => value ? null : 'El apellido es requerido',
      telefono: (value) => (/^\d{4}\d{7}$/.test(value) ? null : 'Formato inválido (ej. 0412-1234567)'),
      email: (value) => (/^\S+@\S+\.\S+$/.test(value) ? null : 'Email inválido'),
      fechaContratacion: (value) => value ? null : 'Fecha de contratación requerida',
      sueldo: (value) => value > 0 ? null : 'Sueldo debe ser mayor a 0',
      estado: (value) => value ? null : 'Estado requerido',
      fechaRetorno: (value, values) =>
        values.estado !== 'Activo' ? (value ? null : 'Fecha de retorno requerida si el empleado no está activo') : null,
      genero: (value) => (value === 'Masculino' || value === 'Femenino' ? null : 'Selecciona el género'),
    },
  });

  useEffect(() => {
    if (initialData) {
      form.setValues({
        ...initialData,
        fechaContratacion: initialData.fechaContratacion ? new Date(initialData.fechaContratacion) : null,
        fechaNacimiento: initialData.fechaNacimiento ? new Date(initialData.fechaNacimiento) : null,
        fechaRetorno: initialData.fechaRetorno ? new Date(initialData.fechaRetorno) : null,
      });
    }
  }, [initialData]);

  useEffect(() => {
    (async() => {
      try {
        const puestos = await fetch('/api/rrhh/puestos/');
        const res = await puestos.json();
        setPuestos(res.map(puesto => puesto.nombre))
      } catch (error) {
        notifications.show({title: `no se pudo obtener los puestos: ${error.message}`})
      }
    })();
  }, [])
  const handleSubmit = async (values) => {
    const payload = {
      ...values,
      fechaContratacion: values.fechaContratacion?.toISOString().split('T')[0] ?? null,
      fechaNacimiento: values.fechaNacimiento?.toISOString().split('T')[0] ?? null,
      fechaRetorno: values.fechaRetorno?.toISOString().split('T')[0] ?? null,
    };

    const isEditing = Boolean(initialData);
    const url = isEditing
      ? `/api/rrhh/empleados/${initialData.id}`
      : '/api/rrhh/empleados';

    try {
      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error((await response.json()).message || response.statusText);

      notifications.show({
        title: 'Éxito',
        message: isEditing ? 'Empleado actualizado exitosamente' : 'Empleado registrado exitosamente',
        color: 'green',
      });

      router.push('/superuser/rrhh/empleados');
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: `Error al procesar: ${error.message}`,
        color: 'red',
      });
    }
  };

  return (
    <Box maw={800} mx="auto">
      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <Title order={2} ta="center" mb="lg">
          {initialData ? 'Editar Empleado' : 'Registrar Nuevo Empleado'}
        </Title>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Grid gutter="md">
            <Grid.Col span={6}>
              <TextInput label="Cédula" placeholder="12345678" {...form.getInputProps('cedula')} />
            </Grid.Col>
            <Grid.Col span={6}>
              <TextInput label="Nombre" placeholder="Juan" {...form.getInputProps('nombre')} />
            </Grid.Col>
            <Grid.Col span={6}>
              <TextInput label="Apellido" placeholder="Pérez" {...form.getInputProps('apellido')} />
            </Grid.Col>
            <Grid.Col span={6}>
              <TextInput label="Teléfono" placeholder="04121234567" {...form.getInputProps('telefono')} />
            </Grid.Col>
            <Grid.Col span={12}>
              <TextInput label="Email" placeholder="juan@example.com" {...form.getInputProps('email')} />
            </Grid.Col>
            <Grid.Col span={12}>
              <Select 
              label="Puesto"  
              data={puestos}
              {...form.getInputProps('puesto')} 
              />
            </Grid.Col>
            <Grid.Col span={12}>
              <NumberInput label="Sueldo" min={0} step={1} {...form.getInputProps('sueldo')} />
            </Grid.Col>
            <Grid.Col span={12}>
              <TextInput label="Dirección" placeholder="Calle, ciudad, país" {...form.getInputProps('direccion')} />
            </Grid.Col>
            <Grid.Col span={6}>
              <DateInput label="Fecha de Contratación" valueFormat="DD/MM/YYYY" {...form.getInputProps('fechaContratacion')} />
            </Grid.Col>
            <Grid.Col span={6}>
              <DateInput label="Fecha de Nacimiento" valueFormat="DD/MM/YYYY" {...form.getInputProps('fechaNacimiento')} />
            </Grid.Col>
            <Grid.Col span={6}>
              <Select
                label="Estado"
                placeholder="Selecciona estado"
                data={['Activo', 'Inactivo', 'Suspendido', 'Vacaciones']}
                {...form.getInputProps('estado')}
              />
            </Grid.Col>
            {form.values.estado !== 'Activo' && (
              <Grid.Col span={6}>
                <DateInput
                  label="Fecha de Retorno"
                  valueFormat="DD/MM/YYYY"
                  {...form.getInputProps('fechaRetorno')}
                />
              </Grid.Col>
            )}
            <Grid.Col span={6}>
              <Select
                label="Género"
                placeholder="Selecciona género"
                data={['Masculino', 'Femenino']}
                {...form.getInputProps('genero')}
              />
            </Grid.Col>
            <Grid.Col span={12}>
              <Textarea
                label="Notas"
                placeholder="Observaciones sobre el empleado"
                autosize
                minRows={3}
                {...form.getInputProps('notas')}
              />
            </Grid.Col>
          </Grid>

          <Group justify="flex-end" mt="xl">
            <Button variant="default" onClick={() => router.back()}>
              Cancelar
            </Button>
            <Button type="submit">
              {initialData ? 'Actualizar Empleado' : 'Registrar Empleado'}
            </Button>
          </Group>
        </form>
      </Paper>
    </Box>
  );
}