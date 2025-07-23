'use client';

import React, { useState, useEffect } from 'react';
import { Container, Paper, Title, Grid, Text, Loader, Center, Alert, Badge, Group, Button, Box, Divider, Tree, ThemeIcon, rem, ScrollArea } from '@mantine/core';
import { IconAlertCircle, IconArrowLeft, IconPencil, IconAdjustments, IconFileText, IconHash } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import classes from './detalle.module.css'; // Crearemos este archivo CSS para estilos adicionales

// Componente para el color del badge según el estado
const EstadoBadge = ({ estado }) => {
  const color = {
    'Operativo': 'green',
    'Operativo con Advertencias': 'yellow',
    'No Operativo': 'red',
    'En Taller': 'blue',
    'Inactivo': 'gray',
  }[estado];
  return <Badge color={color} size="lg" radius="sm">{estado}</Badge>;
};

// --- NUEVO Y MEJORADO VISUALIZADOR DE JSON ---
const EnhancedJsonViewer = ({ data }) => {
  // Función recursiva que convierte el objeto JSON al formato que el componente Tree necesita
  const buildTreeData = (jsonData) => {
    if (!jsonData || typeof jsonData !== 'object') return [];

    return Object.entries(jsonData).map(([key, value]) => {
      const nodeId = `${key}-${Math.random()}`;
      
      // Si el valor es otro objeto, creamos una rama del árbol
      if (typeof value === 'object' && value !== null) {
        return {
          value: nodeId,
          label: <Text fw={500} tt="capitalize">{key}</Text>,
          icon: <ThemeIcon variant="light" size={24}><IconAdjustments size={16} /></ThemeIcon>,
          children: buildTreeData(value),
        };
      }
      
      // Si el valor es un dato simple, creamos una hoja
      return {
        value: nodeId,
        label: (
          <Group justify="space-between" grow>
            <Text tt="capitalize">{key}</Text>
            <Text c="dimmed" size="sm" ta="right">{value.toString()}</Text>
          </Group>
        ),
        icon: <ThemeIcon variant="light" color="gray" size={24}>
                {typeof value === 'number' ? <IconHash size={16} /> : <IconFileText size={16} />}
              </ThemeIcon>,
      };
    });
  };

  const treeData = buildTreeData(data);

  if (treeData.length === 0) {
    return <Text c="dimmed" ta="center" mt="xl">No hay especificaciones detalladas.</Text>;
  }

  return (
    <ScrollArea h={400}>
      <Tree
        data={treeData}
        className={classes.tree}
      />
    </ScrollArea>
  );
};


export default function DetalleEquipoEspecialPage({ params }) {
  const { id } = params;
  const router = useRouter();
  const [equipo, setEquipo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;
    const fetchEquipo = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/equiposEspeciales/${id}`);
        if (!response.ok) {
          throw new Error(response.status === 404 ? 'Equipo no encontrado' : 'Error al cargar los datos');
        }
        const data = await response.json();
        setEquipo(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchEquipo();
  }, [id]);

  if (loading) return <Center h="80vh"><Loader size="lg" /></Center>;
  if (error) return (
    <Container>
      <Center h="80vh">
        <Alert icon={<IconAlertCircle size="1rem" />} title="Error" color="red">
          {error}. <Link href="/superuser/flota/especial">Volver a la lista.</Link>
        </Alert>
      </Center>
    </Container>
  );
  if (!equipo) return null;

  return (
    <Container size="lg" my="xl">
      <Paper withBorder shadow="md" p="xl" radius="md">
        <Group justify="space-between" mb="lg">
          <Box>
            <Title order={2}>{equipo.identificativo}</Title>
            <Text c="dimmed" tt="capitalize">{equipo.marca} {equipo.modelo}</Text>
          </Box>
          <Group>
            <Button variant="default" onClick={() => router.back()} leftSection={<IconArrowLeft size={16} />}>Volver</Button>
            <Button variant="light" leftSection={<IconPencil size={16} />}>Editar</Button>
          </Group>
        </Group>
        
        <Divider my="md" />

        <Grid gutter="xl">
          <Grid.Col span={{ base: 12, md: 5 }}>
            <Title order={4} mb="md">Datos Generales</Title>
            <Group grow direction="column" gap="xs">
                <Group justify="space-between"><Text fw={700}>Tipo de Equipo:</Text><Text tt="capitalize">{equipo.tipoEquipo?.nombre}</Text></Group>
                <Group justify="space-between"><Text fw={700}>Placa:</Text><Text>{equipo.placa || 'N/A'}</Text></Group>
                <Group justify="space-between"><Text fw={700}>Kilometraje:</Text><Text>{equipo.kilometraje.toLocaleString('es-VE')} km</Text></Group>
                <Group justify="space-between"><Text fw={700}>Horómetro:</Text><Text>{equipo.horometro.toLocaleString('es-VE')} h</Text></Group>
                <Group justify="space-between" mt="sm"><Text fw={700}>Estado Operativo:</Text><EstadoBadge estado={equipo.estadoOperativoGeneral} /></Group>
            </Group>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 7 }}>
            <Title order={4} mb="md">Ficha Técnica / Especificaciones</Title>
            <Paper withBorder p="md" radius="sm" bg="var(--mantine-color-gray-0)">
                <EnhancedJsonViewer data={equipo.fichaTecnica?.especificaciones} />
            </Paper>
          </Grid.Col>
        </Grid>
      </Paper>
    </Container>
  );
}