'use client';

import React, { useEffect, useState, useCallback, use } from 'react';
import { useForm } from '@mantine/form';
import {
  TextInput, Button, Group, Box, Paper, Title, Grid, NumberInput,
  Container, Loader, Center, Text, LoadingOverlay,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';
import { DynamicJsonForm } from '../../components/DynamicJsonForm';

export default function CrearEquipoEspecialPage({ params }) {
  const router = useRouter();
  const { tipoEquipo } = use(params);
  const [loadingTemplate, setLoadingTemplate] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    initialValues: {
      tipoEquipo: tipoEquipo,
      tipoEquipoEspecialId: '',
      placa: '',
      kilometraje: 0,
      horometro: 0,
      marca: '',
      modelo: '',
      identificativo: '',
      especificaciones: {}, // Aquí irá el JSONB
    },
    validate: {
      marca: (value) => (value ? null : 'La marca es requerida'),
      modelo: (value) => (value ? null : 'El modelo es requerido'),
      identificativo: (value) => (value ? null : 'El número identificativo es requerido'),
      horometro: (value) => (value >= 0 ? null : 'El horómetro debe ser un número positivo'),
      kilometraje: (value) => (value >= 0 ? null : 'El kilometraje debe ser un número positivo'),
    },
  });

  const fetchTemplate = useCallback(async () => {
    setLoadingTemplate(true);
    try {
      const response = await fetch(`/api/equiposEspeciales/template/${tipoEquipo}`);
      if (!response.ok) {
        throw new Error('No se pudo cargar la plantilla de especificaciones.');
      }
      const templateData = await response.json();
      form.setFieldValue('especificaciones', templateData);

    } catch (error) {
      console.error(error);
      notifications.show({
        title: 'Advertencia',
        message: `No se encontró plantilla para "${tipoEquipo}". Se iniciará un formulario vacío.`,
        color: 'yellow',
      });
      form.setFieldValue('especificaciones', {});
    } finally {
      setLoadingTemplate(false);
    }
    try {
        const resp = await fetch(`/api/tiposEquiposEspeciales/${tipoEquipo}`);
        if (!resp.ok) {
          throw new Error('No se pudo cargar el id del tipo de equipo especial')
        }
        const res = await resp.json();
        form.setFieldValue('tipoEquipoEspecialId', res.id)
      }
      catch (error) {
        console.error('nose pudo obtener el id del tipo del equipo', error.message)
      }

  }, [tipoEquipo]);

  useEffect(() => {
    fetchTemplate();
  }, [fetchTemplate]);

  const handleSubmit = async (values) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/equiposEspeciales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al crear el equipo.');
      }

      notifications.show({
        title: 'Éxito',
        message: `Equipo especial "${values.identificativo}" creado exitosamente.`,
        color: 'green',
      });
      router.push('/superuser/flota/especial');
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error.message,
        color: 'red',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container size="md" py="xl">
      <Paper withBorder shadow="md" p={30} mt={30} radius="md" pos="relative">
        <LoadingOverlay visible={loadingTemplate} overlayProps={{ radius: 'sm', blur: 2 }} />
        <Title order={2} ta="center" mb="lg">
          Registrar Nuevo Equipo Especial: <Text span tt="capitalize">{tipoEquipo}</Text>
        </Title>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Grid>
            {/* Campos Estáticos */}
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <TextInput label="Marca" required {...form.getInputProps('marca')} />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <TextInput label="Modelo" required {...form.getInputProps('modelo')} />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <TextInput label="Número Identificativo" placeholder="Ej: PDV-160" required {...form.getInputProps('identificativo')} />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <TextInput label="Placa (Opcional)" {...form.getInputProps('placa')} />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <NumberInput label="Kilometraje de registro" required min={0} {...form.getInputProps('kilometraje')} />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <NumberInput label="Horómetro de registro" required min={0} {...form.getInputProps('horometro')} />
            </Grid.Col>
          </Grid>

          {/* Formulario Dinámico */}
          <Box mt="xl">
            {!loadingTemplate && (
              <DynamicJsonForm
                value={form.values.especificaciones}
                onChange={(newSpecs) => form.setFieldValue('especificaciones', newSpecs)}
              />
            )}
          </Box>

          <Group justify="flex-end" mt="xl">
            <Button variant="default" onClick={() => router.back()}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Guardar Equipo
            </Button>
          </Group>
        </form>
      </Paper>
    </Container>
  );
}