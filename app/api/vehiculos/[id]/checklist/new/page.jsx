'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Paper,
  Title,
  Group,
  Button,
  NumberInput,
  Checkbox,
  Stack,
} from '@mantine/core';
import { DatePicker } from '@mantine/dates';
import { useForm } from '@mantine/form';

export default function NuevoChecklistPage() {
  const router = useRouter();
  const { id } = useParams();          // es el id del vehículo
  const [vehiculo, setVehiculo] = useState(null);

  const form = useForm({
    initialValues: {
      fecha: new Date(),
      kilometraje: 0,
      horometro: 0,
      bombilloDelBaja: true,
      bombilloDelAlta: true,
      intermitenteDelFrizq: true,
      intermitenteDelFder: true,
      intermitenteLateral: true,
      bombilloTrasero: true,
      filtroAireOk: true,
      correaOk: true,
      nivelCombustible: 0,
      inyectoresOk: true,
      filtroCombustibleOk: true,
    },
    validate: {
      kilometraje: (v) => (v < 0 ? 'No puede ser negativo' : null),
      horometro:   (v) => (v < 0 ? 'No puede ser negativo' : null),
    },
  });

  useEffect(() => {
    fetch(`/api/vehiculos/${id}`)
      .then((r) => r.json())
      .then(setVehiculo);
  }, [id]);

  if (!vehiculo) return 'Cargando vehículo…';

  const handleSubmit = async (vals) => {
    await fetch('/api/checklists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vehiculoId: id, ...vals }),
    });
    router.push(`/superuser/flota/${id}`); // regresa a la ficha
  };

  return (
    <Paper p="md" radius="md" withBorder>
      <Title order={2} mb="md">
        Nuevo checklist – {vehiculo.marca} {vehiculo.modelo}
      </Title>

      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Group grow mb="md">
          <DatePicker
            label="Fecha"
            {...form.getInputProps('fecha')}
          />
          <NumberInput
            label="Kilometraje"
            {...form.getInputProps('kilometraje')}
          />
          <NumberInput
            label="Horómetro"
            {...form.getInputProps('horometro')}
          />
        </Group>

        <Title order={4} mt="md">Luces / Bombillos</Title>
        <Stack spacing="xs" mb="md">
          <Checkbox
            label="Luz baja"
            {...form.getInputProps('bombilloDelBaja', { type: 'checkbox' })}
          />
          <Checkbox
            label="Luz alta"
            {...form.getInputProps('bombilloDelAlta', { type: 'checkbox' })}
          />
          <Checkbox
            label="Intermitente delantera izq."
            {...form.getInputProps('intermitenteDelFrizq', {
              type: 'checkbox',
            })}
          />
          <Checkbox
            label="Intermitente delantera der."
            {...form.getInputProps('intermitenteDelFder', {
              type: 'checkbox',
            })}
          />
          <Checkbox
            label="Intermitente lateral"
            {...form.getInputProps('intermitenteLateral', {
              type: 'checkbox',
            })}
          />
          <Checkbox
            label="Luz trasera"
            {...form.getInputProps('bombilloTrasero', {
              type: 'checkbox',
            })}
          />
        </Stack>

        <Group mb="md" spacing="xl">
          <Checkbox
            label="Filtro de aire OK"
            {...form.getInputProps('filtroAireOk', {
              type: 'checkbox',
            })}
          />
          <Checkbox
            label="Correa OK"
            {...form.getInputProps('correaOk', { type: 'checkbox' })}
          />
        </Group>

        <Group grow mb="md">
          <NumberInput
            label="Nivel de combustible (L)"
            step={0.1}
            precision={1}
            {...form.getInputProps('nivelCombustible')}
          />
        </Group>

        <Group mb="md" spacing="xl">
          <Checkbox
            label="Inyectores OK"
            {...form.getInputProps('inyectoresOk', { type: 'checkbox' })}
          />
          <Checkbox
            label="Filtro combustible OK"
            {...form.getInputProps('filtroCombustibleOk', {
              type: 'checkbox',
            })}
          />
        </Group>

        <Button type="submit" fullWidth>
          Guardar checklist
        </Button>
      </form>
    </Paper>
  );
}