// app/superuser/flota/[id]/mantenimiento/nueva/page.jsx
'use client';

import { Container, Title, Text, Center, Loader, Paper, Select, Button, Group, Divider, Textarea, NumberInput, TextInput, Box } from '@mantine/core';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { notifications } from '@mantine/notifications';
import { useForm } from '@mantine/form';
import { DatePickerInput } from '@mantine/dates';
import { httpGet, httpPost } from '../../../../../ApiFunctions/httpServices';

export default function NuevoMantenimientoPage() {
  const { id: vehiculoId } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const hallazgoIdsParam = searchParams.get('hallazgoIds');
  const hallazgoIds = hallazgoIdsParam ? hallazgoIdsParam.split(',').map(Number) : [];

  const [vehiculo, setVehiculo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    initialValues: {
      vehiculoId: parseInt(vehiculoId),
      // El tipo del mantenimiento general será determinado por el backend basado en las tareas
      estado: 'Pendiente',
      fechaInicio: new Date(),
      descripcionGeneral: '',
      responsableId: null,
      kilometrajeMantenimiento: 0,
      horometroMantenimiento: 0,
      tareas: [],
    },
    validate: {
      descripcionGeneral: (value) => (value ? null : 'La descripción general es requerida'),
      tareas: (value) => (value.length > 0 ? null : 'Debe haber al menos una tarea de mantenimiento'),
      'tareas.0.descripcion': (value, values) => (values.tareas.length > 0 && !value ? 'La descripción de la tarea es requerida' : null),
      // Añadir validación para el tipo de tarea
      'tareas.0.tipo': (value, values) => (values.tareas.length > 0 && !value ? 'El tipo de la tarea es requerido' : null),
      kilometrajeMantenimiento: (value) => (value > 0 ? null : 'El kilometraje debe ser positivo'),
    },
  });

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const vehiculoData = await httpGet(`/api/vehiculos/${vehiculoId}`);
        if (!vehiculoData) {
          throw new Error('Vehículo no encontrado.');
        }
        setVehiculo(vehiculoData);

        form.setValues({
            kilometrajeMantenimiento: vehiculoData.kilometrajes?.[0]?.kilometrajeActual || 0,
            horometroMantenimiento: vehiculoData.horometros?.[0]?.horas || 0,
        });

        if (hallazgoIds.length > 0) {
          const fetchedHallazgos = await Promise.all(
            hallazgoIds.map(id => httpGet(`/api/vehiculos/hallazgoInspeccion/${id}`))
          );
          const validHallazgos = fetchedHallazgos.filter(h => h && h.id);

          const generatedTareas = validHallazgos.map(hallazgo => ({
            descripcion: `${hallazgo.nombreSistema}: ${hallazgo.descripcion}`,
            estado: 'Pendiente',
            hallazgoInspeccionId: hallazgo.id,
            tipo: 'Correctivo', // <-- Se asigna Correctivo si viene de un hallazgo
          }));

          const generatedDescripcionGeneral = validHallazgos.length > 1
            ? `Mantenimiento para ${validHallazgos.length} hallazgos pendientes`
            : `Mantenimiento de ${validHallazgos[0].nombreSistema}: ${validHallazgos[0].descripcion}`;

          form.setValues({
            descripcionGeneral: generatedDescripcionGeneral,
            tareas: generatedTareas,
            // Aquí ya no asignamos el tipo de mantenimiento general, lo hará el backend
          });
        } else {
          // Si no hay hallazgos, inicializar con una tarea vacía y tipo Preventivo por defecto
          form.setValues({
            tareas: [{ descripcion: '', estado: 'Pendiente', hallazgoInspeccionId: null, tipo: 'Preventivo' }], // <-- Tipo por defecto para tareas manuales
          });
        }

      } catch (err) {
        console.error('Error al cargar datos del vehículo o hallazgos:', err);
        setError(err.message);
        notifications.show({
          title: 'Error',
          message: `No se pudieron cargar los datos para la orden de mantenimiento: ${err.message}`,
          color: 'red',
        });
      } finally {
        setLoading(false);
      }
    }

    if (vehiculoId) {
      fetchData();
    }
  }, [vehiculoId, hallazgoIdsParam]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (values) => {
    setIsSubmitting(true);
    try {
      const payload = {
        vehiculoId: values.vehiculoId,
        // Eliminamos 'tipo' de aquí, el backend lo determinará
        estado: values.estado,
        fechaInicio: values.fechaInicio.toISOString(),
        descripcionGeneral: values.descripcionGeneral,
        responsableId: values.responsableId,
        kilometrajeMantenimiento: values.kilometrajeMantenimiento,
        horometroMantenimiento: values.horometroMantenimiento,
        tareas: values.tareas,
      };

      const response = await httpPost(`/api/vehiculos/mantenimientos`, payload);
      
      if (response.error) {
        throw new Error(response.error);
      }

      notifications.show({
        title: 'Éxito',
        message: 'Orden de mantenimiento creada exitosamente.',
        color: 'green',
      });
      router.push(`/superuser/flota/${vehiculoId}/mantenimiento`); // Redirigir a la lista de mantenimientos del vehículo
    } catch (error) {
      console.error('Error al crear orden de mantenimiento:', error);
      notifications.show({
        title: 'Error',
        message: `Error al crear orden de mantenimiento: ${error.message}`,
        color: 'red',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Center style={{ height: '300px' }}>
          <Loader size="lg" />
          <Text ml="md">Cargando datos para la orden de mantenimiento...</Text>
        </Center>
      </Container>
    );
  }

  if (error || !vehiculo) {
    return (
      <Container size="xl" py="xl">
        <Center style={{ height: '300px' }}>
          <Text color="red">Error: {error || 'Vehículo no encontrado o hallazgos no cargados para registrar mantenimiento.'}</Text>
        </Center>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Title order={2} ta="center" mb="lg">
        Nueva Orden de Mantenimiento para: {vehiculo.marca} {vehiculo.modelo} ({vehiculo.placa})
      </Title>
      <Paper withBorder shadow="md" p="md" mb="lg">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <TextInput
            label="Descripción General del Mantenimiento"
            placeholder="Ej. Mantenimiento general, cambio de aceite y frenos"
            {...form.getInputProps('descripcionGeneral')}
            mb="md"
          />
          {/* Ya no se selecciona el tipo de mantenimiento general aquí */}
          <DatePickerInput
            label="Fecha de Inicio"
            placeholder="Selecciona la fecha"
            valueFormat="DD/MM/YYYY"
            {...form.getInputProps('fechaInicio')}
            mb="md"
          />
          <NumberInput
            label="Kilometraje al momento del mantenimiento"
            placeholder="Kilometraje"
            {...form.getInputProps('kilometrajeMantenimiento')}
            min={0}
            mb="md"
          />
          <NumberInput
            label="Horómetro al momento del mantenimiento (si aplica)"
            placeholder="Horómetro"
            {...form.getInputProps('horometroMantenimiento')}
            min={0}
            mb="md"
          />

          <Divider my="lg" label="Tareas de Mantenimiento" labelPosition="center" />
          {form.values.tareas.map((tarea, index) => (
            <Box key={index} mb="md" p="sm" style={{ border: '1px solid var(--mantine-color-gray-3)', borderRadius: 'var(--mantine-radius-sm)' }}>
              <Textarea
                label={`Tarea ${index + 1}`}
                placeholder="Descripción de la tarea"
                autosize
                minRows={2}
                {...form.getInputProps(`tareas.${index}.descripcion`)}
              />
              <Select
                label="Tipo de Tarea"
                placeholder="Selecciona el tipo de tarea"
                data={['Preventivo', 'Correctivo', 'Predictivo']}
                {...form.getInputProps(`tareas.${index}.tipo`)} // <-- Campo para el tipo de tarea individual
                mt="md"
              />
              {tarea.hallazgoInspeccionId && (
                <Text size="sm" c="dimmed" mt="xs">Origen: Hallazgo ID {tarea.hallazgoInspeccionId}</Text>
              )}
              {/* Aquí podrías añadir un botón para eliminar tareas si hay varias, o añadir más tareas manualmente */}
            </Box>
          ))}
          {/* Si quieres permitir añadir tareas manuales sin hallazgo, podrías añadir un botón aquí */}
          {hallazgoIds.length === 0 && ( // Mostrar botón de añadir tarea solo si no se crearon a partir de hallazgos
            <Button
              onClick={() => form.insertListItem('tareas', { descripcion: '', estado: 'Pendiente', hallazgoInspeccionId: null, tipo: 'Preventivo' })}
              variant="outline"
              fullWidth
              mt="md"
            >
              Añadir otra tarea
            </Button>
          )}

          <Group justify="flex-end" mt="xl">
            <Button variant="default" onClick={() => router.push(`/superuser/flota/${vehiculoId}/mantenimiento`)}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting} disabled={isSubmitting}>
              Crear Orden de Mantenimiento
            </Button>
          </Group>
        </form>
      </Paper>
    </Container>
  );
}