// app/superuser/flota/especial/[id]/editar/page.jsx
'use client';

import { Container, Title, Text, Paper, Button, Group, Grid, TextInput, NumberInput, Textarea, Select, Checkbox, Box, Divider, Center, Loader } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useParams, useRouter, notFound } from 'next/navigation';
import { useEffect, useState } from 'react';
import { httpGet, httpPut } from '../../../../../ApiFunctions/httpServices';
import BackButton from '../../../../../components/BackButton';

export default function EditarEquipoEspecialFormPage() {
  const router = useRouter();
  const { id } = useParams(); // ID del equipo especial a editar

  const [loadingInitialData, setLoadingInitialData] = useState(true); // Para cargar datos del equipo existente y vehículos de remolque
  const [vehiculosRemolque, setVehiculosRemolque] = useState([]);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    initialValues: {
      nombre: '',
      descripcion: '',
      numeroSerie: '',
      fabricante: '',
      modelo: '',
      fechaAdquisicion: null,
      costoAdquisicion: 0,
      horometroActual: 0,
      tipoEquipoEspecial: '', // Se llenará con los datos existentes
      estadoOperativoGeneral: '', // Se llenará con los datos existentes
      ubicacionActual: '',
      esMovil: true,
      vehiculoRemolqueId: null,

      // Ficha Técnica de Equipo Especial
      fichaTecnica: {
        capacidadOperacional: '',
        potenciaHP: 0,
        dimensiones: { largoM: null, anchoM: null, altoM: null, pesoKg: null },
        especificacionesDetalladas: {},
        mantenimientoComponentes: {},
        certificaciones: [],
      },
    },
    validate: {
      nombre: (value) => (value ? null : 'El nombre/identificador es requerido'),
      numeroSerie: (value) => (value ? null : 'El número de serie es requerido'),
      tipoEquipoEspecial: (value) => (value ? null : 'El tipo de equipo especial es requerido'),
      horometroActual: (value) => (value >= 0 ? null : 'El horómetro debe ser un número positivo'),
      'fichaTecnica.capacidadOperacional': (value) => (value ? null : 'La capacidad operacional es requerida'),
      'fichaTecnica.potenciaHP': (value) => (value > 0 ? null : 'La potencia HP debe ser un número positivo'),
    },
  });

  useEffect(() => {
    async function fetchData() {
      setLoadingInitialData(true);
      try {
        // 1. Obtener detalles del Equipo Especial existente
        const equipoEspecialData = await httpGet(`/api/equiposEspeciales/${id}`);
        if (!equipoEspecialData) {
          notFound(); // Redirige a 404 si no existe
          return;
        }

        // 2. Obtener la lista de vehículos para el Select de remolque
        const vehiculosResponse = await httpGet('/api/vehiculos');
        const vehicles = vehiculosResponse.map(v => ({ value: v.id.toString(), label: `${v.marca} ${v.modelo} (${v.placa})` }));
        setVehiculosRemolque(vehicles);

        // 3. Pre-llenar el formulario con los datos existentes
        form.setValues({
          nombre: equipoEspecialData.nombre || '',
          descripcion: equipoEspecialData.descripcion || '',
          numeroSerie: equipoEspecialData.numeroSerie || '',
          fabricante: equipoEspecialData.fabricante || '',
          modelo: equipoEspecialData.modelo || '',
          fechaAdquisicion: equipoEspecialData.fechaAdquisicion ? new Date(equipoEspecialData.fechaAdquisicion) : null,
          costoAdquisicion: equipoEspecialData.costoAdquisicion || 0,
          horometroActual: equipoEspecialData.horometroActual || 0,
          tipoEquipoEspecial: equipoEspecialData.tipoEquipoEspecial || '',
          estadoOperativoGeneral: equipoEspecialData.estadoOperativoGeneral || 'Operativo',
          ubicacionActual: equipoEspecialData.ubicacionActual || '',
          esMovil: equipoEspecialData.esMovil,
          vehiculoRemolqueId: equipoEspecialData.vehiculoRemolqueId ? equipoEspecialData.vehiculoRemolqueId.toString() : null,
          
          fichaTecnica: {
            capacidadOperacional: equipoEspecialData.fichaTecnica?.capacidadOperacional || '',
            potenciaHP: equipoEspecialData.fichaTecnica?.potenciaHP || 0,
            dimensiones: equipoEspecialData.fichaTecnica?.dimensiones || { largoM: null, anchoM: null, altoM: null, pesoKg: null },
            // Asegurarse de que los JSONB se conviertan a objetos si vienen como strings (aunque Sequelize los devuelve como objetos)
            especificacionesDetalladas: equipoEspecialData.fichaTecnica?.especificacionesDetalladas || {},
            mantenimientoComponentes: equipoEspecialData.fichaTecnica?.mantenimientoComponentes || {},
            certificaciones: equipoEspecialData.fichaTecnica?.certificaciones || [],
          },
        });

      } catch (err) {
        console.error('Error al cargar datos del equipo especial para edición:', err);
        setError(err.message);
        notifications.show({
          title: 'Error',
          message: `No se pudieron cargar los datos del equipo especial: ${err.message}`,
          color: 'red',
        });
      } finally {
        setLoadingInitialData(false);
      }
    }

    if (id) {
      fetchData();
    }
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (values) => {
    setIsSubmitting(true);
    try {
      const payload = {
        ...values,
        horometroActual: parseInt(values.horometroActual),
        costoAdquisicion: parseFloat(values.costoAdquisicion),
        fechaAdquisicion: values.fechaAdquisicion?.toISOString() || null,
        fichaTecnica: {
          ...values.fichaTecnica,
          potenciaHP: parseInt(values.fichaTecnica.potenciaHP),
          // Convertir JSONB Textareas a objetos/arrays si el usuario los editó como strings
          especificacionesDetalladas: typeof values.fichaTecnica.especificacionesDetalladas === 'string' 
            ? JSON.parse(values.fichaTecnica.especificacionesDetalladas || '{}') 
            : values.fichaTecnica.especificacionesDetalladas,
          mantenimientoComponentes: typeof values.fichaTecnica.mantenimientoComponentes === 'string'
            ? JSON.parse(values.fichaTecnica.mantenimientoComponentes || '{}')
            : values.fichaTecnica.mantenimientoComponentes,
          certificaciones: typeof values.fichaTecnica.certificaciones === 'string'
            ? JSON.parse(values.fichaTecnica.certificaciones || '[]')
            : values.fichaTecnica.certificaciones,
        },
        vehiculoRemolqueId: values.vehiculoRemolqueId ? parseInt(values.vehiculoRemolqueId) : null,
      };

      // Llamar a la API PUT para actualizar el equipo especial
      const response = await httpPut(`/api/equiposEspeciales/${id}`, payload); ///route.js]
      
      if (response.error) {
        throw new Error(response.error);
      }

      notifications.show({
        title: 'Éxito',
        message: `Equipo especial "${payload.nombre}" actualizado exitosamente.`,
        color: 'green',
      });
      router.push(`/superuser/flota/especial/${id}`); // Redirigir a la vista de detalle
    } catch (error) {
      console.error('Error al actualizar equipo especial:', error);
      notifications.show({
        title: 'Error',
        message: `Error al actualizar equipo especial: ${error.message || error}`,
        color: 'red',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingInitialData) {
    return (
      <Container size="xl" py="xl">
        <Center style={{ height: '300px' }}>
          <Loader size="lg" />
          <Text ml="md">Cargando datos del equipo especial...</Text>
        </Center>
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="xl" py="xl">
        <Center style={{ height: '300px' }}>
          <Text color="red">Error: {error}</Text>
        </Center>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Group justify="space-between" mb="lg">
        <BackButton onClick={() => router.push(`/superuser/flota/especial/${id}`)} />
        <Title order={2} ta="center">
          Editar Equipo Especial: {form.values.nombre || 'Cargando...'}
        </Title>
        <div style={{ width: '100px' }}></div> {/* Placeholder para centrar el título */}
      </Group>
      <Paper withBorder shadow="md" p="md" mb="lg">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Grid gutter="md">
            <Grid.Col span={{ base: 12, md: 6 }}>
              <TextInput
                label="Nombre/Identificador"
                placeholder="Ej. CTU-001, Taladro HR-200"
                {...form.getInputProps('nombre')}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <TextInput
                label="Número de Serie"
                placeholder="Número único del equipo"
                {...form.getInputProps('numeroSerie')}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <TextInput
                label="Fabricante"
                placeholder="Ej. Schlumberger, Baker Hughes"
                {...form.getInputProps('fabricante')}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <TextInput
                label="Modelo"
                placeholder="Ej. Hydra Rig 1000, F-200"
                {...form.getInputProps('modelo')}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <DatePickerInput
                label="Fecha de Adquisición"
                placeholder="Selecciona la fecha"
                valueFormat="DD/MM/YYYY"
                {...form.getInputProps('fechaAdquisicion')}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <NumberInput
                label="Costo de Adquisición"
                placeholder="0.00"
                prefix="$"
                decimalScale={2}
                fixedDecimalScale
                min={0}
                {...form.getInputProps('costoAdquisicion')}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <NumberInput
                label="Horómetro Actual"
                placeholder="Ej. 15000"
                min={0}
                {...form.getInputProps('horometroActual')}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <TextInput
                label="Tipo de Equipo Especial"
                value={form.values.tipoEquipoEspecial}
                readOnly // Este campo no se edita, viene del tipo seleccionado al crear
                disabled
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Select
                label="Estado Operativo General"
                placeholder="Selecciona el estado"
                data={['Operativo', 'Operativo con Advertencias', 'No Operativo', 'En Taller', 'Inactivo']}
                {...form.getInputProps('estadoOperativoGeneral')}
              />
            </Grid.Col>
            <Grid.Col span={12}>
              <TextInput
                label="Ubicación Actual"
                placeholder="Ej. Pozo Y-12, Base Principal, Patio de Talleres"
                {...form.getInputProps('ubicacionActual')}
              />
            </Grid.Col>
            <Grid.Col span={12}>
              <Textarea
                label="Descripción Adicional"
                placeholder="Cualquier otra descripción relevante del equipo."
                autosize
                minRows={2}
                {...form.getInputProps('descripcion')}
              />
            </Grid.Col>

            <Grid.Col span={12}>
              <Checkbox
                label="¿Es este un equipo móvil (con motor y chasis propio)?"
                {...form.getInputProps('esMovil', { type: 'checkbox' })}
                mb="md"
              />
            </Grid.Col>

            {!form.values.esMovil && (
              <Grid.Col span={12}>
                <Select
                  label="Vehículo de Remolque / Unidad de Potencia (Opcional)"
                  placeholder="Selecciona un vehículo si aplica"
                  data={vehiculosRemolque}
                  searchable
                  clearable
                  {...form.getInputProps('vehiculoRemolqueId')}
                />
              </Grid.Col>
            )}
          </Grid>

          <Divider my="lg" label="Ficha Técnica del Equipo Especial" labelPosition="center" />

          <Grid gutter="md">
            <Grid.Col span={{ base: 12, md: 6 }}>
              <TextInput
                label="Capacidad Operacional"
                placeholder="Ej. 2000 BPD, 150klbs Empuje, 500 Ton Izaje"
                {...form.getInputProps('fichaTecnica.capacidadOperacional')}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <NumberInput
                label="Potencia HP"
                placeholder="Ej. 1200"
                min={0}
                {...form.getInputProps('fichaTecnica.potenciaHP')}
              />
            </Grid.Col>
            {/* Dimensiones */}
            <Grid.Col span={12}>
              <Text fw={500} size="sm" mb="xs">Dimensiones (Metros)</Text>
              <Grid gutter="xs">
                <Grid.Col span={3}>
                  <NumberInput label="Largo" placeholder="Largo" {...form.getInputProps('fichaTecnica.dimensiones.largoM')} step={0.01} precision={2} />
                </Grid.Col>
                <Grid.Col span={3}>
                  <NumberInput label="Ancho" placeholder="Ancho" {...form.getInputProps('fichaTecnica.dimensiones.anchoM')} step={0.01} precision={2} />
                </Grid.Col>
                <Grid.Col span={3}>
                  <NumberInput label="Alto" placeholder="Alto" {...form.getInputProps('fichaTecnica.dimensiones.altoM')} step={0.01} precision={2} />
                </Grid.Col>
                <Grid.Col span={3}>
                  <NumberInput label="Peso (Kg)" placeholder="Peso" {...form.getInputProps('fichaTecnica.dimensiones.pesoKg')} step={1} />
                </Grid.Col>
              </Grid>
            </Grid.Col>

            {/* Campos JSONB para especificaciones detalladas, mantenimiento y certificaciones */}
            <Grid.Col span={12}>
              <Textarea
                label="Especificaciones Detalladas (JSON)"
                placeholder='Ej: {"inyector": {"modelo": "X", "maxPull": "Y"}}'
                autosize
                minRows={4}
                {...form.getInputProps('fichaTecnica.especificacionesDetalladas')}
                value={JSON.stringify(form.values.fichaTecnica.especificacionesDetalladas, null, 2)}
                onChange={(event) => {
                  try {
                    form.setFieldValue('fichaTecnica.especificacionesDetalladas', JSON.parse(event.currentTarget.value));
                  } catch (e) {
                    form.setFieldError('fichaTecnica.especificacionesDetalladas', 'Formato JSON inválido');
                  }
                }}
              />
            </Grid.Col>
            <Grid.Col span={12}>
              <Textarea
                label="Mantenimiento de Componentes Clave (JSON)"
                placeholder='Ej: {"motorPrincipal": {"ultimoServicioHoras": 1000, "intervaloServicioHoras": 500}}'
                autosize
                minRows={4}
                {...form.getInputProps('fichaTecnica.mantenimientoComponentes')}
                value={JSON.stringify(form.values.fichaTecnica.mantenimientoComponentes, null, 2)}
                 onChange={(event) => {
                  try {
                    form.setFieldValue('fichaTecnica.mantenimientoComponentes', JSON.parse(event.currentTarget.value));
                  } catch (e) {
                    form.setFieldError('fichaTecnica.mantenimientoComponentes', 'Formato JSON inválido');
                  }
                }}
              />
            </Grid.Col>
            <Grid.Col span={12}>
              <Textarea
                label="Certificaciones (JSON Array)"
                placeholder='Ej: [{"nombre": "API 8C", "vencimiento": "2025-12-31"}]'
                autosize
                minRows={4}
                {...form.getInputProps('fichaTecnica.certificaciones')}
                value={JSON.stringify(form.values.fichaTecnica.certificaciones, null, 2)}
                 onChange={(event) => {
                  try {
                    form.setFieldValue('fichaTecnica.certificaciones', JSON.parse(event.currentTarget.value));
                  } catch (e) {
                    form.setFieldError('fichaTecnica.certificaciones', 'Formato JSON inválido');
                  }
                }}
              />
            </Grid.Col>
          </Grid>

          <Group justify="flex-end" mt="xl">
            <Button variant="default" onClick={() => router.push(`/superuser/flota/especial/${id}`)}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting} disabled={isSubmitting}>
              Guardar Cambios
            </Button>
          </Group>
        </form>
      </Paper>
    </Container>
  );
}