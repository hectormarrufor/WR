// app/superuser/flota/[id]/mantenimiento/[mantenimientoId]/page.jsx
'use client';

import { Container, Title, Text, Paper, Group, Button, Box, Divider, Badge, SimpleGrid, Card, Select, Textarea, Checkbox, Space, Center, Loader, NumberInput } from '@mantine/core';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { notifications } from '@mantine/notifications';
import { httpGet, httpPut } from '../../../../../../app/ApiFunctions/httpServices'; // Asegúrate de la ruta correcta a httpServices
import BackButton from '../../../../../../app/components/BackButton';
import { IconChecks, IconTools, IconStatusChange, IconCalendar, IconGauge, IconClockHour4, IconFileDescription, IconCurrencyDollar, IconListCheck } from '@tabler/icons-react';
import { DatePickerInput } from '@mantine/dates';
import { useForm } from '@mantine/form';

export default function DetalleMantenimientoPage() {
  const router = useRouter();
  const { id: vehiculoId, mantenimientoId } = useParams(); // vehiculoId y mantenimientoId

  const [mantenimiento, setMantenimiento] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const form = useForm({
    initialValues: {
      estado: '', // Estado general del mantenimiento
      fechaCompletado: null,
      kilometrajeMantenimiento: 0,
      horometroMantenimiento: 0,
      // Las tareas se gestionarán como un array en el formulario
      tareas: [],
    },
    validate: {
      estado: (value) => (value ? null : 'El estado del mantenimiento es requerido'),
      kilometrajeMantenimiento: (value, values) => (values.estado === 'Completado' && value <= 0 ? 'El kilometraje es requerido al completar' : null),
    },
  });

  const fetchMantenimientoData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await httpGet(`/api/vehiculos/mantenimientos/${mantenimientoId}`); // Endpoint para un mantenimiento específico
      if (!data) {
        throw new Error('Orden de mantenimiento no encontrada.');
      }
      setMantenimiento(data);
      form.setValues({
        estado: data.estado,
        fechaCompletado: data.fechaCompletado ? new Date(data.fechaCompletado) : null,
        kilometrajeMantenimiento: data.kilometrajeMantenimiento || 0,
        horometroMantenimiento: data.horometroMantenimiento || 0,
        tareas: data.tareas.map(tarea => ({ // Mapear las tareas existentes
          ...tarea,
          fechaInicio: tarea.fechaInicio ? new Date(tarea.fechaInicio) : null,
          fechaFin: tarea.fechaFin ? new Date(tarea.fechaFin) : null,
          // ConsumiblesUsados si decides gestionarlos aquí
          // consumiblesUsados: tarea.consumiblesUsados || []
        })),
      });
    } catch (err) {
      console.error('Error al cargar datos del mantenimiento:', err);
      setError(err.message);
      notifications.show({
        title: 'Error',
        message: `No se pudieron cargar los datos del mantenimiento: ${err.message}`,
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  }, [mantenimientoId]); // eslint-disable-line react-hooks/exhaustive-deps


  useEffect(() => {
    if (mantenimientoId) {
      fetchMantenimientoData();
    }
  }, [mantenimientoId, fetchMantenimientoData]);

  // Manejar la actualización del mantenimiento (estado general o tareas)
  const handleUpdateMantenimiento = async (values) => {
    setIsUpdating(true);
    try {
      const payload = {
        estado: values.estado,
        fechaCompletado: values.fechaCompletado?.toISOString() || null,
        kilometrajeMantenimiento: values.kilometrajeMantenimiento,
        horometroMantenimiento: values.horometroMantenimiento,
        // Incluye las tareas actualizadas en el payload para que el backend las procese
        tareas: values.tareas.map(tarea => ({
            ...tarea,
            fechaInicio: tarea.fechaInicio?.toISOString() || null,
            fechaFin: tarea.fechaFin?.toISOString() || null,
        })),
      };

      const response = await httpPut(`/api/vehiculos/mantenimientos/${mantenimientoId}`, payload);

      if (response.error) {
        throw new Error(response.error);
      }

      notifications.show({
        title: 'Éxito',
        message: 'Mantenimiento actualizado exitosamente.',
        color: 'green',
      });
      // Vuelve a cargar los datos para reflejar los cambios (ej. estado del vehículo)
      fetchMantenimientoData();
    } catch (error) {
      console.error('Error al actualizar mantenimiento:', error);
      notifications.show({
        title: 'Error',
        message: `Error al actualizar mantenimiento: ${error.message}`,
        color: 'red',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Center style={{ height: '300px' }}>
          <Loader size="lg" />
          <Text ml="md">Cargando detalles de la orden de mantenimiento...</Text>
        </Center>
      </Container>
    );
  }

  if (error || !mantenimiento) {
    return (
      <Container size="xl" py="xl">
        <Center style={{ height: '300px' }}>
          <Text color="red">Error: {error || 'Orden de mantenimiento no encontrada.'}</Text>
        </Center>
      </Container>
    );
  }

  const { vehiculo } = mantenimiento; // Acceder al vehículo asociado

  return (
    <Paper size="xl" p="xl" mt={70} mx={50}>
      <Group justify="space-between" mb="lg">
        <BackButton onClick={() => router.push(`/superuser/flota/${vehiculoId}`)} />
        <Title order={2} ta="center">
          Orden de Mantenimiento # {mantenimiento.id}
        </Title>
        <Space /> {/* Espaciador para centrar el título */}
      </Group>

      <Paper withBorder shadow="md" p="md" mb="lg">
        <Title order={4} mb="sm" c="blue.7">Información General de la Orden</Title>
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
          <Text><strong>Vehículo:</strong> {vehiculo?.marca} {vehiculo?.modelo} ({vehiculo?.placa})</Text>
          <Text><strong>Tipo:</strong> <Badge color={mantenimiento.tareas.find(tarea => tarea.tipo === "Correctivo")? 'red' : 'blue'}>{mantenimiento.tareas.find(tarea => tarea.tipo === "Correctivo")?"Correctivo" : "Preventivo"}</Badge></Text>
          <Text><strong>Estado:</strong> <Badge color={
            mantenimiento.estado === 'Completado' ? 'green' :
            mantenimiento.estado === 'Pendiente' ? 'orange' :
            mantenimiento.estado === 'En Progreso' ? 'yellow' :
            'gray'
          }>{mantenimiento.estado}</Badge></Text>
          <Text><strong>Fecha de Creación:</strong> {new Date(mantenimiento.createdAt).toLocaleDateString('es-VE')}</Text>
          {mantenimiento.fechaInicio && <Text><strong>Fecha de Inicio:</strong> {new Date(mantenimiento.fechaInicio).toLocaleDateString('es-VE')}</Text>}
          {mantenimiento.fechaCompletado && <Text><strong>Fecha de Completado:</strong> {new Date(mantenimiento.fechaCompletado).toLocaleDateString('es-VE')}</Text>}
          <Text><strong>Kilometraje Mantenimiento:</strong> {mantenimiento.kilometrajeMantenimiento} km</Text>
          <Text><strong>Horómetro Mantenimiento:</strong> {mantenimiento.horometroMantenimiento} horas</Text>
          <Textarea label="Descripción General" value={mantenimiento.descripcionGeneral} readOnly autosize minRows={2} />
        </SimpleGrid>
      </Paper>

      {/* Formulario para actualizar el estado del mantenimiento y sus tareas */}
      <Paper withBorder shadow="md" p="md" mb="lg">
        <Title order={4} mb="sm" c="teal.7"><IconStatusChange size={20} style={{ verticalAlign: 'middle', marginRight: '5px' }} /> Actualizar Estado y Tareas</Title>
        <form onSubmit={form.onSubmit(handleUpdateMantenimiento)}>
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md" mb="md">
            <Select
              label="Estado General de la Orden"
              placeholder="Selecciona estado"
              data={['Pendiente', 'En Progreso', 'Completado', 'Cancelada']}
              {...form.getInputProps('estado')}
            />
            {form.values.estado === 'Completado' && (
              <>
                <DatePickerInput
                  label="Fecha de Completado"
                  placeholder="Selecciona fecha"
                  valueFormat="DD/MM/YYYY"
                  {...form.getInputProps('fechaCompletado')}
                />
                <NumberInput
                  label="Kilometraje al Completar"
                  placeholder="Kilometraje"
                  min={mantenimiento.kilometrajeMantenimiento || vehiculo?.kilometrajes?.[0]?.kilometrajeActual || 0} // Min no menor al de creación o actual del vehículo
                  {...form.getInputProps('kilometrajeMantenimiento')}
                />
                <NumberInput
                  label="Horómetro al Completar (si aplica)"
                  placeholder="Horómetro"
                  min={mantenimiento.horometroMantenimiento || vehiculo?.horometros?.[0]?.horas || 0} // Min no menor al de creación o actual del vehículo
                  {...form.getInputProps('horometroMantenimiento')}
                />
              </>
            )}
          </SimpleGrid>

          <Divider my="lg" label={<IconListCheck size={20} />} labelPosition="center" />
          <Title order={5} mb="md">Tareas Individuales:</Title>
          {form.values.tareas.map((tarea, index) => (
            <Card key={tarea.id || index} withBorder shadow="sm" p="md" mb="sm">
              <Group justify="space-between" align="center">
                <Box style={{ flexGrow: 1 }}>
                  <Text fw={700}>Tarea {index + 1}: {tarea.descripcion}</Text>
                  {tarea.hallazgoInspeccionId && (
                    <Text size="sm" c="dimmed">Origen: Hallazgo ID {tarea.hallazgoInspeccionId}</Text>
                  )}
                  {tarea.estado === 'Completada' && tarea.fechaFin && (
                    <Text size="sm" c="dimmed">Completada el: {new Date(tarea.fechaFin).toLocaleDateString('es-VE')}</Text>
                  )}
                </Box>
                <Checkbox
                  label="Completada"
                  checked={tarea.estado === 'Completada'}
                  onChange={(event) => {
                    form.setFieldValue(`tareas.${index}.estado`, event.currentTarget.checked ? 'Completada' : 'Pendiente');
                    form.setFieldValue(`tareas.${index}.fechaFin`, event.currentTarget.checked ? new Date() : null);
                  }}
                  size="md"
                />
              </Group>
              {/* Aquí podrías añadir campos para consumibles o costos por tarea si lo deseas */}
              {/* Ejemplo de campo para notas de tarea */}
              <Textarea
                label="Notas de la Tarea"
                placeholder="Observaciones sobre la tarea realizada"
                autosize
                minRows={1}
                {...form.getInputProps(`tareas.${index}.notas`)} // Asegúrate que tu modelo TareaMantenimiento tiene un campo 'notas'
                mt="sm"
              />
            </Card>
          ))}

          <Group justify="flex-end" mt="xl">
            <Button variant="default" onClick={() => router.push(`/superuser/flota/${vehiculoId}`)}>
              Cancelar
            </Button>
            <Button type="submit" loading={isUpdating} disabled={isUpdating}>
              Guardar Cambios del Mantenimiento
            </Button>
          </Group>
        </form>
      </Paper>

      {/* Otras secciones como historial de consumibles usados en esta orden, etc. */}
    </Paper>
  );
}