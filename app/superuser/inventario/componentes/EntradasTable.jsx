// components/inventario/EntradasTable.jsx
'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { MantineReactTable, useMantineReactTable } from 'mantine-react-table';
import { Button, Box, Flex, Tooltip, ActionIcon, Text, Menu, Modal } from '@mantine/core';
import { IconEdit, IconTrash, IconEye, IconPlus, IconRefresh } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useDisclosure } from '@mantine/hooks';
import { useRouter } from 'next/navigation';

const getColumns = () => [
  {
    accessorKey: 'consumible.nombre', // Asume que el consumible viene incluido
    header: 'Consumible',
    size: 200,
    Cell: ({ row }) => row.original.consumible?.nombre || 'N/A',
  },
  {
    accessorKey: 'cantidad',
    header: 'Cantidad',
    size: 100,
    Cell: ({ cell }) => parseFloat(cell.getValue()).toFixed(2),
  },
  {
    accessorKey: 'fechaEntrada',
    header: 'Fecha Entrada',
    size: 120,
    Cell: ({ cell }) => new Date(cell.getValue()).toLocaleDateString(),
  },
  {
    accessorKey: 'ordenCompra.numeroOrden', // Asume que la orden de compra viene incluida
    header: 'Orden Compra',
    size: 150,
    Cell: ({ row }) => row.original.ordenCompra ? `OC-${row.original.ordenCompra.numeroOrden}` : 'N/A',
  },
  {
    accessorKey: 'recibidoPor.nombre', // Asume que el empleado viene incluido
    header: 'Recibido Por',
    size: 150,
    Cell: ({ row }) => row.original.recibidoPor ? `${row.original.recibidoPor.nombre} ${row.original.recibidoPor.apellido}` : 'N/A',
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

export function EntradasTable() {
  const router = useRouter();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  const [selectedEntrada, setSelectedEntrada] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/superuser/inventario/entradas'); // API para obtener todas las entradas
      if (!response.ok) {
        throw new Error(`Error fetching data: ${response.statusText}`);
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Failed to fetch entradas:', err);
      setError(err);
      notifications.show({
        title: 'Error',
        message: 'No se pudieron cargar las entradas de inventario. Intenta de nuevo.',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDeleteEntrada = async () => {
    if (!selectedEntrada) return;
    try {
      const response = await fetch(`/api/superuser/inventario/entradas/${selectedEntrada.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || response.statusText);
      }
      notifications.show({
        title: 'Entrada Eliminada',
        message: 'La entrada ha sido eliminada exitosamente. El stock del consumible ha sido ajustado.',
        color: 'green',
      });
      fetchData(); // Recargar datos
    } catch (err) {
      console.error('Failed to delete entrada:', err);
      notifications.show({
        title: 'Error',
        message: `No se pudo eliminar la entrada: ${err.message}`,
        color: 'red',
      });
    } finally {
      closeDeleteModal();
      setSelectedEntrada(null);
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
          onClick={() => router.push(`/superuser/inventario/entradas/${row.original.id}/editar`)}
        >
          Ver/Editar (Campos Auxiliares)
        </Menu.Item>
        <Menu.Item
          leftSection={<IconTrash size={18} />}
          color="red"
          onClick={() => {
            setSelectedEntrada(row.original);
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
          onClick={() => router.push('/superuser/inventario/entradas/nueva')}
          variant="filled"
          color="blue"
        >
          Registrar Nueva Entrada
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
          ¿Estás seguro de que quieres eliminar la entrada del consumible "
          <Text span fw={700} c="red">
            {selectedEntrada?.consumible?.nombre}
          </Text>
          " por la cantidad de "
          <Text span fw={700} c="red">
            {parseFloat(selectedEntrada?.cantidad).toFixed(2)}
          </Text>
          " del "
          <Text span fw={700} c="red">
            {selectedEntrada?.fechaEntrada ? new Date(selectedEntrada.fechaEntrada).toLocaleDateString() : 'N/A'}
          </Text>
          "?
          <br />
          **¡Advertencia!** Esto revertirá el stock del consumible. Esta acción no se puede deshacer.
        </Text>
        <Flex justify="flex-end" gap="md" mt="md">
          <Button variant="default" onClick={closeDeleteModal}>
            Cancelar
          </Button>
          <Button color="red" onClick={handleDeleteEntrada}>
            Eliminar Entrada
          </Button>
        </Flex>
      </Modal>
    </>
  );
}