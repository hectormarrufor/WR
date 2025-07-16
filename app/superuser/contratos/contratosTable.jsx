// components/contratos/ContratosTable.jsx
'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { MantineReactTable, useMantineReactTable } from 'mantine-react-table';
import { Button, Box, Flex, Tooltip, ActionIcon, Text, Menu, Modal } from '@mantine/core';
import { IconEdit, IconTrash, IconEye, IconPlus, IconRefresh } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useDisclosure } from '@mantine/hooks';
import { useRouter } from 'next/navigation';

// Definición de las columnas de la tabla
const getColumns = () => [
  {
    accessorKey: 'numeroContrato',
    header: 'Nº Contrato',
    size: 150,
  },
  {
    accessorKey: 'cliente.nombreCompleto',
    header: 'Cliente',
    size: 150,
  },
  // {
  //   accessorFn: (row) => `${row.cliente?.nombre} ${row.cliente?.apellido || ''}`, // Asume que incluye el objeto cliente
  //   id: 'nombreCliente',
  //   header: 'Cliente',
  //   size: 200,
  // },
  {
    accessorKey: 'fechaInicio',
    header: 'Fecha Inicio',
    size: 120,
    Cell: ({ cell }) => new Date(cell.getValue()).toLocaleDateString(),
  },
  {
    accessorKey: 'fechaFin',
    header: 'Fecha Fin',
    size: 120,
    Cell: ({ cell }) => (cell.getValue() ? new Date(cell.getValue()).toLocaleDateString() : 'N/A'),
  },
  {
    accessorKey: 'montoTotal',
    header: 'Monto Total',
    size: 120,
    Cell: ({ cell }) => `$${parseFloat(cell.getValue()).toFixed(2)}`,
  },
  {
    accessorKey: 'descripcion',
    header: 'Descripción',
    size: 250,
  },
  {
    accessorKey: 'activo',
    header: 'Activo',
    size: 80,
    Cell: ({ cell }) => (cell.getValue() ? 'Sí' : 'No'),
  },
  {
    accessorKey: 'estado',
    header: 'Estado',
    size: 100,
  },
];

export function ContratosTable() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  const [selectedContrato, setSelectedContrato] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Tu API GET de contratos debe incluir el objeto Cliente relacionado (ej. con Prisma `include: { cliente: true }`)
      const response = await fetch('/api/operaciones/contratos');
      if (!response.ok) {
        throw new Error(`Error fetching data: ${response.statusText}`);
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Failed to fetch contratos:', err);
      setError(err);
      notifications.show({
        title: 'Error',
        message: 'No se pudieron cargar los contratos. Intenta de nuevo.',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async () => {
    if (!selectedContrato) return;
    try {
      const response = await fetch(`/api/operaciones/contratos/${selectedContrato.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(`Error deleting contrato: ${response.statusText}`);
      }
      notifications.show({
        title: 'Contrato Eliminado',
        message: 'El contrato ha sido eliminado exitosamente.',
        color: 'green',
      });
      fetchData(); // Recargar datos
    } catch (err) {
      console.error('Failed to delete contrato:', err);
      notifications.show({
        title: 'Error',
        message: `No se pudo eliminar el contrato: ${err.message}`,
        color: 'red',
      });
    } finally {
      closeDeleteModal();
      setSelectedContrato(null);
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
          onClick={() => router.push(`/superuser/contratos/${row.original.id}/editar`)}
        >
          Editar
        </Menu.Item>
        <Menu.Item
          leftSection={<IconTrash size={18} />}
          color="red"
          onClick={() => {
            setSelectedContrato(row.original);
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
          onClick={() => router.push('/superuser/contratos/nuevo')}
          variant="filled"
          color="blue"
        >
          Registrar Nuevo Contrato
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
          ¿Estás seguro de que quieres eliminar el contrato Nº "
          <Text span fw={700} c="red">
            {selectedContrato?.numeroContrato}
          </Text>
          " del cliente "
          <Text span fw={700} c="red">
            {selectedContrato?.cliente?.nombre} {selectedContrato?.cliente?.apellido}
          </Text>
          "? Esta acción no se puede deshacer.
        </Text>
        <Flex justify="flex-end" gap="md" mt="md">
          <Button variant="default" onClick={closeDeleteModal}>
            Cancelar
          </Button>
          <Button color="red" onClick={handleDelete}>
            Eliminar
          </Button>
        </Flex>
      </Modal>
    </>
  );
}