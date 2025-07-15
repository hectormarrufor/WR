// components/compras/RecepcionesCompraTable.jsx
'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { MantineReactTable, useMantineReactTable } from 'mantine-react-table';
import { Button, Box, Flex, Tooltip, ActionIcon, Text, Menu, Modal, Badge } from '@mantine/core';
import { IconTrash, IconEye, IconPlus, IconRefresh } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useDisclosure } from '@mantine/hooks';
import { useRouter } from 'next/navigation';

const getEstadoColor = (estado) => {
  switch (estado) {
    case 'Parcial': return 'yellow';
    case 'Completa': return 'green';
    default: return 'gray';
  }
};

const getColumns = () => [
  {
    accessorKey: 'ordenCompra.numeroOrden',
    header: 'Nº OC',
    size: 100,
    Cell: ({ row }) => row.original.ordenCompra?.numeroOrden || 'N/A',
  },
  {
    accessorKey: 'ordenCompra.proveedor.nombre',
    header: 'Proveedor',
    size: 180,
    Cell: ({ row }) => row.original.ordenCompra?.proveedor?.nombre || 'N/A',
  },
  {
    accessorKey: 'fechaRecepcion',
    header: 'Fecha Recepción',
    size: 120,
    Cell: ({ cell }) => new Date(cell.getValue()).toLocaleDateString(),
  },
  {
    accessorKey: 'numeroGuia',
    header: 'Nº Guía',
    size: 120,
  },
  {
    accessorKey: 'estadoRecepcion',
    header: 'Estado Recepción',
    size: 120,
    Cell: ({ cell }) => (
      <Badge color={getEstadoColor(cell.getValue())} variant="light">
        {cell.getValue()}
      </Badge>
    ),
  },
  {
    accessorKey: 'recibidaPor.nombre',
    header: 'Recibida Por',
    size: 150,
    Cell: ({ row }) => row.original.recibidaPor ? `${row.original.recibidaPor.nombre} ${row.original.recibidaPor.apellido}` : 'N/A',
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

export function RecepcionesCompraTable() {
  const router = useRouter();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  const [selectedRecepcion, setSelectedRecepcion] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/superuser/compras/recepciones-compra');
      if (!response.ok) {
        throw new Error(`Error fetching data: ${response.statusText}`);
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Failed to fetch recepciones de compra:', err);
      setError(err);
      notifications.show({
        title: 'Error',
        message: 'No se pudieron cargar las recepciones de compra. Intenta de nuevo.',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDeleteRecepcion = async () => {
    if (!selectedRecepcion) return;
    try {
      const response = await fetch(`/api/superuser/compras/recepciones-compra/${selectedRecepcion.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || response.statusText);
      }
      notifications.show({
        title: 'Recepción Eliminada',
        message: 'La recepción de compra ha sido eliminada y el stock revertido.',
        color: 'green',
      });
      fetchData(); // Recargar datos
    } catch (err) {
      console.error('Failed to delete recepción de compra:', err);
      notifications.show({
        title: 'Error',
        message: `No se pudo eliminar la recepción de compra: ${err.message}`,
        color: 'red',
      });
    } finally {
      closeDeleteModal();
      setSelectedRecepcion(null);
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
          onClick={() => router.push(`/superuser/compras/recepciones-compra/${row.original.id}`)}
        >
          Ver Detalles
        </Menu.Item>
        {/* No hay botón de edición ya que PUT no está implementado para recepciones */}
        <Menu.Item
          leftSection={<IconTrash size={18} />}
          color="red"
          onClick={() => {
            setSelectedRecepcion(row.original);
            openDeleteModal();
          }}
        >
          Eliminar y Revertir Stock
        </Menu.Item>
      </Menu>
    ),
    renderTopToolbarCustomActions: () => (
      <Flex gap="md">
        <Button
          leftSection={<IconPlus size={20} />}
          onClick={() => router.push('/superuser/compras/recepciones-compra/nueva')}
          variant="filled"
          color="blue"
        >
          Registrar Nueva Recepción
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
      <Modal opened={deleteModalOpened} onClose={closeDeleteModal} title="Confirmar Eliminación y Reversión de Stock" centered>
        <Text>
          ¿Estás seguro de que quieres eliminar esta Recepción de Compra (Guía Nº{" "}
          <Text span fw={700} c="red">
            {selectedRecepcion?.numeroGuia || 'N/A'}
          </Text>
          {" "}de la OC Nº{" "}
          <Text span fw={700} c="red">
            {selectedRecepcion?.ordenCompra?.numeroOrden}
          </Text>
          )?
          <br />
          Esta acción **revertirá los cambios en el inventario** asociados a esta recepción.
        </Text>
        <Flex justify="flex-end" gap="md" mt="md">
          <Button variant="default" onClick={closeDeleteModal}>
            Cancelar
          </Button>
          <Button color="red" onClick={handleDeleteRecepcion}>
            Eliminar y Revertir
          </Button>
        </Flex>
      </Modal>
    </>
  );
}