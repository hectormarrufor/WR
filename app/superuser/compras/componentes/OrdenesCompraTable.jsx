// components/compras/OrdenesCompraTable.jsx
'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { MantineReactTable, useMantineReactTable } from 'mantine-react-table';
import { Button, Box, Flex, Tooltip, ActionIcon, Text, Menu, Modal, Badge } from '@mantine/core';
import { IconEdit, IconTrash, IconEye, IconPlus, IconRefresh } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useDisclosure } from '@mantine/hooks';
import { useRouter } from 'next/navigation';

const getEstadoColor = (estado) => {
  switch (estado) {
    case 'Pendiente': return 'orange';
    case 'Aprobada': return 'blue';
    case 'Enviada': return 'cyan';
    case 'Recibida Parcial': return 'yellow';
    case 'Recibida Completa': return 'green';
    case 'Rechazada': return 'red';
    case 'Cancelada': return 'gray';
    default: return 'gray';
  }
};

const getColumns = () => [
  {
    accessorKey: 'numeroOrden',
    header: 'Nº Orden',
    size: 100,
  },
  {
    accessorKey: 'proveedor.nombre',
    header: 'Proveedor',
    size: 180,
    Cell: ({ row }) => row.original.proveedor?.nombre || 'N/A',
  },
  {
    accessorKey: 'fechaCreacion',
    header: 'Fecha Creación',
    size: 120,
    Cell: ({ cell }) => new Date(cell.getValue()).toLocaleDateString(),
  },
  {
    accessorKey: 'fechaRequerida',
    header: 'Fecha Requerida',
    size: 120,
    Cell: ({ cell }) => cell.getValue() ? new Date(cell.getValue()).toLocaleDateString() : 'N/A',
  },
  {
    accessorKey: 'totalEstimado',
    header: 'Total Estimado ($)',
    size: 120,
    Cell: ({ cell }) => `$${parseFloat(cell.getValue()).toFixed(2)}`,
  },
  {
    accessorKey: 'estado',
    header: 'Estado',
    size: 120,
    Cell: ({ cell }) => (
      <Badge color={getEstadoColor(cell.getValue())} variant="light">
        {cell.getValue()}
      </Badge>
    ),
  },
  {
    accessorKey: 'creadaPor.nombre',
    header: 'Creada Por',
    size: 150,
    Cell: ({ row }) => row.original.creadaPor ? `${row.original.creadaPor.nombre} ${row.original.creadaPor.apellido}` : 'N/A',
  },
  {
    accessorKey: 'notas',
    header: 'Notas',
    size: 200,
    enableColumnFilterModes: false,
    enableColumnActions: false,
    enableSorting: false,
  },
];

export function OrdenesCompraTable() {
  const router = useRouter();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  const [selectedOrdenCompra, setSelectedOrdenCompra] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/compras/ordenes-compra');
      if (!response.ok) {
        throw new Error(`Error fetching data: ${response.statusText}`);
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Failed to fetch ordenes de compra:', err);
      setError(err);
      notifications.show({
        title: 'Error',
        message: 'No se pudieron cargar las órdenes de compra. Intenta de nuevo.',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDeleteOrdenCompra = async () => {
    if (!selectedOrdenCompra) return;
    try {
      const response = await fetch(`/api/compras/ordenes-compra/${selectedOrdenCompra.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || response.statusText);
      }
      notifications.show({
        title: 'Orden de Compra Eliminada',
        message: 'La orden de compra ha sido eliminada exitosamente.',
        color: 'green',
      });
      fetchData(); // Recargar datos
    } catch (err) {
      console.error('Failed to delete orden de compra:', err);
      notifications.show({
        title: 'Error',
        message: `No se pudo eliminar la orden de compra: ${err.message}`,
        color: 'red',
      });
    } finally {
      closeDeleteModal();
      setSelectedOrdenCompra(null);
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
          leftSection={<IconEye size={18} />}
          onClick={() => router.push(`/superuser/compras/ordenes-compra/${row.original.id}`)}
        >
          Ver Detalles
        </Menu.Item>
        <Menu.Item
          leftSection={<IconEdit size={18} />}
          onClick={() => router.push(`/superuser/compras/ordenes-compra/${row.original.id}/editar`)}
        >
          Editar
        </Menu.Item>
        <Menu.Item
          leftSection={<IconTrash size={18} />}
          color="red"
          onClick={() => {
            setSelectedOrdenCompra(row.original);
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
          onClick={() => router.push('/superuser/compras/ordenes-compra/nueva')}
          variant="filled"
          color="blue"
        >
          Crear Nueva Orden de Compra
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

      {/* Modal de confirmación de eliminación */}
      <Modal opened={deleteModalOpened} onClose={closeDeleteModal} title="Confirmar Eliminación" centered>
        <Text>
          ¿Estás seguro de que quieres eliminar la Orden de Compra Nº "
          <Text span fw={700} c="red">
            {selectedOrdenCompra?.numeroOrden}
          </Text>
          " del proveedor "
          <Text span fw={700} c="red">
            {selectedOrdenCompra?.proveedor?.nombre}
          </Text>
          "?
          <br />
          Esta acción eliminará también todos sus detalles y no se puede deshacer.
        </Text>
        <Flex justify="flex-end" gap="md" mt="md">
          <Button variant="default" onClick={closeDeleteModal}>
            Cancelar
          </Button>
          <Button color="red" onClick={handleDeleteOrdenCompra}>
            Eliminar Orden de Compra
          </Button>
        </Flex>
      </Modal>
    </>
  );
}