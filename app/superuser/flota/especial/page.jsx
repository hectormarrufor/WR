'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Table, Title, Button, Group, Badge, Text, Container, Paper, Loader, Center, ActionIcon, TextInput, UnstyledButton } from '@mantine/core';
import { IconPlus, IconEye, IconPencil, IconTrash, IconSearch, IconChevronUp, IconChevronDown, IconSelector } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { notifications } from '@mantine/notifications';
import Link from 'next/link';
import _ from 'lodash'; // Usaremos lodash para un ordenamiento más robusto

// Componente para el color del badge según el estado
const EstadoBadge = ({ estado }) => {
  const color = {
    'Operativo': 'green',
    'Operativo con Advertencias': 'yellow',
    'No Operativo': 'red',
    'En Taller': 'blue',
    'Inactivo': 'gray',
  }[estado];
  return <Badge color={color} variant="light">{estado}</Badge>;
};

export default function FlotaEspecialPage() {
  const router = useRouter();
  const [allEquipos, setAllEquipos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados para ordenamiento y filtrado
  const [filters, setFilters] = useState({});
  const [sortConfig, setSortConfig] = useState({ key: 'identificativo', direction: 'asc' });

  // Función para obtener los datos iniciales
  const fetchEquipos = async () => {
    try {
      const response = await fetch('/api/equiposEspeciales');
      if (!response.ok) throw new Error('Error al cargar los datos de la flota especial.');
      const data = await response.json();
      setAllEquipos(data);
    } catch (error) {
      notifications.show({ title: 'Error', message: error.message, color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEquipos();
  }, []);

  // Función para manejar cambios en los filtros
  const handleFilterChange = (column, value) => {
    setFilters(prev => ({ ...prev, [column]: value }));
  };

  // Función para manejar el ordenamiento
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Lógica para procesar los datos (filtrar y ordenar)
  const processedData = useMemo(() => {
    let filtered = [...allEquipos];

    // Aplicar filtros
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        filtered = filtered.filter(item => 
          _.get(item, key, '').toString().toLowerCase().includes(value.toLowerCase())
        );
      }
    });

    // Aplicar ordenamiento
    if (sortConfig.key) {
      filtered = _.orderBy(filtered, [sortConfig.key], [sortConfig.direction]);
    }

    return filtered;
  }, [allEquipos, filters, sortConfig]);

  // Componente para las cabeceras de la tabla
  const SortableTh = ({ children, columnKey }) => {
    const Icon = sortConfig.key === columnKey 
      ? (sortConfig.direction === 'asc' ? IconChevronUp : IconChevronDown) 
      : IconSelector;
    
    return (
      <Table.Th>
        <UnstyledButton onClick={() => handleSort(columnKey)}>
          <Group gap="xs">
            <Text fw={700} size="sm">{children}</Text>
            <Icon size={16} />
          </Group>
        </UnstyledButton>
      </Table.Th>
    );
  };
  
  const rows = processedData.map((equipo) => (
    <Table.Tr key={equipo.id}>
      <Table.Td>{equipo.identificativo}</Table.Td>
      <Table.Td>{equipo.marca}</Table.Td>
      <Table.Td>{equipo.modelo}</Table.Td>
      <Table.Td><Text tt="capitalize">{equipo.tipoEquipo?.nombre || 'N/A'}</Text></Table.Td>
      <Table.Td>{equipo.placa || 'N/A'}</Table.Td>
      <Table.Td>{equipo.kilometraje.toLocaleString('es-VE')} km</Table.Td>
      <Table.Td>{equipo.horometro.toLocaleString('es-VE')} h</Table.Td>
      <Table.Td><EstadoBadge estado={equipo.estadoOperativoGeneral} /></Table.Td>
      <Table.Td>
        <Group gap="xs">
          <ActionIcon variant="subtle" color="blue" title="Ver Detalles" onClick={() => router.push(`/superuser/flota/especial/${equipo.id}`)}><IconEye size={18} /></ActionIcon>
          <ActionIcon variant="subtle" color="yellow" title="Editar" onClick={() => router.push(`/superuser/flota/especial/${equipo.id}`)}><IconPencil size={18} /></ActionIcon>
          <ActionIcon variant="subtle" color="red" title="Eliminar"><IconTrash size={18} /></ActionIcon>
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Container size="xl" my="xl">
      <Paper withBorder shadow="md" p="lg" radius="md" mt={60}>
        <Group justify="space-between" mb="lg">
          <Title order={2}>Gestión de Flota Especial</Title>
          <Button component={Link} href="/superuser/flota/especial/crear" leftSection={<IconPlus size={18} />}>
            Registrar Nuevo Equipo
          </Button>
        </Group>

        {loading ? (
          <Center h={200}><Loader /></Center>
        ) : (
          <Table.ScrollContainer minWidth={900}>
            <Table striped highlightOnHover withTableBorder withColumnBorders>
              <Table.Thead>
                <Table.Tr>
                  <SortableTh columnKey="identificativo">Identificativo</SortableTh>
                  <SortableTh columnKey="marca">Marca</SortableTh>
                  <SortableTh columnKey="modelo">Modelo</SortableTh>
                  <SortableTh columnKey="tipoEquipo.nombre">Tipo de Equipo</SortableTh>
                  <SortableTh columnKey="placa">Placa</SortableTh>
                  <SortableTh columnKey="kilometraje">Kilometraje</SortableTh>
                  <SortableTh columnKey="horometro">Horómetro</SortableTh>
                  <SortableTh columnKey="estadoOperativoGeneral">Estado</SortableTh>
                  <Table.Th>Acciones</Table.Th>
                </Table.Tr>
                {/* --- FILA DE FILTROS --- */}
                <Table.Tr>
                  <Table.Th><TextInput placeholder="Filtrar..." onChange={(e) => handleFilterChange('identificativo', e.target.value)} /></Table.Th>
                  <Table.Th><TextInput placeholder="Filtrar..." onChange={(e) => handleFilterChange('marca', e.target.value)} /></Table.Th>
                  <Table.Th><TextInput placeholder="Filtrar..." onChange={(e) => handleFilterChange('modelo', e.target.value)} /></Table.Th>
                  <Table.Th><TextInput placeholder="Filtrar..." onChange={(e) => handleFilterChange('tipoEquipo.nombre', e.target.value)} /></Table.Th>
                  <Table.Th><TextInput placeholder="Filtrar..." onChange={(e) => handleFilterChange('placa', e.target.value)} /></Table.Th>
                  <Table.Th><TextInput type="number" placeholder="Filtrar..." onChange={(e) => handleFilterChange('kilometraje', e.target.value)} /></Table.Th>
                  <Table.Th><TextInput type="number" placeholder="Filtrar..." onChange={(e) => handleFilterChange('horometro', e.target.value)} /></Table.Th>
                  <Table.Th><TextInput placeholder="Filtrar..." onChange={(e) => handleFilterChange('estadoOperativoGeneral', e.target.value)} /></Table.Th>
                  <Table.Th></Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rows.length > 0 ? rows : (
                  <Table.Tr>
                    <Table.Td colSpan={9}>
                      <Text c="dimmed" ta="center" py="xl">No se encontraron equipos que coincidan con los filtros.</Text>
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