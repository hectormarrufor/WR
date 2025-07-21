// components/operaciones-campo/OperacionCampoForm.jsx
'use client';

import React, { useEffect, useState } from 'react';
import { 
  TextInput, Button, Group, Box, Paper, Title, Grid, Loader, Center, 
  Select, Textarea, Container, Text, NumberInput 
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';

export function OperacionCampoForm({ initialData = null }) {
  const router = useRouter();
  const [contratos, setContratos] = useState([]);
  const [empleados, setEmpleados] = useState([]); // Nuevo estado para empleados
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [errorOptions, setErrorOptions] = useState(null);

  const isEditing = initialData && initialData.id; 

  const form = useForm({
    initialValues: {
      // Campos básicos
      // Nota: 'nombre' del formulario no está en el modelo directamente, 
      // podría ser el 'codigoOperacion' si lo incluyes o un nombre descriptivo
      // que generes o asignes. Lo mantendré por ahora como un campo descriptivo.
      nombre: '', // Este campo no está en el modelo, considerar renombrarlo o quitarlo si no es necesario.
      renglonContratoId: '', // Este es el ID del renglón del contrato
      fechaInicio: null,
      fechaFinEstimada: null,
      fechaFinReal: null, // Nuevo campo
      tiempoTotalEstadia: '', // Nuevo campo
      tiempoNoOperado: 0, // Nuevo campo
      motivoNoOperado: '', // Nuevo campo
      
      // Asignaciones de personal
      supervisorId: '',
      mecanicoId: '',
      montacargistaId: '',
      perforadorId: '',
      encuelladorId: '',
      llaveroId: '',
      cuneroId: '',
      
      notas: '', // Nuevo campo, se mapea a 'descripcion' o similar
    },
    validate: {
      nombre: (value) => (value ? null : 'El nombre/código de la operación es requerido'),
      renglonContratoId: (value) => (value ? null : 'Seleccionar un servicio/fase (renglón de contrato) es requerido'),
      fechaInicio: (value) => (value ? null : 'La fecha de inicio es requerida'),
      estado: (value) => (value ? null : 'El estado de la operación es requerido'), // Este campo tampoco está en el modelo. Considera si lo necesitas.
      tipoOperacion: (value) => (value ? null : 'El tipo de operación es requerido'), // Este campo tampoco está en el modelo. Considera si lo necesitas.
      tiempoTotalEstadia: (value) => (value !== null && value < 0 ? 'No puede ser negativo' : null),
      tiempoNoOperado: (value) => (value !== null && value < 0 ? 'No puede ser negativo' : null),
    },
  });

  // Cargar datos iniciales
  useEffect(() => {
    if (initialData) {
      form.setValues({
        ...initialData,
        renglonContratoId: initialData.renglonContratoId?.toString() || '',
        fechaInicio: initialData.fechaInicio ? new Date(initialData.fechaInicio) : null,
        fechaFinEstimada: initialData.fechaFinEstimada ? new Date(initialData.fechaFinEstimada) : null,
        fechaFinReal: initialData.fechaFinReal ? new Date(initialData.fechaFinReal) : null,
        
        // Asegúrate de que los IDs de empleados sean strings para los Selects
        supervisorId: initialData.supervisorId?.toString() || '',
        mecanicoId: initialData.mecanicoId?.toString() || '',
        montacargistaId: initialData.montacargistaId?.toString() || '',
        perforadorId: initialData.perforadorId?.toString() || '',
        encuelladorId: initialData.encuelladorId?.toString() || '',
        llaveroId: initialData.llaveroId?.toString() || '',
        cuneroId: initialData.cuneroId?.toString() || '',

        // Convertir números a string si es necesario para NumberInput (aunque generalmente aceptan números)
        tiempoTotalEstadia: initialData.tiempoTotalEstadia !== null ? parseFloat(initialData.tiempoTotalEstadia) : null,
        tiempoNoOperado: initialData.tiempoNoOperado !== null ? parseFloat(initialData.tiempoNoOperado) : 0,

        // Mapear 'descripcion' del form a 'notas' del modelo si ese es el caso
        notas: initialData.notas || '',
        // Si 'nombre' es un campo extra, asegúrate de que exista en initialData o pon un valor por defecto.
        nombre: initialData.nombre || `Operación para Renglón ${initialData.renglonContratoId || ''}`,
      });
    }
  }, [initialData]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cargar opciones para Selects (contratos y empleados)
  useEffect(() => {
    const fetchOptions = async () => {
      setLoadingOptions(true);
      setErrorOptions(null);
      try {
        // Fetch Contratos (ahora para renglones si es que necesitas el Select de contrato,
        // pero el modelo usa renglonContratoId, no contratoId directamente en la OperacionCampo)
        // Si tu API de renglones devuelve el numeroContrato del contrato asociado, puedes usarlo para el label.
        // Pero el campo relevante aquí es `renglonContratoId`.
        const renglonesRes = await fetch(`/api/contratos/renglones`); // Asumiendo una API que lista todos los renglones
        if (!renglonesRes.ok) throw new Error('Error al cargar renglones de contrato.');
        const renglonesData = await renglonesRes.json();
        // Mapea los renglones para el Select. Aquí asumimos que los renglones tienen 'id' y 'nombreRenglon'
        // Si quieres mostrar también el contrato asociado, necesitarías que tu API de renglones lo incluya.
        setContratos(renglonesData.map(r => ({ 
          value: r.id.toString(), 
          label: `${r.nombreRenglon} (Contrato: ${r.contrato?.numeroContrato || 'N/A'})` 
        })));

        // Fetch Empleados para los selects de asignación de personal
        const empleadosRes = await fetch(`/api/rrhh/empleados`); // Asume que tienes una API para obtener empleados
        if (!empleadosRes.ok) throw new Error('Error al cargar empleados.');
        const empleadosData = await empleadosRes.json();
        console.log(empleadosData);
        
        // Mapea los empleados para los Selects. Asume que tienen 'id' y 'nombreCompleto'
        setEmpleados(empleadosData.map(e => e.nombre + " " + e.apellido));

      } catch (err) {
        console.error('Error loading form options:', err);
        setErrorOptions(err);
        notifications.show({
          title: 'Error de Carga',
          message: 'No se pudieron cargar las opciones de contratos/empleados.',
          color: 'red',
        });
      } finally {
        setLoadingOptions(false);
      }
    };

    fetchOptions();
  }, []);

  const handleSubmit = async (values) => {
    // Construir el payload según tu modelo OperacionCampo
    const payload = {
      renglonContratoId: parseInt(values.renglonContratoId),
      fechaInicio: values.fechaInicio ? values.fechaInicio.toISOString().split('T')[0] : null,
      fechaFinEstimada: values.fechaFinEstimada ? values.fechaFinEstimada.toISOString().split('T')[0] : null,
      fechaFinReal: values.fechaFinReal ? values.fechaFinReal.toISOString().split('T')[0] : null,
      tiempoTotalEstadia: values.tiempoTotalEstadia !== '' ? parseFloat(values.tiempoTotalEstadia) : null,
      tiempoNoOperado: values.tiempoNoOperado !== '' ? parseFloat(values.tiempoNoOperado) : 0,
      motivoNoOperado: values.motivoNoOperado || null,
      
      supervisorId: values.supervisorId ? parseInt(values.supervisorId) : null,
      mecanicoId: values.mecanicoId ? parseInt(values.mecanicoId) : null,
      montacargistaId: values.montacargistaId ? parseInt(values.montacargistaId) : null,
      perforadorId: values.perforadorId ? parseInt(values.perforadorId) : null,
      encuelladorId: values.encuelladorId ? parseInt(values.encuelladorId) : null,
      llaveroId: values.llaveroId ? parseInt(values.llaveroId) : null,
      cuneroId: values.cuneroId ? parseInt(values.cuneroId) : null,
      
      notas: values.notas || null,

      // Si 'nombre', 'estado' y 'tipoOperacion' son campos que no están en tu modelo de Prisma,
      // debes decidir si los omites del payload o si los estás usando para alguna lógica de UI
      // y no para persistencia directa en la tabla OperacionCampo.
      // Si son para la UI o para enviar a otra parte, déjalos. Si no, considera quitarlos.
      // Por ahora los comentaré para alinearme al modelo:
      // nombre: values.nombre, 
      // estado: values.estado,
      // tipoOperacion: values.tipoOperacion,
    };
    
    // Eliminar propiedades con valor null o vacío si tu backend prefiere que no se envíen
    // Object.keys(payload).forEach(key => {
    //   if (payload[key] === null || payload[key] === '') {
    //     delete payload[key];
    //   }
    // });

    console.log("Payload a enviar:", payload);

    let response;
    let url = '/api/contratos/operaciones-campo';
    let method = 'POST';
    let successMessage = 'Operación registrada exitosamente';
    let errorMessage = 'Error al registrar operación';

    if (isEditing) { 
      url = `/api/contratos/operaciones-campo/${initialData.id}`;
      method = 'PUT';
      successMessage = 'Operación actualizada exitosamente';
      errorMessage = 'Error al actualizar operación';
    }

    try {
      response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || response.statusText);
      }

      notifications.show({
        title: 'Éxito',
        message: successMessage,
        color: 'green',
      });
      router.push('/superuser/operaciones-campo'); 
    } catch (error) {
      console.error(errorMessage, error);
      notifications.show({
        title: 'Error',
        message: `${errorMessage}: ${error.message}`,
        color: 'red',
      });
    }
  };

  if (loadingOptions) {
    return (
      <Container size="xl" py="xl">
        <Center style={{ height: '300px' }}>
          <Loader size="lg" />
          <Text ml="md">Cargando opciones de contratos y empleados...</Text>
        </Center>
      </Container>
    );
  }

  if (errorOptions) {
    return (
      <Container size="xl" py="xl">
        <Center style={{ height: '300px' }}>
          <Text c="red">Error al cargar opciones: {errorOptions.message}</Text>
        </Center>
      </Container>
    );
  }

  return (
    <Box maw={800} mx="auto">
      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <Title order={2} ta="center" mb="lg">
          {isEditing ? 'Editar Operación de Campo' : 'Registrar Nueva Operación de Campo'}
        </Title>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Grid gutter="md">
            {/* Campo para el 'nombre' descriptivo (no en el modelo directamente, pero útil para la UI) */}
            <Grid.Col span={{ base: 12, md: 6 }}>
              <TextInput
                label="Nombre Descriptivo / Código de Operación"
                placeholder="Ej. Operación Taladro #123"
                {...form.getInputProps('nombre')}
              />
            </Grid.Col>

            {/* Renglón Contrato ID (ahora se selecciona un renglón, no un contrato directamente) */}
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Select
                label="Servicio/Fase (Renglón de Contrato)"
                placeholder="Selecciona un servicio/fase"
                data={contratos} // Ahora 'contratos' son en realidad 'renglones'
                searchable
                {...form.getInputProps('renglonContratoId')}
                disabled={isEditing} // No permitir cambiar el renglón si es edición
              />
            </Grid.Col>
            
            {/* Fechas */}
            <Grid.Col span={{ base: 12, md: 6 }}>
              <DateInput
                label="Fecha de Inicio"
                placeholder="Selecciona la fecha de inicio"
                valueFormat="DD/MM/YYYY"
                {...form.getInputProps('fechaInicio')}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <DateInput
                label="Fecha Fin Estimada"
                placeholder="Selecciona la fecha de fin estimada"
                valueFormat="DD/MM/YYYY"
                {...form.getInputProps('fechaFinEstimada')}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <DateInput
                label="Fecha Fin Real"
                placeholder="Selecciona la fecha de fin real (si finalizada)"
                valueFormat="DD/MM/YYYY"
                {...form.getInputProps('fechaFinReal')}
              />
            </Grid.Col>

            {/* Tiempos */}
            <Grid.Col span={{ base: 12, md: 6 }}>
              <NumberInput
                label="Tiempo Total Estadia (días/horas)"
                placeholder="Ej. 15.5"
                precision={2}
                min={0}
                {...form.getInputProps('tiempoTotalEstadia')}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <NumberInput
                label="Tiempo No Operado (horas)"
                placeholder="Ej. 2.0"
                precision={2}
                min={0}
                {...form.getInputProps('tiempoNoOperado')}
              />
            </Grid.Col>
            <Grid.Col span={12}>
              <Textarea
                label="Motivo Tiempo No Operado"
                placeholder="Detalla las razones por el tiempo no operado"
                {...form.getInputProps('motivoNoOperado')}
                rows={2}
              />
            </Grid.Col>

            {/* Asignaciones de Personal */}
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Select
                label="Supervisor Asignado"
                placeholder="Selecciona un supervisor"
                data={empleados}
                searchable
                clearable
                {...form.getInputProps('supervisorId')}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Select
                label="Mecánico Asignado"
                placeholder="Selecciona un mecánico"
                data={empleados}
                searchable
                clearable
                {...form.getInputProps('mecanicoId')}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Select
                label="Montacargista Asignado"
                placeholder="Selecciona un montacargista"
                data={empleados}
                searchable
                clearable
                {...form.getInputProps('montacargistaId')}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Select
                label="Perforador Asignado"
                placeholder="Selecciona un perforador"
                data={empleados}
                searchable
                clearable
                {...form.getInputProps('perforadorId')}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Select
                label="Encuellador Asignado"
                placeholder="Selecciona un encuellador"
                data={empleados}
                searchable
                clearable
                {...form.getInputProps('encuelladorId')}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Select
                label="Llavero Asignado"
                placeholder="Selecciona un llavero"
                data={empleados}
                searchable
                clearable
                {...form.getInputProps('llaveroId')}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Select
                label="Cunero Asignado"
                placeholder="Selecciona un cunero"
                data={empleados}
                searchable
                clearable
                {...form.getInputProps('cuneroId')}
              />
            </Grid.Col>

            {/* Notas */}
            <Grid.Col span={12}>
              <Textarea
                label="Notas Adicionales"
                placeholder="Cualquier información relevante sobre la operación..."
                {...form.getInputProps('notas')}
                rows={3}
              />
            </Grid.Col>
          </Grid>

          <Group justify="flex-end" mt="xl">
            <Button variant="default" onClick={() => router.back()}>
              Cancelar
            </Button>
            <Button type="submit">
              {isEditing ? 'Actualizar Operación' : 'Registrar Operación'}
            </Button>
          </Group>
        </form>
      </Paper>
    </Box>
  );
}