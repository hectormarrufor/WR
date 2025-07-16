// components/mudanzas/MudanzaForm.jsx
'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from '@mantine/form';
import {
  TextInput, DateInput, Select, Button, Group, Box, Paper, Title, Grid, Textarea,
  NumberInput, Divider, ActionIcon, Text, Loader, Center
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useRouter, useParams } from 'next/navigation';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import '@mantine/dates/styles.css';

export function MudanzaForm({ initialData = null }) {
  const router = useRouter();
  const params = useParams();
  const { id: renglonContratoId } = params; // Obtiene el ID del renglón de la URL

  const [loadingRenglon, setLoadingRenglon] = useState(true);
  const [renglonInfo, setRenglonInfo] = useState(null);
  const [empleados, setEmpleados] = useState([]); // Para el Select de supervisor y personal
  const [vehiculos, setVehiculos] = useState([]); // Para el Select de vehículos


  const form = useForm({
    initialValues: {
      renglonContratoId: parseInt(renglonContratoId), // Pre-llenado desde la URL
      fechaInicio: null,
      fechaFinEstimada: null,
      fechaFinReal: null,
      puntoOrigen: '',
      puntoDestino: '',
      estado: 'Planificada', // Estado inicial de la mudanza
      supervisorId: null,
      notas: '',
      // Arrays para campos dinámicos
      personalAsignado: [], // { empleadoId: string, rolEnMudanza: string }
      vehiculosAsignados: [], // { vehiculoId: string, tipoVehiculoMudanza: string, conductorId: string }
    },
    validate: {
      fechaInicio: (value) => (value ? null : 'La fecha de inicio de la mudanza es requerida'),
      puntoOrigen: (value) => (value ? null : 'El punto de origen es requerido'),
      puntoDestino: (value) => (value ? null : 'El punto de destino es requerido'),
      estado: (value) => (value ? null : 'El estado de la mudanza es requerido'),
      personalAsignado: {
        empleadoId: (value) => (value ? null : 'Seleccione un empleado'),
        rolEnMudanza: (value) => (value ? null : 'Defina el rol'),
      },
      vehiculosAsignados: {
        vehiculoId: (value) => (value ? null : 'Seleccione un vehículo'),
        tipoVehiculoMudanza: (value) => (value ? null : 'Defina el tipo de vehículo'),
        conductorId: (value, values, index) => {
          // Si el tipo de vehículo es "Transporte de Personal" o "Carga Pesada"
          const currentVehicleType = form.values.vehiculosAsignados[index]?.tipoVehiculoMudanza;
          if ((currentVehicleType === 'Transporte de Personal' || currentVehicleType === 'Carga Pesada') && !value) {
            return 'Se requiere un conductor para este tipo de vehículo';
          }
          return null;
        },
      },
    },
  });

  // Efecto para cargar datos iniciales del renglón (si es necesario para display)
  useEffect(() => {
    const fetchRenglonInfo = async () => {
      if (renglonContratoId) {
        try {
          const response = await fetch(`/api/operaciones/renglones-servicio/${renglonContratoId}`); // Podrías necesitar un endpoint para un solo renglón
          if (!response.ok) {
            throw new Error(`Error al cargar info del renglón: ${response.statusText}`);
          }
          const data = await response.json();
          setRenglonInfo(data);
        } catch (error) {
          console.error("Error al cargar la información del renglón:", error);
          notifications.show({
            title: 'Error',
            message: `No se pudo cargar la información del renglón ${renglonContratoId}.`,
            color: 'red',
          });
        } finally {
          setLoadingRenglon(false);
        }
      }
    };

    const fetchEmpleadosAndVehiculos = async () => {
      try {
        const [empleadosRes, vehiculosRes] = await Promise.all([
          fetch('/api/rrhh/empleados'), // API para obtener empleados
          fetch('/api/flota/vehiculos'), // API para obtener vehículos
        ]);

        if (!empleadosRes.ok) throw new Error(`Error al cargar empleados: ${empleadosRes.statusText}`);
        if (!vehiculosRes.ok) throw new Error(`Error al cargar vehículos: ${vehiculosRes.statusText}`);

        const empleadosData = await empleadosRes.json();
        const vehiculosData = await vehiculosRes.json();

        setEmpleados(empleadosData.map(emp => ({ value: emp.id.toString(), label: emp.nombreCompleto || `${emp.nombre} ${emp.apellido}` })));
        setVehiculos(vehiculosData.map(veh => ({ value: veh.id.toString(), label: `${veh.marca} ${veh.modelo} (${veh.placa})` })));

      } catch (error) {
        console.error("Error al cargar empleados o vehículos:", error);
        notifications.show({
          title: 'Error',
          message: 'No se pudieron cargar listas de empleados o vehículos.',
          color: 'red',
        });
      }
    };

    fetchRenglonInfo();
    fetchEmpleadosAndVehiculos();
  }, [renglonContratoId]);

  // Efecto para inicializar formulario con initialData (para edición)
  useEffect(() => {
    if (initialData) {
      form.setValues({
        ...initialData,
        renglonContratoId: initialData.renglonContratoId?.toString() || '',
        fechaInicio: initialData.fechaInicio ? new Date(initialData.fechaInicio) : null,
        fechaFinEstimada: initialData.fechaFinEstimada ? new Date(initialData.fechaFinEstimada) : null,
        fechaFinReal: initialData.fechaFinReal ? new Date(initialData.fechaFinReal) : null,
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
  }, [initialData, form]);

  const handleSubmit = async (values) => {
    // Formatear fechas y convertir IDs a números si es necesario
    const payload = {
      ...values,
      renglonContratoId: parseInt(values.renglonContratoId),
      fechaInicio: values.fechaInicio ? values.fechaInicio.toISOString().split('T')[0] : null,
      fechaFinEstimada: values.fechaFinEstimada ? values.fechaFinEstimada.toISOString().split('T')[0] : null,
      fechaFinReal: values.fechaFinReal ? values.fechaFinReal.toISOString().split('T')[0] : null,
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
    let url = '/api/operaciones/mudanzas'; // API para registrar mudanzas
    let method = 'POST';
    let successMessage = 'Mudanza registrada exitosamente';
    let errorMessage = 'Error al registrar mudanza';

    if (initialData) { // Si estás editando una mudanza existente
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
      router.push(`/superuser/servicios-adquiridos/${renglonContratoId}`); // Volver a la página de detalle del renglón
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
              data={empleados} // Los conductores son empleados
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


  if (loadingRenglon && !initialData) { // Solo muestra loader si estamos creando y no tenemos initialData
    return (
      <Container size="xl" py="xl">
        <Center>
          <Loader size="xl" />
          <Text ml="md">Cargando información del renglón...</Text>
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
          Para el Servicio/Fase: <Text span fw={700}>{renglonInfo?.nombreRenglon || 'Cargando...'}</Text>
          <br />
          Pozo: <Text span fw={700}>{renglonInfo?.pozoNombre || 'Cargando...'}</Text>
          <br />
          Contrato Nº: <Text span fw={700}>{renglonInfo?.contratoServicio?.numeroContrato || 'Cargando...'}</Text>
        </Text>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Grid gutter="md">
            <Grid.Col span={{ base: 12, md: 6 }}>
              <DateInput
                label="Fecha de Inicio de Mudanza"
                placeholder="Selecciona la fecha"
                valueFormat="DD/MM/YYYY"
                required
                {...form.getInputProps('fechaInicio')}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <DateInput
                label="Fecha Fin Estimada"
                placeholder="Fecha estimada de fin"
                valueFormat="DD/MM/YYYY"
                {...form.getInputProps('fechaFinEstimada')}
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
                data={['Planificada', 'En Progreso', 'En Pausa', 'Finalizada', 'Cancelada']}
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