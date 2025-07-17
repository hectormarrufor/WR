// components/inventario/ConsumiblesTable.jsx
'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { MantineReactTable, useMantineReactTable } from 'mantine-react-table';
import { Button, Box, Flex, Tooltip, ActionIcon, Text, Menu, Modal, Badge } from '@mantine/core';
import { IconEdit, IconTrash, IconEye, IconPlus, IconRefresh, IconAlertTriangle } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useDisclosure } from '@mantine/hooks';
import { useRouter } from 'next/navigation';

const getColumns = () => [
  {
    accessorKey: 'nombre',
    header: 'Nombre Consumible',
    size: 200,
  },
  {
    accessorKey: 'unidadMedida',
    header: 'Unidad de Medida',
    size: 120,
  },
  {
    accessorKey: 'stockActual',
    header: 'Stock Actual',
    size: 120,
    Cell: ({ cell, row }) => (
      <Flex align="center" gap="xs">
        <Text>{parseFloat(cell.getValue()).toFixed(2)}</Text>
        {parseFloat(row.original.stockActual) <= parseFloat(row.original.stockMinimo) && (
          <Tooltip label="Stock bajo" color="red">
            <IconAlertTriangle size={18} color="red" />
          </Tooltip>
        )}
      </Flex>
    ),
  },
  {
    accessorKey: 'stockMinimo',
    header: 'Stock Mínimo',
    size: 120,
    Cell: ({ cell }) => parseFloat(cell.getValue()).toFixed(2),
  },
  {
    accessorKey: 'ubicacionAlmacen',
    header: 'Ubicación',
    size: 150,
  },
  {
    accessorKey: 'precioUnitarioPromedio',
    header: 'Precio Promedio ($)',
    size: 120,
    Cell: ({ cell }) => `$${parseFloat(cell.getValue()).toFixed(2)}`,
  },
];

export function ConsumiblesTable() {
  const router = useRouter();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  const [selectedConsumible, setSelectedConsumible] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/inventario/consumibles'); // API para obtener consumibles
      if (!response.ok) {
        throw new Error(`Error fetching data: ${response.statusText}`);
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Failed to fetch consumibles:', err);
      setError(err);
      notifications.show({
        title: 'Error',
        message: 'No se pudieron cargar los consumibles. Intenta de nuevo.',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDeleteConsumible = async () => {
    if (!selectedConsumible) return;
    try {
      const response = await fetch(`/api/inventario/consumibles/${selectedConsumible.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || response.statusText);
      }
      notifications.show({
        title: 'Consumible Eliminado',
        message: 'El consumible ha sido eliminado exitosamente.',
        color: 'green',
      });
      fetchData();
    } catch (err) {
      console.error('Failed to delete consumible:', err);
      notifications.show({
        title: 'Error',
        message: `No se pudo eliminar el consumible: ${err.message}`,
        color: 'red',
      });
    } finally {
      closeDeleteModal();
      setSelectedConsumible(null);
    }
  };

  const columns = useMemo(() => getColumns(), []);

  const table = useMantineReactTable({
    columns,
    data,
    state: { isLoading: loading, showAlertBanner: !!error },
    mantineToolbarAlertBannerProps: error
      ? { color: 'red', children: `Error al cargar los datos: ${error.message}` }
      : undefined,
    enableRowActions: true,
    renderRowActionMenuItems: ({ row }) => (
      <Menu control={<ActionIcon variant="light" size="md" aria-label="Acciones"><IconEye size={18} /></ActionIcon>}>
        <Menu.Item
          leftSection={<IconEdit size={18} />}
          onClick={() => router.push(`/superuser/inventario/consumibles/${row.original.id}/editar`)}
        >
          Editar
        </Menu.Item>
        <Menu.Item
          leftSection={<IconTrash size={18} />}
          color="red"
          onClick={() => {
            setSelectedConsumible(row.original);
            openDeleteModal();
          }}
        >
          Eliminar
        </Menu.Item>
      </Menu>
    ),
    renderTopToolbarCustomActions: () => (
      <Flex gap="md">
        <Button
          leftSection={<IconPlus size={20} />}
          onClick={() => router.push('/superuser/inventario/consumibles/nuevo')}
          variant="filled"
          color="blue"
        >
          Nuevo Consumible
        </Button>
        <Tooltip label="Refrescar Datos">
          <ActionIcon onClick={fetchData} variant="light" size="lg" aria-label="Refrescar">
            <IconRefresh size={24} />
          </ActionIcon>
        </Tooltip>
      </Flex>
    ),
    initialState: {
      density: 'xs',
      pagination: { pageSize: 10, pageIndex: 0 },
    },
    mantineTableContainerProps: {
      style: { minHeight: '400px' },
    },
  });

  return (
    <>
      <MantineReactTable table={table} />

      <Modal opened={deleteModalOpened} onClose={closeDeleteModal} title="Confirmar Eliminación" centered>
        <Text>
          ¿Estás seguro de que quieres eliminar el consumible "
          <Text span fw={700} c="red">
            {selectedConsumible?.nombre}
          </Text>
          "? Esta acción no se puede deshacer.
        </Text>
        <Flex justify="flex-end" gap="md" mt="md">
          <Button variant="default" onClick={closeDeleteModal}>
            Cancelar
          </Button>
          <Button color="red" onClick={handleDeleteConsumible}>
            Eliminar Consumible
          </Button>
        </Flex>
      </Modal>
    </>
  );
}