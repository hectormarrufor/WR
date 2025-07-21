// components/clientes/ModalCrearCliente.jsx (Actualizado)
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

// Se añade `children` como prop para que actúe como el disparador del modal
export function ModalCrearCliente({ onClienteCreado, children }) {
  const [opened, { open, close }] = useDisclosure(false);
  const [loading, setLoading] = useState(false);

  const form = useForm({
    initialValues: {
      rif: '',
      razonSocial: '',
      nombreContacto: '',
      apellidoContacto: '',
      telefono: '',
      email: '',
      direccion: '',
      notas: '',
    },

    validate: {
      rif: (value) => (value ? null : 'Identificación es requerida'),

      email: (value) => (value && !/^\S+@\S+$/.test(value) ? 'Email inválido' : null),
    },
  });

  useEffect(() => { 
    form.setValues({
      rif: 'J-12345678-9',
      razonSocial: 'PDVSA',
      nombreContacto: 'Jose',
      apellidoContacto: 'Perez',
      telefono: '04121234567',
      email: 'pdvsa@pdvsa.com',
      direccion: 'El Tigre',
      notas: '',
    })
  }, [])
  

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const response = await fetch('/api/contratos/clientes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
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
      close();
      if (onClienteCreado) {
        onClienteCreado(nuevoCliente); // Llama al callback si se proporciona
      }
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
      {/* El disparador del modal ahora se pasa como children */}
      {React.cloneElement(children, { onClick: open })}

      <Modal opened={opened} onClose={close} title="Registrar Nuevo Cliente" size="lg" my={80} centered>
        <Box component="form" onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <Grid>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <TextInput
                  label="Identificación"
                  placeholder="Ej. V-12345678, J-12345678-9"
                  required
                  leftSection={<IconId size={18} />}
                  {...form.getInputProps('rif')}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <TextInput
                  label="Razón Social"
                  placeholder="Nombre de la empresa"
                  required
                  leftSection={<IconBuildingFactory size={18} />}
                  {...form.getInputProps('razonSocial')}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <TextInput
                  label="Nombre de Representante"
                  placeholder="Nombre de la persona"
                  required
                  leftSection={<IconUserPlus size={18} />}
                  {...form.getInputProps('nombreContacto')}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <TextInput
                  label="Apellido de Representante"
                  placeholder="Apellido de la persona"
                  required
                  leftSection={<IconUserPlus size={18} />}
                  {...form.getInputProps('apellidoContacto')}
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
            <Button variant="default" onClick={close}>
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