// components/operaciones-campo/OperacionesCampoTable.jsx
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
    accessorKey: 'nombre', // O un identificador como 'numeroOperacion' si lo tienes
    header: 'Nombre/ID Operación',
    size: 200,
  },
  {
    accessorFn: (row) => row.contrato?.numeroContrato || 'N/A', // Asume que incluye el objeto contrato
    id: 'numeroContrato',
    header: 'Contrato Asociado',
    size: 150,
  },
  {
    accessorKey: 'fechaInicio',
    header: 'Fecha Inicio',
    size: 120,
    Cell: ({ cell }) => new Date(cell.getValue()).toLocaleDateString(),
  },
  {
    accessorKey: 'fechaFinEstimada',
    header: 'Fin Estimado',
    size: 120,
    Cell: ({ cell }) => (cell.getValue() ? new Date(cell.getValue()).toLocaleDateString() : 'N/A'),
  },
  {
    accessorKey: 'estado',
    header: 'Estado',
    size: 100,
  },
  {
    accessorKey: 'tipoOperacion', // Ej: "Transporte de Carga", "Mudanza", "Servicio a Domicilio"
    header: 'Tipo de Operación',
    size: 150,
  },
];

export function OperacionesCampoTable() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  const [selectedOperacion, setSelectedOperacion] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Importante: Tu API GET de operaciones debe incluir los datos del contrato
      // (ej. usando `include: { contrato: true }` en Prisma).
      const response = await fetch('/api/contratos/operaciones-campo');
      if (!response.ok) {
        throw new Error(`Error fetching data: ${response.statusText}`);
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Failed to fetch operaciones de campo:', err);
      setError(err);
      notifications.show({
        title: 'Error',
        message: 'No se pudieron cargar las operaciones de campo. Intenta de nuevo.',
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
    if (!selectedOperacion) return;
    try {
      const response = await fetch(`/api/contratos/operaciones-campo/${selectedOperacion.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(`Error deleting operacion: ${response.statusText}`);
      }
      notifications.show({
        title: 'Operación Eliminada',
        message: 'La operación ha sido eliminada exitosamente.',
        color: 'green',
      });
      fetchData(); // Recargar datos
    } catch (err) {
      console.error('Failed to delete operacion:', err);
      notifications.show({
        title: 'Error',
        message: `No se pudo eliminar la operación: ${err.message}`,
        color: 'red',
      });
    } finally {
      closeDeleteModal();
      setSelectedOperacion(null);
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
          onClick={() => router.push(`/superuser/operaciones-campo/${row.original.id}`)} // Ir a la página de detalle
        >
          Ver Detalles
        </Menu.Item>
        <Menu.Item
          leftSection={<IconEdit size={18} />}
          onClick={() => router.push(`/superuser/operaciones-campo/${row.original.id}/editar`)}
        >
          Editar Operación
        </Menu.Item>
        <Menu.Item
          leftSection={<IconTrash size={18} />}
          color="red"
          onClick={() => {
            setSelectedOperacion(row.original);
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
          onClick={() => router.push('/superuser/operaciones-campo/nuevo')}
          variant="filled"
          color="blue"
        >
          Registrar Nueva Operación
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
          ¿Estás seguro de que quieres eliminar la operación "
          <Text span fw={700} c="red">
            {selectedOperacion?.nombre || selectedOperacion?.id}
          </Text>
          " (Contrato: {selectedOperacion?.contrato?.numeroContrato || 'N/A'})? Esta acción no se puede deshacer.
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