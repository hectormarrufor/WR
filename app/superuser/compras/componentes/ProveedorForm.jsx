// components/gestion/ProveedorForm.jsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { TextInput, Button, Group, Box, Textarea, Loader, Center, Title, Text, Divider } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';

export function ProveedorForm({ proveedorId = null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    initialValues: {
      nombre: '',
      razonSocial: '',
      rif: '',
      direccion: '',
      telefono: '',
      email: '',
      personaContacto: '',
      telefonoContacto: '',
      emailContacto: '',
      notas: '',
    },
    validate: {
      nombre: (value) => (value ? null : 'El nombre es requerido'),
      rif: (value) => (value ? null : 'El RIF es requerido'),
      telefono: (value) => (value ? null : 'El teléfono es requerido'),
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Email inválido')
    },
  });

  const fetchProveedor = useCallback(async () => {
    if (!proveedorId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`/api/compras/proveedores/${proveedorId}`);
      if (!response.ok) {
        throw new Error('Proveedor no encontrado');
      }
      const data = await response.json();
      form.setValues(data);
    } catch (err) {
      notifications.show({
        title: 'Error de Carga',
        message: `No se pudo cargar el proveedor: ${err.message}`,
        color: 'red',
      });
      router.push('/superuser/gestion/proveedores'); // Redirigir si no se encuentra
    } finally {
      setLoading(false);
    }
  }, [proveedorId, router]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchProveedor();
  }, [fetchProveedor]);

  const handleSubmit = async (values) => {
    setIsSubmitting(true);
    let response;
    let url = '/api/compras/proveedores';
    let method = 'POST';
    let successMessage = 'Proveedor registrado exitosamente.';
    let errorMessage = 'Error al registrar proveedor.';

    if (proveedorId) {
      url = `/api/compras/proveedores/${proveedorId}`;
      method = 'PUT';
      successMessage = 'Proveedor actualizado exitosamente.';
      errorMessage = 'Error al actualizar proveedor.';
    }

    try {
      response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || response.statusText);
      }

      notifications.show({
        title: 'Éxito',
        message: successMessage,
        color: 'green',
      });
      router.push('/superuser/gestion/proveedores');
    } catch (error) {
      console.error(errorMessage, error);
      notifications.show({
        title: 'Error',
        message: `${errorMessage}: ${error.message}`,
        color: 'red',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Center style={{ height: '400px' }}>
        <Loader size="lg" />
        <Text ml="md">Cargando datos del proveedor...</Text>
      </Center>
    );
  }

  return (
    <Box maw={600} mx="auto" py="md">
      <Title order={2} mb="lg">{proveedorId ? 'Editar Proveedor' : 'Registrar Nuevo Proveedor'}</Title>
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <TextInput
          label="Nombre Comercial"
          placeholder="Nombre del proveedor"
          {...form.getInputProps('nombre')}
          mb="md"
        />
        <TextInput
          label="Razón Social"
          placeholder="Razón social (opcional)"
          {...form.getInputProps('razonSocial')}
          mb="md"
        />
        <TextInput
          label="RIF"
          placeholder="J-12345678-9"
          {...form.getInputProps('rif')}
          mb="md"
        />
        <TextInput
          label="Teléfono Principal"
          placeholder="Ej: +58 412 1234567"
          {...form.getInputProps('telefono')}
          mb="md"
        />
        <TextInput
          label="Email Principal"
          placeholder="correo@proveedor.com"
          {...form.getInputProps('email')}
          mb="md"
        />
        <Textarea
          label="Dirección"
          placeholder="Dirección completa del proveedor"
          {...form.getInputProps('direccion')}
          rows={3}
          mb="md"
        />
        <Divider my="lg" label="Contacto Secundario (Opcional)" labelPosition="center" />
        <TextInput
          label="Persona de Contacto"
          placeholder="Nombre del contacto"
          {...form.getInputProps('personaContacto')}
          mb="md"
        />
        <TextInput
          label="Teléfono de Contacto"
          placeholder="Teléfono directo del contacto"
          {...form.getInputProps('telefonoContacto')}
          mb="md"
        />
        <TextInput
          label="Email de Contacto"
          placeholder="email.contacto@proveedor.com"
          {...form.getInputProps('emailContacto')}
          mb="md"
        />
        <Textarea
          label="Notas Adicionales"
          placeholder="Cualquier nota relevante sobre el proveedor"
          {...form.getInputProps('notas')}
          rows={3}
          mb="md"
        />

        <Group justify="flex-end" mt="xl">
          <Button variant="default" onClick={() => router.push('/superuser/gestion/proveedores')}>
            Cancelar
          </Button>
          <Button type="submit" loading={isSubmitting} disabled={isSubmitting || (proveedorId && !form.isDirty())}>
            {proveedorId ? 'Actualizar Proveedor' : 'Registrar Proveedor'}
          </Button>
        </Group>
      </form>
    </Box>
  );
}