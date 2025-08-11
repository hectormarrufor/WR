'use client';

import { useState, useEffect } from 'react';
import {
  TextInput, Select, Button, Group, Box, Text, TagsInput, NumberInput, Textarea,
  Stack, Modal, MultiSelect, Grid, ActionIcon, Title
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconPlus } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { toCamelCase } from '../../flota/components/AtributoConstructor';

export default function ConsumibleForm({ initialData, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const form = useForm({
    initialValues: {
      nombre: initialData?.nombre || '',
      marca: initialData?.marca || '',
      codigoParte: initialData?.codigoParte || '',
      tipo: initialData?.tipo || '',
      stock: initialData?.stock || 0,
      proveedores: initialData?.proveedores || [],
      especificaciones: initialData?.especificaciones || {}
    },
    validate: {
      nombre: (value) => (value ? null : 'El nombre es obligatorio'),
      tipo: (value) => (value ? null : 'El tipo es obligatorio'),
    },
  });

  // Observamos el valor del campo 'tipo' para el renderizado condicional
  const tipoConsumible = form.values.tipo;
  const isEditing = initialData?.id ? true : false;

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const endpoint = isEditing 
        ? `/api/inventario/consumibles/${initialData.id}` 
        : '/api/inventario/consumibles';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al guardar el consumible.');
      }

      notifications.show({
        title: 'Éxito',
        message: data.message,
        color: 'green',
      });
      if (onSuccess) {
        onSuccess(data.consumible);
      }
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error.message,
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box maw={900} mx="auto">
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Title order={3} mb="lg">{isEditing ? `Editar ${initialData.nombre}` : 'Crear Nuevo Consumible'}</Title>
        <Grid>
          <Grid.Col span={6}>
            <TextInput
              label="Nombre"
              placeholder="Ej: Aceite de Motor 15W40"
              required
              {...form.getInputProps('nombre')}
            />
          </Grid.Col>
          <Grid.Col span={6}>
            <Select
              label="Tipo de Consumible"
              placeholder="Selecciona el tipo"
              required
              data={['Aceite', 'Neumatico', 'Bujia', 'Sensor', 'Manguera', 'Bateria', 'Correa', 'Filtro', 'Otro']}
              {...form.getInputProps('tipo')}
            />
          </Grid.Col>
          <Grid.Col span={6}>
            <TextInput
              label="Marca"
              placeholder="Ej: Chevron"
              {...form.getInputProps('marca')}
            />
          </Grid.Col>
          <Grid.Col span={6}>
            <TextInput
              label="Código de Parte"
              placeholder="Ej: 6PK1035"
              {...form.getInputProps('codigoParte')}
            />
          </Grid.Col>
          <Grid.Col span={6}>
            <NumberInput
              label="Stock Inicial"
              min={0}
              required
              {...form.getInputProps('stock')}
            />
          </Grid.Col>
          <Grid.Col span={6}>
            <TagsInput
              label="Proveedores"
              placeholder="Añade proveedores y presiona Enter"
              {...form.getInputProps('proveedores')}
            />
          </Grid.Col>
        </Grid>

        {/* --- Renderizado Condicional por Tipo de Consumible --- */}
        <Stack mt="xl" spacing="lg">

          {/* Caso: Aceite */}
          {tipoConsumible === 'Aceite' && (
            <Grid>
              <Grid.Col span={6}>
                <Select
                  label="Tipo de Aceite"
                  data={['Mineral', 'Semi-sintético', 'Sintético']}
                  placeholder="Selecciona el tipo de aceite"
                  {...form.getInputProps('especificaciones.tipoAceite')}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <TextInput
                  label="Viscosidad"
                  placeholder="Ej: 15W40"
                  {...form.getInputProps('especificaciones.viscosidad')}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <NumberInput
                  label="Cantidad por Envase (Litros)"
                  placeholder="Ej: 1"
                  precision={2}
                  min={0}
                  {...form.getInputProps('especificaciones.cantidadLitros')}
                />
              </Grid.Col>
            </Grid>
          )}

          {/* Caso: Neumático */}
          {tipoConsumible === 'Neumatico' && (
            <Grid>
              <Grid.Col span={6}>
                <TextInput
                  label="Medida del Neumático"
                  placeholder="Ej: 295/80R22.5"
                  {...form.getInputProps('especificaciones.medida')}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <TextInput
                  label="Tipo de uso"
                  placeholder="Ej: Carga, Todo Terreno"
                  {...form.getInputProps('especificaciones.uso')}
                />
              </Grid.Col>
            </Grid>
          )}

          {/* Caso: Batería */}
          {tipoConsumible === 'Bateria' && (
            <Grid>
              <Grid.Col span={6}>
                <TextInput
                  label="Nomenclatura"
                  placeholder="Ej: 75D23L"
                  {...form.getInputProps('especificaciones.nomenclatura')}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <NumberInput
                  label="Amperaje (A)"
                  placeholder="Ej: 750"
                  min={0}
                  {...form.getInputProps('especificaciones.amperaje')}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <TextInput
                  label="Tipo de bornes"
                  placeholder="Ej: Normales, Invertidos"
                  {...form.getInputProps('especificaciones.bornes')}
                />
              </Grid.Col>
            </Grid>
          )}

          {/* Casos: Filtro, Bujía, Sensor, Correa, Otro */}
          {['Filtro', 'Bujia', 'Sensor', 'Correa', 'Otro'].includes(tipoConsumible) && (
            <Textarea
              label="Notas de especificaciones"
              placeholder="Añade cualquier especificación adicional relevante."
              {...form.getInputProps('especificaciones.notas')}
            />
          )}

        </Stack>

        <Group justify="flex-end" mt="lg">
          <Button type="submit" loading={loading}>
            {isEditing ? 'Guardar Cambios' : 'Crear Consumible'}
          </Button>
        </Group>
      </form>
    </Box>
  );
}