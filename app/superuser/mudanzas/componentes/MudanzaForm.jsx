// components/mudanzas/MudanzaForm.jsx
'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from '@mantine/form';
import {
  TextInput, Select, Button, Group, Box, Paper, Title, Grid, Textarea,
  NumberInput, Divider, ActionIcon, Text, Loader, Center, Container
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useRouter, useParams } from 'next/navigation';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import '@mantine/dates/styles.css';
import { DatePickerInput } from '@mantine/dates';

export function MudanzaForm({ initialData = null }) {
  const router = useRouter();
  const params = useParams();
  const { id: renglonIdFromUrl } = params;

  const [loadingRenglon, setLoadingRenglon] = useState(true);
  const [renglonInfo, setRenglonInfo] = useState(null);
  const [empleados, setEmpleados] = useState([]);
  const [vehiculos, setVehiculos] = useState([]);

  const form = useForm({
    initialValues: {
      renglonContratoId: initialData?.renglonContratoId?.toString() || renglonIdFromUrl,
      fechaInicio: null, // Solo mantenemos esta fecha
      puntoOrigen: '',
      puntoDestino: '',
      estado: 'Planificada',
      supervisorId: null,
      kilometrosRecorridos: 0, 
      notas: '',
      personalAsignado: [],
      vehiculosAsignados: [],
    },
    validate: {
      fechaInicio: (value) => (value ? null : 'La fecha de la mudanza es requerida'), // Actualizamos el mensaje de validación
      puntoOrigen: (value) => (value ? null : 'El punto de origen es requerido'),
      puntoDestino: (value) => (value ? null : 'El punto de destino es requerido'),
      kilometrosRecorridos: (value) => (value === null || value === undefined || value < 0 ? 'Los kilómetros deben ser un número positivo' : null),
      estado: (value) => (value ? null : 'El estado de la mudanza es requerido'),
      personalAsignado: {
        empleadoId: (value) => (value ? null : 'Seleccione un empleado'),
        rolEnMudanza: (value) => (value ? null : 'Defina el rol'),
      },
      vehiculosAsignados: {
        vehiculoId: (value) => (value ? null : 'Seleccione un vehículo'),
        tipoVehiculoMudanza: (value) => (value ? null : 'Defina el tipo de vehículo'),
        conductorId: (value, values, index) => {
          const currentVehicleType = form.values.vehiculosAsignados[index]?.tipoVehiculoMudanza;
          if ((currentVehicleType === 'Transporte de Personal' || currentVehicleType === 'Carga Pesada') && !value) {
            return 'Se requiere un conductor para este tipo de vehículo';
          }
          return null;
        },
      },
    },
  });

  useEffect(() => {
    const fetchDependencies = async () => {
      if (!initialData && renglonIdFromUrl) {
        try {
          const response = await fetch(`/api/operaciones/contratos/renglones/${renglonIdFromUrl}`);
          if (!response.ok) {
            throw new Error(`Error al cargar info del renglón: ${response.statusText}`);
          }
          const data = await response.json();
          setRenglonInfo(data);
          // if (data.contratoId) {
          //   const contratoRes = await fetch(`/api/operaciones/contratos/${data.contratoId}`);
          //   if (contratoRes.ok) {
          //     const contratoData = await contratoRes.json();
          //     setRenglonInfo(prev => ({ ...prev, contratoServicio: { numeroContrato: contratoData.numeroContrato } }));
          //   }
          // }
        } catch (error) {
          console.error("Error al cargar la información del renglón:", error);
          notifications.show({
            title: 'Error',
            message: `No se pudo cargar la información del renglón ${renglonIdFromUrl}.`,
            color: 'red',
          });
        } finally {
          setLoadingRenglon(false);
        }
      } else if (initialData) {
        setRenglonInfo({
          id: initialData.renglonContratoId,
          nombreRenglon: initialData.RenglonContrato?.nombreRenglon,
          pozoNombre: initialData.RenglonContrato?.pozoNombre,
          contratoServicio: {
            numeroContrato: initialData.RenglonContrato?.contratoServicio?.numeroContrato,
          },
        });
        setLoadingRenglon(false);
      } else {
        setLoadingRenglon(false);
      }

      try {
        const [empleadosRes, vehiculosRes] = await Promise.all([
          fetch('/api/rrhh/empleados'),
          fetch('/api/vehiculos'),
        ]);

        if (!empleadosRes.ok) throw new Error(`Error al cargar empleados: ${empleadosRes.statusText}`);
        if (!vehiculosRes.ok) throw new Error(`Error al cargar vehículos: ${vehiculosRes.statusText}`);
        
        const empleadosData = await empleadosRes.json();
        const vehiculosData = await vehiculosRes.json();
        console.log(empleadosData);
        console.log(vehiculosData);
        if (empleadosData.length === 0 && vehiculosData.length === 0) throw  new Error ("No hay ni vehiculos ni personal guardado, por favor registre nuevos empleados y vehiculos") 
        else if (empleadosData.length === 0)throw  new Error ("No hay personal guardado, por favor registre nuevos empleados")
        else if (vehiculosData.length === 0)throw  new Error ("No hay vehiculos guardados, por favor registre nuevos vehiculos")
        notifications.show({title: "logre pasar al punto en que me pusiste"})
        setEmpleados(empleadosData.map(emp => ({ value: emp.id.toString(), label: emp.nombreCompleto || `${emp.nombre} ${emp.apellido}` })));
        setVehiculos(vehiculosData.map(veh => ({ value: veh.id.toString(), label: `${veh.marca} ${veh.modelo} (${veh.placa})` })));

      } catch (error) {
        console.error("Error al cargar empleados o vehículos:", error);
        notifications.show({
          title: 'Error',
          message: `No se pudieron cargar listas de empleados o vehículos. ${error.message}`,
          color: 'red',
        });
      }
    };

    fetchDependencies();
  }, [renglonIdFromUrl, initialData]);

  useEffect(() => {
    if (initialData) {
      form.setValues({
        ...initialData,
        renglonContratoId: initialData.renglonContratoId?.toString() || '',
        fechaInicio: initialData.fechaInicio ? new Date(initialData.fechaInicio) : null,
        // Eliminamos las asignaciones de fechaFinEstimada y fechaFinReal
        kilometrosRecorridos: initialData.kilometrosRecorridos !== undefined ? initialData.kilometrosRecorridos : 0,
        supervisorId: initialData.supervisorId?.toString() || null,
        personalAsignado: initialData.PersonalMudanzas?.map(p => ({
          empleadoId: p.empleadoId?.toString(),
          rolEnMudanza: p.rolEnMudanza,
        })) || [],
        vehiculosAsignados: initialData.VehiculoMudanzas?.map(v => ({
          vehiculoId: v.vehiculoId?.toString(),
          tipoVehiculoMudanza: v.tipoVehiculoMudanza,
          conductorId: v.conductorId?.toString() || null,
        })) || [],
      });
    }
  }, [initialData]);

  const handleSubmit = async (values) => {
    const payload = {
      ...values,
      renglonContratoId: parseInt(values.renglonContratoId),
      fechaInicio: values.fechaInicio ? values.fechaInicio.toISOString().split('T')[0] : null,
      // Eliminamos estas propiedades del payload
      // fechaFinEstimada: values.fechaFinEstimada ? values.fechaFinEstimada.toISOString().split('T')[0] : null,
      // fechaFinReal: values.fechaFinReal ? values.fechaFinReal.toISOString().split('T')[0] : null,
      supervisorId: values.supervisorId ? parseInt(values.supervisorId) : null,
      personalAsignado: values.personalAsignado.map(p => ({
        empleadoId: parseInt(p.empleadoId),
        rolEnMudanza: p.rolEnMudanza,
      })),
      vehiculosAsignados: values.vehiculosAsignados.map(v => ({
        vehiculoId: parseInt(v.vehiculoId),
        tipoVehiculoMudanza: v.tipoVehiculoMudanza,
        conductorId: v.conductorId ? parseInt(v.conductorId) : null,
      })),
    };

    let response;
    let url = '/api/operaciones/mudanzas';
    let method = 'POST';
    let successMessage = 'Mudanza registrada exitosamente';
    let errorMessage = 'Error al registrar mudanza';

    if (initialData) {
      url = `/api/operaciones/mudanzas/${initialData.id}`;
      method = 'PUT';
      successMessage = 'Mudanza actualizada exitosamente';
      errorMessage = 'Error al actualizar mudanza';
    }

    try {
      response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || response.statusText);
      }

      notifications.show({ title: 'Éxito', message: successMessage, color: 'green' });
      router.push(`/superuser/servicios-adquiridos/${renglonIdFromUrl || initialData.renglonContratoId}`);
    } catch (error) {
      console.error(errorMessage, error);
      notifications.show({ title: 'Error', message: `${errorMessage}: ${error.message}`, color: 'red' });
    }
  };

  const addPersonal = () => {
    form.insertListItem('personalAsignado', { empleadoId: '', rolEnMudanza: '' });
  };

  const removePersonal = (index) => {
    form.removeListItem('personalAsignado', index);
  };

  const addVehiculo = () => {
    form.insertListItem('vehiculosAsignados', { vehiculoId: '', tipoVehiculoMudanza: '', conductorId: null });
  };

  const removeVehiculo = (index) => {
    form.removeListItem('vehiculosAsignados', index);
  };

  const personalFields = form.values.personalAsignado.map((item, index) => (
    <Paper key={index} withBorder shadow="xs" p="md" mb="sm">
      <Group justify="flex-end">
        <ActionIcon
          color="red"
          onClick={() => removePersonal(index)}
          variant="light"
          size="sm"
          aria-label="Eliminar personal"
        >
          <IconTrash style={{ width: '70%', height: '70%' }} stroke={1.5} />
        </ActionIcon>
      </Group>
      <Grid gutter="md">
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Select
            label="Empleado"
            placeholder="Selecciona un empleado"
            data={empleados}
            required
            searchable
            clearable
            {...form.getInputProps(`personalAsignado.${index}.empleadoId`)}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <TextInput
            label="Rol en la Mudanza"
            placeholder="Ej: Ayudante, Soldador, Mecánico"
            required
            {...form.getInputProps(`personalAsignado.${index}.rolEnMudanza`)}
          />
        </Grid.Col>
      </Grid>
    </Paper>
  ));

  const vehiculosFields = form.values.vehiculosAsignados.map((item, index) => (
    <Paper key={index} withBorder shadow="xs" p="md" mb="sm">
      <Group justify="flex-end">
        <ActionIcon
          color="red"
          onClick={() => removeVehiculo(index)}
          variant="light"
          size="sm"
          aria-label="Eliminar vehículo"
        >
          <IconTrash style={{ width: '70%', height: '70%' }} stroke={1.5} />
        </ActionIcon>
      </Group>
      <Grid gutter="md">
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Select
            label="Vehículo"
            placeholder="Selecciona un vehículo"
            data={vehiculos}
            required
            searchable
            clearable
            {...form.getInputProps(`vehiculosAsignados.${index}.vehiculoId`)}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Select
            label="Tipo de Vehículo en Mudanza"
            placeholder="Ej: Carga Pesada, Transporte de Personal"
            data={['Carga Pesada', 'Transporte de Personal', 'Grúa', 'Montacargas', 'Vehículo de Apoyo']}
            required
            {...form.getInputProps(`vehiculosAsignados.${index}.tipoVehiculoMudanza`)}
          />
        </Grid.Col>
        {(item.tipoVehiculoMudanza === 'Transporte de Personal' || item.tipoVehiculoMudanza === 'Carga Pesada') && (
          <Grid.Col span={12}>
            <Select
              label="Conductor Asignado"
              placeholder="Selecciona un conductor"
              data={empleados}
              required
              searchable
              clearable
              {...form.getInputProps(`vehiculosAsignados.${index}.conductorId`)}
            />
          </Grid.Col>
        )}
      </Grid>
    </Paper>
  ));

  if (loadingRenglon && !initialData) {
    return (
      <Container size="xl" py="xl">
        <Center>
          <Loader size="xl" />
          <Text ml="md">Cargando información del servicio/fase...</Text>
        </Center>
      </Container>
    );
  }

  if (!renglonInfo && !initialData) {
    return (
      <Container size="xl" py="xl">
        <Center>
          <Text c="red">No se pudo cargar la información del servicio/fase. Verifique la URL.</Text>
        </Center>
      </Container>
    );
  }

  return (
    <Box maw={1000} mx="auto">
      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <Title order={2} ta="center" mb="lg">
          {initialData ? 'Editar Mudanza' : 'Registrar Nueva Mudanza'}
        </Title>
        <Text ta="center" mb="md" c="dimmed">
          Para el Servicio/Fase: <Text span fw={700}>{renglonInfo?.nombreRenglon || 'N/A'}</Text>
          <br />
          Pozo: <Text span fw={700}>{renglonInfo?.pozoNombre || 'N/A'}</Text>
          <br />
          Contrato Nº: <Text span fw={700}>{renglonInfo?.contratoServicio?.numeroContrato || 'N/A'}</Text>
        </Text>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Grid gutter="md">
            <Grid.Col span={{ base: 12, md: 6 }}> {/* Cambiado a span 12 para ocupar todo el ancho si no hay otra fecha */}
              <DatePickerInput
                label="Fecha estimada de la Mudanza"
                placeholder="Selecciona la fecha"
                valueFormat="DD/MM/YYYY"
                required
                {...form.getInputProps('fechaInicio')}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <NumberInput
                label="Kilómetros de Recorrido"
                placeholder="puede agregarse despues si no se tiene este dato"
                suffix=" km"
                min={0}
                required
                {...form.getInputProps('kilometrosRecorridos')}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <TextInput
                label="Punto de Origen"
                placeholder="Ej: Patio de Talleres, Almacén Principal"
                required
                {...form.getInputProps('puntoOrigen')}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <TextInput
                label="Punto de Destino"
                placeholder="Ej: Pozo X-1, Campo Morichal"
                required
                {...form.getInputProps('puntoDestino')}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Select
                label="Supervisor de la Mudanza"
                placeholder="Selecciona un supervisor"
                data={empleados}
                searchable
                clearable
                {...form.getInputProps('supervisorId')}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Select
                label="Estado de la Mudanza"
                placeholder="Selecciona el estado"
                data={['Planificada', 'En Progreso', 'Finalizada', 'Cancelada']} 
                required
                {...form.getInputProps('estado')}
              />
            </Grid.Col>
            <Grid.Col span={12}>
              <Textarea
                label="Notas Adicionales"
                placeholder="Cualquier observación o detalle relevante..."
                {...form.getInputProps('notas')}
                rows={3}
              />
            </Grid.Col>

            <Grid.Col span={12}>
              <Divider my="md" label="Personal Asignado" labelPosition="center" />
              {personalFields.length > 0 ? (
                personalFields
              ) : (
                <Text c="dimmed" ta="center" mt="md">No hay personal asignado. Agregue uno.</Text>
              )}
              <Group justify="center" mt="md">
                <Button leftSection={<IconPlus size={16} />} onClick={addPersonal} variant="light">
                  Agregar Personal
                </Button>
              </Group>
            </Grid.Col>

            <Grid.Col span={12}>
              <Divider my="md" label="Vehículos Asignados" labelPosition="center" />
              {vehiculosFields.length > 0 ? (
                vehiculosFields
              ) : (
                <Text c="dimmed" ta="center" mt="md">No hay vehículos asignados. Agregue uno.</Text>
              )}
              <Group justify="center" mt="md">
                <Button leftSection={<IconPlus size={16} />} onClick={addVehiculo} variant="light">
                  Agregar Vehículo
                </Button>
              </Group>
            </Grid.Col>

          </Grid>

          <Group justify="flex-end" mt="xl">
            <Button variant="default" onClick={() => router.back()}>
              Cancelar
            </Button>
            <Button type="submit">
              {initialData ? 'Actualizar Mudanza' : 'Registrar Mudanza'}
            </Button>
          </Group>
        </form>
      </Paper>
    </Box>
  );
}