// app/superuser/gestion/proveedores/[id]/page.js
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Title, Text, Paper, Group, Divider, Grid,
  ActionIcon, Tooltip, LoadingOverlay, Button, Center
} from '@mantine/core';
import { IconEdit, IconRefresh, IconAlertCircle } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';

export default function ProveedorDetailPage({ params }) {
  const { id } = params;
  const router = useRouter();
  const [proveedor, setProveedor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProveedorDetails = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/superuser/proveedores/${id}`);
      if (!response.ok) {
        throw new Error(`Error fetching proveedor: ${response.statusText}`);
      }
      const data = await response.json();
      setProveedor(data);
    } catch (err) {
      console.error('Failed to fetch proveedor details:', err);
      setError(err);
      notifications.show({
        title: 'Error',
        message: `No se pudo cargar el detalle del proveedor: ${err.message}`,
        color: 'red',
        icon: <IconAlertCircle />,
      });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProveedorDetails();
  }, [fetchProveedorDetails]);

  if (loading) {
    return (
      <Paper p="md" shadow="sm" radius="md" style={{ position: 'relative', minHeight: '300px' }}>
        <LoadingOverlay visible={loading} overlayProps={{ radius: "sm", blur: 2 }} />
        <Text align="center">Cargando detalles del proveedor...</Text>
      </Paper>
    );
  }

  if (error || !proveedor) {
    return (
      <Paper p="md" shadow="sm" radius="md">
        <Text color="red">Error al cargar el proveedor o no encontrado. {error?.message}</Text>
        <Button onClick={() => router.push('/superuser/gestion/proveedores')} mt="md">Volver al listado</Button>
      </Paper>
    );
  }

  return (
    <Box>
      <Group justify="space-between" mb="lg">
        <Title order={2}>Detalle de Proveedor: {proveedor.nombre}</Title>
        <Group>
          <Tooltip label="Editar Proveedor">
            <ActionIcon variant="light" size="lg" onClick={() => router.push(`/superuser/gestion/proveedores/${proveedor.id}/editar`)}>
              <IconEdit size={24} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Refrescar Datos">
            <ActionIcon variant="light" size="lg" onClick={fetchProveedorDetails}>
              <IconRefresh size={24} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      <Paper p="md" shadow="sm" radius="md" mb="lg">
        <Grid>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Text fw={700}>Nombre Comercial:</Text>
            <Text>{proveedor.nombre}</Text>
            <Text fw={700} mt="sm">Razón Social:</Text>
            <Text>{proveedor.razonSocial || 'N/A'}</Text>
            <Text fw={700} mt="sm">RIF:</Text>
            <Text>{proveedor.rif}</Text>
            <Text fw={700} mt="sm">Teléfono Principal:</Text>
            <Text>{proveedor.telefono}</Text>
            <Text fw={700} mt="sm">Email Principal:</Text>
            <Text>{proveedor.email || 'N/A'}</Text>
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Text fw={700}>Dirección:</Text>
            <Text>{proveedor.direccion || 'N/A'}</Text>
            <Divider my="sm" label="Contacto Secundario" labelPosition="center" />
            <Text fw={700}>Persona de Contacto:</Text>
            <Text>{proveedor.personaContacto || 'N/A'}</Text>
            <Text fw={700} mt="sm">Teléfono de Contacto:</Text>
            <Text>{proveedor.telefonoContacto || 'N/A'}</Text>
            <Text fw={700} mt="sm">Email de Contacto:</Text>
            <Text>{proveedor.emailContacto || 'N/A'}</Text>
            <Text fw={700} mt="sm">Notas:</Text>
            <Text>{proveedor.notas || 'Sin notas'}</Text>
          </Grid.Col>
        </Grid>
      </Paper>

      <Group justify="flex-start" mt="xl">
        <Button variant="default" onClick={() => router.push('/superuser/gestion/proveedores')}>
          Volver al Listado
        </Button>
      </Group>
    </Box>
  );
}