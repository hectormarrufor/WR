// app/superuser/flota/especial/crear/[tipoEquipo]/page.jsx
'use client';

import { Container, Title, Text, Paper, Button, Group, Grid, TextInput, NumberInput, Textarea, Select, Checkbox, Box, Divider, Center, Loader, ActionIcon } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { DynamicPropertyInput } from '../../components/DynamicPropertyInput';
import { httpGet, httpPost } from '../../../../../ApiFunctions/httpServices';


export default function CrearEquipoEspecialFormPage() {
  const router = useRouter();
  const { tipoEquipo: encodedTipoEquipo } = useParams();
  const tipoEquipoUrl = decodeURIComponent(encodedTipoEquipo); // El nombre del tipo de equipo de la URL

  const [loadingInitialData, setLoadingInitialData] = useState(true);
  const [vehiculosRemolque, setVehiculosRemolque] = useState([]);
  const [featureOptions, setFeatureOptions] = useState([]);
  const [tiposEquipoEspecial, setTiposEquipoEspecial] = useState([]); // Lista de { value: id, label: nombre }
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    initialValues: {
      nombre: '',
      numeroSerie: '',
      placa: '',
      horometroActual: 0,
      kilometrajeActual: 0,
      tipoEquipoEspecialId: null, // <-- Ahora es un ID
      estadoOperativoGeneral: 'Operativo',
      esMovil: true,
      vehiculoRemolqueId: null,
      fichaTecnica: {
        propiedades: {}, // Objeto vacío por defecto
      },
    },
    validate: {
      nombre: (value) => (value ? null : 'El nombre/identificador es requerido'),
      numeroSerie: (value) => (value ? null : 'El número de serie es requerido'),
      tipoEquipoEspecialId: (value) => (value ? null : 'El tipo de equipo especial es requerido'),
      horometroActual: (value) => (value >= 0 ? null : 'El horómetro debe ser un número positivo'),
    },
  });

  useEffect(() => {
    async function loadInitialData() {
        setLoadingInitialData(true);
        try {
            // Cargar vehículos para remolque
            const vehiclesResponse = await httpGet('/api/vehiculos');
            const vehicles = vehiclesResponse.map(v => ({ value: v.id.toString(), label: `${v.marca} ${v.modelo} (${v.placa})` }));
            setVehiculosRemolque(vehicles);

            // Cargar las features/claves dinámicas
            const featuresResponse = await httpGet('/api/equiposEspeciales/features');
            setFeatureOptions(featuresResponse);

            // Cargar los tipos de equipo especial y encontrar el ID del tipo de la URL
            const tiposResponse = await httpGet('/api/tiposEquiposEspeciales');
            const formattedTipos = tiposResponse.map(t => ({ value: t.id.toString(), label: t.nombre }));
            setTiposEquipoEspecial(formattedTipos);

            let currentTipoEquipoId = null;
            if (tipoEquipoUrl) {
                const selectedTipoFromDb = tiposResponse.find(t => t.nombre === tipoEquipoUrl);
                if (selectedTipoFromDb) {
                    currentTipoEquipoId = selectedTipoFromDb.id;
                    form.setFieldValue('tipoEquipoEspecialId', selectedTipoFromDb.id.toString());
                } else {
                    notifications.show({
                        title: 'Advertencia',
                        message: `El tipo "${tipoEquipoUrl}" no fue encontrado en la base de datos de tipos. Selecciona uno manualmente.`,
                        color: 'orange',
                    });
                }
            }

            // Si se encontró el tipo de equipo (o si se va a crear uno nuevo), intentar cargar el último equipo de ese tipo
            if (currentTipoEquipoId) {
                const lastEquipoResponse = await httpGet(`/api/equiposEspeciales?tipoEquipoEspecialId=${currentTipoEquipoId}&limit=1&orderBy=createdAt:desc`);
                if (lastEquipoResponse && lastEquipoResponse.length > 0) {
                    const lastEquipo = lastEquipoResponse[0];
                    // Pre-llenar campos fijos y propiedades dinámicas del último equipo
                    form.setValues({
                        nombre: `Copia de ${lastEquipo.nombre || tipoEquipoUrl}`, // Sugerir un nombre basado en la copia
                        // numeroSerie: '', // El número de serie debe ser nuevo y único
                        // placa: '', // La placa también debe ser nueva
                        horometroActual: lastEquipo.horometroActual,
                        kilometrajeActual: lastEquipo.kilometrajeActual,
                        // tipoEquipoEspecialId ya está asignado
                        estadoOperativoGeneral: lastEquipo.estadoOperativoGeneral,
                        esMovil: lastEquipo.esMovil,
                        vehiculoRemolqueId: lastEquipo.vehiculoRemolqueId ? lastEquipo.vehiculoRemolqueId.toString() : null,
                        fichaTecnica: {
                            propiedades: lastEquipo.fichaTecnica?.propiedades || {}, // Usar las propiedades del último equipo
                        },
                    });
                    notifications.show({
                        title: 'Pre-llenado',
                        message: 'Formulario pre-llenado con los datos del último equipo especial de este tipo.',
                        color: 'blue',
                    });
                } else {
                    notifications.show({
                        title: 'Info',
                        message: 'No hay equipos especiales registrados de este tipo. Formulario vacío.',
                        color: 'gray',
                    });
                }
            }


        } catch (error) {
            console.error('Error al cargar datos iniciales:', error);
            setError('Error al cargar datos iniciales para el formulario.');
            notifications.show({
                title: 'Error',
                message: `No se pudieron cargar los datos necesarios para el formulario: ${error.message || error}`,
                color: 'red',
            });
        } finally {
            setLoadingInitialData(false);
        }
    }
    loadInitialData();
  }, [tipoEquipoUrl]); // Dependencia del tipoEquipoUrl para pre-selección


  const handleAddDynamicProperty = () => {
    // Añadir una nueva propiedad/sistema de nivel superior
    const currentProperties = form.values.fichaTecnica.propiedades;
    const newKey = `Sistema${Object.keys(currentProperties).length + 1}`; // Clave inicial temporal
    // Problem: If currentProperties is Proxy object from useForm (which it is), Object.keys might not reflect changes directly.
    // Use form.getValues() to ensure current state if needed.
    form.setFieldValue(`fichaTecnica.propiedades.${newKey}`, null); // undefined para que DynamicPropertyInput muestre el Select
    console.log(`[DEBUG] Añadiendo nueva propiedad: fichaTecnica.propiedades.${newKey}`);
    console.log(`[DEBUG] Form values after add:`, form.values.fichaTecnica);
  };

  const handleRemoveDynamicProperty = (keyToRemove) => {
    const updatedProperties = { ...form.values.fichaTecnica.propiedades };
    delete updatedProperties[keyToRemove];
    form.setFieldValue('fichaTecnica.propiedades', updatedProperties);
  };

  const handleSubmit = async (values) => {
    setIsSubmitting(true);
    try {
      const payload = {
        ...values,
        horometroActual: parseInt(values.horometroActual),
        kilometrajeActual: parseInt(values.kilometrajeActual || 0),
        placa: values.placa || null,
        tipoEquipoEspecialId: parseInt(values.tipoEquipoEspecialId),
        vehiculoRemolqueId: values.vehiculoRemolqueId ? parseInt(values.vehiculoRemolqueId) : null,
      };

      const response = await httpPost('/api/equiposEspeciales', payload); //
      
      if (response.error) {
        throw new Error(response.error);
      }

      notifications.show({
        title: 'Éxito',
        message: `Equipo especial "${payload.nombre}" registrado exitosamente.`,
        color: 'green',
      });
      router.push('/superuser/flota/especial');
    } catch (error) {
      console.error('Error al registrar equipo especial:', error);
      notifications.show({
        title: 'Error',
        message: `Error al registrar equipo especial: ${error.message || error}`,
        color: 'red',
      });
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <Container size="xl" py="xl">
      <Title order={2} ta="center" mb="lg">
        Registrar Nuevo Equipo Especial: {tipoEquipoUrl}
      </Title>
      <Paper withBorder shadow="md" p="md" mb="lg">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Grid gutter="md">
            {/* Campos Fijos */}
            <Grid.Col span={{ base: 12, md: 6 }}>
              <TextInput label="Nombre/Identificador" placeholder="Ej. CTU-001" {...form.getInputProps('nombre')} />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <TextInput label="Número de Serie" placeholder="Número único del fabricante" {...form.getInputProps('numeroSerie')} />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <TextInput label="Placa (Opcional)" placeholder="Placa si aplica (ej. remolque)" {...form.getInputProps('placa')} />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <NumberInput label="Horómetro Actual" placeholder="0" min={0} {...form.getInputProps('horometroActual')} />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <NumberInput label="Kilometraje Actual" placeholder="0" min={0} {...form.getInputProps('kilometrajeActual')} />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Select // CAMBIO: Ahora es un Select para Tipo de Equipo Especial
                label="Tipo de Equipo Especial"
                placeholder="Selecciona el tipo"
                data={tiposEquipoEspecial} // Opciones cargadas desde la API
                searchable
                {...form.getInputProps('tipoEquipoEspecialId')}
                // Puedes deshabilitar si viene de la URL para forzar ese tipo
                // disabled={!!tipoEquipoUrl && form.values.tipoEquipoEspecialId !== null}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Select
                label="Estado Operativo Inicial"
                placeholder="Selecciona el estado"
                data={['Operativo', 'Operativo con Advertencias', 'No Operativo', 'En Taller', 'Inactivo']}
                {...form.getInputProps('estadoOperativoGeneral')}
                disabled
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

          <Divider my="lg" label="Sistemas y Componentes (Propiedades Dinámicas)" labelPosition="center" />

          {/* Sección para propiedades dinámicas (Sistemas/Componentes) */}
          <Box>
            {Object.entries(form.values.fichaTecnica.propiedades).map(([key, value]) => (
              <Box key={key} mb="md" p="sm" style={{ border: '1px solid var(--mantine-color-gray-3)', borderRadius: 'var(--mantine-radius-sm)' }}>
                <Group justify="space-between" align="center">
                  <Text fw={700} size="md">Sistema: {key}</Text>
                  <ActionIcon color="red" onClick={() => handleRemoveDynamicProperty(key)}>
                    <IconTrash size={20} />
                  </ActionIcon>
                </Group>
                <DynamicPropertyInput
                  form={form}
                  path={`fichaTecnica.propiedades.${key}`}
                  featureOptions={featureOptions}
                  propertyName={key}
                  parentFeatureType={null} // Estas son propiedades de nivel superior
                />
              </Box>
            ))}
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={handleAddDynamicProperty}
              variant="outline"
              fullWidth
              mt="md"
            >
              Añadir Nuevo Sistema
            </Button>
          </Box>

          <Group justify="flex-end" mt="xl">
            <Button variant="default" onClick={() => router.push('/superuser/flota/especial/crear')}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting} disabled={isSubmitting}>
              Registrar Equipo Especial
            </Button>
          </Group>
        </form>
      </Paper>
    </Container>
  );
}