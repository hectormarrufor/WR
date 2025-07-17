// components/contratos/EditRenglonModal.jsx
import React, { useEffect } from 'react';
import { Modal, TextInput, Group, Button, Select, Grid, Text } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';

export function EditRenglonModal({ opened, onClose, renglon, onUpdate }) {
  const form = useForm({
    initialValues: {
      nombreRenglon: '',
      pozoNombre: '',
      ubicacionPozo: '',
      fechaInicioEstimada: null,
      fechaFinEstimada: null,
      estado: '',
    },
    validate: {
      nombreRenglon: (value) => (value ? null : 'El nombre del renglón es requerido'),
      pozoNombre: (value) => (value ? null : 'El nombre del pozo es requerido'),
      estado: (value) => (value ? null : 'El estado es requerido'),
    },
  });

  // Cargar los datos del renglón cuando el modal se abre o el renglón cambia
  useEffect(() => {
    if (renglon) {
      form.setValues({
        nombreRenglon: renglon.nombreRenglon || '',
        pozoNombre: renglon.pozoNombre || '',
        ubicacionPozo: renglon.ubicacionPozo || '',
        fechaInicioEstimada: renglon.fechaInicioEstimada ? new Date(renglon.fechaInicioEstimada) : null,
        fechaFinEstimada: renglon.fechaFinEstimada ? new Date(renglon.fechaFinEstimada) : null,
        estado: renglon.estado || '',
      });
    }
  }, [renglon]); // Dependencia del renglón y del objeto form

  const handleSubmit = async (values) => {
    if (!renglon || !renglon.id) {
      notifications.show({
        title: 'Error',
        message: 'No se puede actualizar el renglón: ID no encontrado.',
        color: 'red',
      });
      return;
    }

    const payload = {
      ...values,
      fechaInicioEstimada: values.fechaInicioEstimada ? values.fechaInicioEstimada.toISOString().split('T')[0] : null,
      fechaFinEstimada: values.fechaFinEstimada ? values.fechaFinEstimada.toISOString().split('T')[0] : null,
    };

    try {
      const response = await fetch(`/api/contratos/renglones/${renglon.id}`, {
        method: 'PUT',
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
        message: 'Renglón actualizado exitosamente',
        color: 'green',
      });
      onUpdate(); // Notificar al padre para que recargue los datos
    } catch (error) {
      console.error('Error al actualizar renglón:', error);
      notifications.show({
        title: 'Error',
        message: `Error al actualizar renglón: ${error.message}`,
        color: 'red',
      });
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title={`Editar Renglón: ${renglon?.nombreRenglon || ''}`} centered>
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Grid gutter="md">
          <Grid.Col span={12}>
            <TextInput
              label="Nombre del Renglón/Fase"
              placeholder="Ej: Instalación pozo X"
              required
              {...form.getInputProps('nombreRenglon')}
            />
          </Grid.Col>
          <Grid.Col span={12}>
            <TextInput
              label="Nombre del Pozo"
              placeholder="Ej: Pozo J-15"
              required
              {...form.getInputProps('pozoNombre')}
            />
          </Grid.Col>
          <Grid.Col span={12}>
            <TextInput
              label="Ubicación del Pozo"
              placeholder="Ej: Sector Las Mercedes"
              {...form.getInputProps('ubicacionPozo')}
            />
          </Grid.Col>
          <Grid.Col span={12}>
            <Select
              label="Estado de la Fase"
              placeholder="Selecciona el estado"
              data={['Pendiente', 'En Preparación', 'Mudanza', 'Operando', 'Finalizado', 'Pausado', 'Cancelado']}
              required
              {...form.getInputProps('estado')}
            />
          </Grid.Col>
          <Grid.Col span={12}>
            <DateInput
              label="Fecha Inicio Estimada"
              placeholder="Fecha estimada de inicio"
              valueFormat="DD/MM/YYYY"
              {...form.getInputProps('fechaInicioEstimada')}
            />
          </Grid.Col>
          <Grid.Col span={12}>
            <DateInput
              label="Fecha Fin Estimada"
              placeholder="Fecha estimada de fin"
              valueFormat="DD/MM/YYYY"
              {...form.getInputProps('fechaFinEstimada')}
            />
          </Grid.Col>
        </Grid>

        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">
            Guardar Cambios
          </Button>
        </Group>
      </form>
    </Modal>
  );
}