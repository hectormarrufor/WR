'use client';

import React, { useState, useEffect } from 'react';
import { Table, Title, Button, Group, Badge, Text, Container, Paper, Loader, Center, ActionIcon, Menu } from '@mantine/core';
import { IconEye, IconPlus, IconTruck, IconTool } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { notifications } from '@mantine/notifications';
import Link from 'next/link';

// Componente para el badge de tipo de activo, para una mejor visualización
const TipoActivoBadge = ({ tipo }) => {
  const color = tipo === 'Vehículo' ? 'blue' : 'orange';
  return <Badge color={color} variant="light" size="sm">{tipo}</Badge>;
};

export default function InventarioActivosPage() {
  const router = useRouter();
  const [activos, setActivos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivos = async () => {
      try {
        const response = await fetch('/api/activos');
        if (!response.ok) throw new Error('Error al cargar el inventario de activos.');
        const data = await response.json();
        setActivos(data);
      } catch (error) {
        notifications.show({ title: 'Error', message: error.message, color: 'red' });
      } finally {
        setLoading(false);
      }
    };
    fetchActivos();
  }, []);

  const rows = activos.map((activo) => (
    <Table.Tr key={`${activo.tipo}-${activo.id}`}>
      <Table.Td>
        <TipoActivoBadge tipo={activo.tipo} />
      </Table.Td>
      <Table.Td>
        <Text fw={500}>{activo.identificador}</Text>
      </Table.Td>
      <Table.Td>
        <Text>{activo.descripcion}</Text>
        <Text size="xs" c="dimmed">{activo.subtipo}</Text>
      </Table.Td>
      <Table.Td>
        {/* Futuro campo para mostrar a qué Unidad Operativa está asignado */}
        <Text c="dimmed">N/A</Text> 
      </Table.Td>
      <Table.Td>
        <Badge color={activo.estado === 'Operativo' ? 'green' : 'gray'} variant="filled">
          {activo.estado}
        </Badge>
      </Table.Td>
      <Table.Td>
        <ActionIcon component={Link} href={activo.urlDetalle} variant="light" color="blue" title="Ver Detalles e Historial">
          <IconEye size={18} />
        </ActionIcon>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Container size="xl" my="xl">
      <Paper withBorder shadow="md" p="lg" radius="md">
        <Group justify="space-between" mb="lg">
          <Title order={2}>Inventario General de Activos</Title>
          
          <Menu shadow="md" width={280}>
            <Menu.Target>
              <Button leftSection={<IconPlus size={18} />}>
                Registrar Activo
              </Button>
            </Menu.Target>

            <Menu.Dropdown>
              <Menu.Label>Selecciona el tipo de activo</Menu.Label>
              <Menu.Item
                leftSection={<IconTruck size={16} />}
                component={Link}
                href="/superuser/flota/activos/vehiculos/crear"
              >
                Vehículo
              </Menu.Item>
              <Menu.Item
                leftSection={<IconTool size={16} />}
                component={Link}
                href="/superuser/flota/activos/componentes/crear"
              >
                Componente Mayor
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>

        {loading ? (
          <Center h={300}><Loader /></Center>
        ) : (
          <Table.ScrollContainer minWidth={800}>
            <Table striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Tipo de Activo</Table.Th>
                  <Table.Th>Identificador (Placa/Serial)</Table.Th>
                  <Table.Th>Descripción (Marca/Modelo)</Table.Th>
                  <Table.Th>Asignado a Unidad</Table.Th>
                  <Table.Th>Estado</Table.Th>
                  <Table.Th>Acciones</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rows.length > 0 ? rows : (
                  <Table.Tr>
                    <Table.Td colSpan={6}>
                      <Text c="dimmed" ta="center" py="xl">No hay activos registrados en el inventario.</Text>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Paper>
    </Container>
  );
}