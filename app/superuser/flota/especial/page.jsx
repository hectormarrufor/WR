// app/superuser/flota/especial/page.jsx
'use client';

import { MantineReactTable, useMantineReactTable } from 'mantine-react-table';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { ActionIcon, Box, Button, Flex, Text, Tooltip, Title, Group, Paper, Center, Loader } from '@mantine/core';
import { IconEdit, IconTrash, IconEye, IconPlus, IconTruckLoading } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';
import { httpGet, httpPost } from '../../../ApiFunctions/httpServices';
import DeleteModal from '../../DeleteModal';
import { SectionBox } from '../../../components/SectionBox';
import { SectionTitle } from '../../../components/SectionTitle';

export default function EquiposEspecialesPage() {
  const [equiposEspeciales, setEquiposEspeciales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const router = useRouter();

  const fetchEquiposEspeciales = useCallback(async () => {
    setLoading(true);
    try {
      // Necesitarás crear este endpoint API en app/api/equiposEspeciales/route.js
      const data = await httpGet('/api/equiposEspeciales');
      setEquiposEspeciales(data);
    } catch (err) {
      setError('Error al cargar equipos especiales.');
      notifications.show({
        title: 'Error',
        message: 'No se pudieron cargar los equipos especiales.',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEquiposEspeciales();
  }, [fetchEquiposEspeciales]);

  const handleDelete = useCallback(async () => {
    if (selectedItemId) {
      setIsDeleting(true);
      try {
        // Necesitarás crear este endpoint API en app/api/equiposEspeciales/[id]/route.js
        await httpDelete(`/api/equiposEspeciales/${selectedItemId}`);
        notifications.show({
          title: 'Eliminado',
          message: 'Equipo especial eliminado exitosamente.',
          color: 'green',
        });
        fetchEquiposEspeciales(); // Volver a cargar la lista
      } catch (err) {
        notifications.show({
          title: 'Error',
          message: 'No se pudo eliminar el equipo especial.',
          color: 'red',
        });
      } finally {
        setIsDeleting(false);
        setDeleteModalOpened(false);
        setSelectedItemId(null);
      }
    }
  }, [selectedItemId, fetchEquiposEspeciales]);

  const openDeleteModal = (id) => {
    setSelectedItemId(id);
    setDeleteModalOpened(true);
  };

  const columns = useMemo(() => [
    {
      accessorKey: 'nombre',
      header: 'Nombre/Identificador',
      size: 150,
    },
    {
      accessorKey: 'tipoEquipoEspecial',
      header: 'Tipo de Equipo',
      size: 150,
      filterVariant: 'select',
      // Aquí puedes cargar dinámicamente los tipos si los tienes en un endpoint
      // filterSelectOptions: ['Coiled Tubing', 'Snubbing', 'Wireline', 'Taladro', 'Cementacion', 'Fractura'],
    },
    {
      accessorKey: 'numeroSerie',
      header: 'Número de Serie',
      size: 120,
    },
    {
      accessorKey: 'fabricante',
      header: 'Fabricante',
      size: 120,
    },
    {
      accessorKey: 'modelo',
      header: 'Modelo',
      size: 120,
    },
    {
      accessorKey: 'horometroActual',
      header: 'Horómetro Actual',
      size: 100,
      Cell: ({ cell }) => `${cell.getValue()} horas`,
    },
    {
      accessorKey: 'estadoOperativoGeneral',
      header: 'Estado Operativo',
      size: 120,
      filterVariant: 'select',
      // filterSelectOptions: ['Operativo', 'No Operativo', 'En Taller', 'Inactivo'],
      Cell: ({ cell }) => (
        <Badge
          color={
            cell.getValue() === 'Operativo' ? 'green' :
            cell.getValue() === 'Operativo con Advertencias' ? 'yellow' :
            cell.getValue() === 'No Operativo' ? 'red' :
            cell.getValue() === 'En Taller' ? 'blue' :
            'gray'
          }
        >
          {cell.getValue()}
        </Badge>
      ),
    },
    {
      accessorKey: 'ubicacionActual',
      header: 'Ubicación Actual',
      size: 150,
    },
  ], []);

  const table = useMantineReactTable({
    columns,
    data: equiposEspeciales,
    enableColumnFilterModes: true,
    enableColumnOrdering: true,
    enableFacetedValues: true,
    enableGrouping: true,
    enablePagination: true,
    enableSorting: true,
    enableBottomToolbar: true,
    enableStickyHeader: true,
    enableRowActions: true, // Habilitar acciones por fila
    manualFiltering: false, // Usar filtrado del lado del cliente
    manualPagination: false, // Usar paginación del lado del cliente
    manualSorting: false, // Usar ordenamiento del lado del cliente
    initialState: { showColumnFilters: false, showGlobalFilter: true, pagination: { pageSize: 10, pageIndex: 0 } },
    mantinePaginationProps: {
      rowsPerPageOptions: ['5', '10', '25', '50', '100'],
    },
    positionToolbarAlertActions: 'bottom',
    renderTopToolbarCustomActions: ({ table }) => (
      <Flex p="md" justify="flex-end" align="center" style={{ width: '100%' }}>
        <Button
          leftSection={<IconPlus size={20} />}
          onClick={() => router.push('/superuser/flota/especial/crear')} // Lleva a la página de selección de tipo
          variant="filled"
          color="blue"
        >
          Añadir Equipo Especial
        </Button>
      </Flex>
    ),
    renderRowActions: ({ row }) => (
      <Flex gap="md">
        <Tooltip label="Ver Detalles">
          <ActionIcon onClick={() => router.push(`/superuser/flota/especial/${row.original.id}`)}>
            <IconEye size={20} />
          </ActionIcon>
        </Tooltip>
        {/*
        <Tooltip label="Editar">
          <ActionIcon onClick={() => router.push(`/superuser/flota/especial/${row.original.id}/editar`)}>
            <IconEdit size={20} />
          </ActionIcon>
        </Tooltip>
        */}
        <Tooltip label="Eliminar">
          <ActionIcon color="red" onClick={() => openDeleteModal(row.original.id)}>
            <IconTrash size={20} />
          </ActionIcon>
        </Tooltip>
      </Flex>
    ),
  });

  if (loading) {
    return (
      <Center style={{ height: 'calc(100vh - 120px)' }}>
        <Loader size="lg" />
        <Text ml="md">Cargando equipos especiales...</Text>
      </Center>
    );
  }

  if (error) {
    return (
      <Center style={{ height: 'calc(100vh - 120px)' }}>
        <Text color="red">{error}</Text>
      </Center>
    );
  }

  return (
    <SectionBox>
      <SectionTitle
        title="Gestión de Equipos Especiales"
        description="Aquí puedes visualizar y gestionar todos los equipos especiales de tu flota."
        icon={IconTruckLoading}
      />
      <Paper shadow="sm" p="md" withBorder>
        <MantineReactTable table={table} />
      </Paper>
      <DeleteModal
        opened={deleteModalOpened}
        onClose={() => setDeleteModalOpened(false)}
        onConfirm={handleDelete}
        itemType="Equipo Especial"
      />
    </SectionBox>
  );
}