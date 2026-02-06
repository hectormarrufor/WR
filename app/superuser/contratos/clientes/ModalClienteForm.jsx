// components/clientes/ModalClienteForm.jsx (Actualizado)
'use client';

import React, { useEffect, useState } from 'react';
import {
  Modal, Button, Group, TextInput, Select, Textarea, Checkbox,
  Stack, Box, Title, Grid, Tooltip
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconUserPlus, IconId, IconBuildingFactory, IconPhone, IconMail, IconMapPin, IconNotes } from '@tabler/icons-react';
import ImageDropzone from '../../flota/activos/components/ImageDropzone';

// Se añade `children` como prop para que actúe como el disparador del modal
export function ModalClienteForm({ onClienteCreated, onClienteUpdated, onClose, opened, cliente = null }) {
  const [loading, setLoading] = useState(false);

  const form = useForm({
    initialValues: {
      identificacion: '',
      nombre: '',
      telefono: '',
      email: '',
      imagen: '',
      direccion: '',
      notas: '',
    },

    validate: {
      identificacion: (value) => (value ? null : 'Identificación es requerida'),
      nombre: (value) => (value ? null : 'Nombre es requerido'),
      email: (value) => (value && !/^\S+@\S+$/.test(value) ? 'Email inválido' : null),
    },
  });

  useEffect(() => {

    cliente ? form.setValues({
      identificacion: cliente.identificacion || '',
      imagen: cliente.imagen || '',
      nombre: cliente.nombre || '',
      telefono: cliente.telefono || '',
      email: cliente.email || '',
      direccion: cliente.direccion || '',
      notas: cliente.notas || '',
    }) : form.reset();
  }, [cliente]);


  const handleSubmit = async (values, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    let finalPayload = { ...values };
    setLoading(true);
    try {
      if (values.imagen && typeof values.imagen.arrayBuffer === 'function') {
        notifications.show({ id: 'uploading-image', title: 'Subiendo imagen...', message: 'Por favor espera.', loading: true });
        const imagenFile = values.imagen;
        const fileExtension = imagenFile.name.split('.').pop();
        const uniqueFilename = `${values.identificacion.replace(/\s+/g, '_')}.${fileExtension}`;

        const response = await fetch(`/api/upload?filename=${encodeURIComponent(uniqueFilename)}`, {
          method: 'POST',
          body: imagenFile,
        });

        if (!response.ok) console.log('Falló la subida de la imagen. Probablemente ya exista una con ese nombre.');
        const newBlob = await response.json();
        finalPayload.imagen = `${values.identificacion}.jpg`;
        notifications.update({ id: 'uploading-image', title: 'Éxito', message: 'Imagen subida.', color: 'green' });
      }

      const response = await fetch(cliente  ? `/api/contratos/clientes/${cliente.id}` : '/api/contratos/clientes', {
        method: cliente ? "PUT" : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(finalPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al crear el cliente');
      }

      const nuevoCliente = await response.json();
      notifications.show({
        title: 'Cliente Creado',
        message: `El cliente "${nuevoCliente.razonSocial || nuevoCliente.nombreCompleto}" ha sido creado exitosamente.`,
        color: 'green',
      });
      form.reset();
      if (onClienteCreated) {
        onClienteCreated(nuevoCliente); // Llama al callback si se proporciona
      }
      onClose();
    } catch (error) {
      console.error('Error al crear cliente:', error);
      notifications.show({
        title: 'Error',
        message: error.message || 'No se pudo crear el cliente.',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };




  return (
    <>
   
      <Modal opened={opened} onClose={onClose} title="Registrar Nuevo Cliente" size="lg" my={80} centered>
        <Box component="form" onSubmit={form.onSubmit((values, e) => handleSubmit(values, e))}>
          <Stack>
            <Grid>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <TextInput
                  label="Identificación"
                  placeholder="Ej. V-12345678, J-12345678-9"
                  required
                  leftSection={<IconId size={18} />}
                  {...form.getInputProps('identificacion')}
                />
              </Grid.Col>
              <Grid.Col span={12}>
                <ImageDropzone
                  label="Imagen del Cliente" form={form} fieldPath="imagen"
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <TextInput
                  label="Razón Social o nombre"
                  placeholder="Nombre de la empresa o cliente "
                  required
                  leftSection={<IconBuildingFactory size={18} />}
                  {...form.getInputProps('nombre')}
                />
              </Grid.Col>

              <Grid.Col span={{ base: 12, sm: 6 }}>
                <TextInput
                  label="Teléfono"
                  placeholder="Ej. +58 412 1234567"
                  leftSection={<IconPhone size={18} />}
                  {...form.getInputProps('telefono')}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <TextInput
                  label="Email"
                  placeholder="correo@ejemplo.com"
                  leftSection={<IconMail size={18} />}
                  {...form.getInputProps('email')}
                />
              </Grid.Col>
              <Grid.Col span={12}>
                <Textarea
                  label="Dirección"
                  placeholder="Dirección completa del cliente"
                  minRows={2}
                  leftSection={<IconMapPin size={18} />}
                  {...form.getInputProps('direccion')}
                />
              </Grid.Col>
              <Grid.Col span={12}>
                <Textarea
                  label="Notas Adicionales"
                  placeholder="Cualquier información adicional del cliente"
                  minRows={2}
                  leftSection={<IconNotes size={18} />}
                  {...form.getInputProps('notas')}
                />
              </Grid.Col>
            </Grid>
          </Stack>

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              Guardar Cliente
            </Button>
          </Group>
        </Box>
      </Modal>
    </>
  );
}