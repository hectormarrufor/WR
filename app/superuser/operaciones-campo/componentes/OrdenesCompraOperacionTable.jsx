// components/operaciones-campo/OrdenesCompraOperacionTable.jsx
'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { MantineReactTable, useMantineReactTable } from 'mantine-react-table';
import { Button, Box, Flex, Tooltip, ActionIcon, Text, Menu, Modal, Badge } from '@mantine/core';
import { IconEdit, IconTrash, IconEye, IconPlus, IconRefresh } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useDisclosure } from '@mantine/hooks';
import { OrdenCompraOperacionForm } from './OrdenesCompraOperacionForm';

// Definición de las columnas de la tabla
const getColumns = () => [
  {
    accessorKey: 'ordenCompra.numeroOrden', // Asume que incluye el objeto ordenCompra
    header: 'Número de OC',
    size: 150,
  },
  {
    accessorKey: 'ordenCompra.proveedor.nombre', // Asume que incluye el proveedor de la OC
    header: 'Proveedor',
    size: 200,
  },
  {
    accessorKey: 'ordenCompra.fechaEmision',
    header: 'Fecha Emisión',
    size: 150,
    Cell: ({ cell }) => new Date(cell.getValue()).toLocaleDateString(),
  },
  {
    accessorKey: 'ordenCompra.montoTotal',
    header: 'Monto Total',
    size: 120,
    Cell: ({ cell }) => `$${parseFloat(cell.getValue()).toFixed(2)}`,
  },
  {
    accessorKey: 'ordenCompra.estado', // Ej: 'Pendiente', 'Aprobada', 'Recibida', 'Cerrada'
    header: 'Estado OC',
    size: 100,
    Cell: ({ cell }) => (
      <Badge color={
        cell.getValue() === 'Aprobada' ? 'green' :
        cell.getValue() === 'Pendiente' ? 'orange' :
        cell.getValue() === 'Cerrada' ? 'blue' :
        'gray'
      }>
        {cell.getValue()}
      </Badge>
    ),
  },
  {
    accessorKey: 'notas', // Notas específicas de la vinculación a la operación
    header: 'Notas de Vinculación',
    size: 250,
  },
];

export function OrdenesCompraOperacionTable({ operacionId }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [formModalOpened, { open: openFormModal, close: closeFormModal }] = useDisclosure(false);
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  const [selectedOcOperacion, setSelectedOcOperacion] = useState(null); // Para editar o eliminar la vinculación

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // API para obtener órdenes de compra vinculadas a una operación específica
      // Asegúrate de que esta API incluya los datos de la OrdenCompra y su Proveedor
      const response = await fetch(`/api/superuser/operaciones-campo/${operacionId}/ordenes-compra`);
      if (!response.ok) {
        throw new Error(`Error fetching data: ${response.statusText}`);
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Failed to fetch ordenes de compra operacion:', err);
      setError(err);
      notifications.show({
        title: 'Error',
        message: 'No se pudieron cargar las órdenes de compra asociadas. Intenta de nuevo.',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  }, [operacionId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveOcOperacion = () => {
    closeFormModal();
    setSelectedOcOperacion(null);
    fetchData(); // Recargar datos después de guardar
  };

  const handleDeleteOcOperacion = async () => {
    if (!selectedOcOperacion) return;
    try {
      const response = await fetch(`/api/superuser/operaciones-campo/${operacionId}/ordenes-compra/${selectedOcOperacion.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(`Error deleting oc operacion: ${response.statusText}`);
      }
      notifications.show({
        title: 'Vinculación Eliminada',
        message: 'La orden de compra ha sido desvinculada exitosamente.',
        color: 'green',
      });
      fetchData(); // Recargar datos
    } catch (err) {
      console.error('Failed to delete oc operacion:', err);
      notifications.show({
        title: 'Error',
        message: `No se pudo desvincular la orden de compra: ${err.message}`,
        color: 'red',
      });
    } finally {
      closeDeleteModal();
      setSelectedOcOperacion(null);
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
        {/* Aquí podrías añadir una opción para "Ver Detalle de OC" si tienes una página para OCs */}
        {/* <Menu.Item
          leftSection={<IconEye size={18} />}
          onClick={() => router.push(`/superuser/ordenes-compra/${row.original.ordenCompra.id}`)}
        >
          Ver Detalle OC
        </Menu.Item> */}
        <Menu.Item
          leftSection={<IconEdit size={18} />}
          onClick={() => {
            setSelectedOcOperacion(row.original);
            openFormModal();
          }}
        >
          Editar Vinculación
        </Menu.Item>
        <Menu.Item
          leftSection={<IconTrash size={18} />}
          color="red"
          onClick={() => {
            setSelectedOcOperacion(row.original);
            openDeleteModal();
          }}
        >
          Desvincular
        </Menu.Item>
      </Menu>
    ),
    renderTopToolbarCustomActions: () => (
      <Flex gap="md">
        <Button
          leftSection={<IconPlus size={20} />}
          onClick={() => {
            setSelectedOcOperacion(null); // Para asegurar que es una nueva vinculación
            openFormModal();
          }}
          variant="filled"
          color="blue"
        >
          Asociar Orden de Compra
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
      pagination: { pageSize: 5, pageIndex: 0 },
    },
    mantineTableContainerProps: {
      style: { minHeight: '200px' },
    },
  });

  return (
    <>
      <MantineReactTable table={table} />

      {/* Modal para el formulario de Vinculación de OC */}
      <Modal opened={formModalOpened} onClose={closeFormModal} title={selectedOcOperacion ? "Editar Vinculación de OC" : "Asociar Orden de Compra"} centered size="lg">
        <OrdenCompraOperacionForm
          operacionId={operacionId}
          initialData={selectedOcOperacion}
          onSuccess={handleSaveOcOperacion}
          onCancel={closeFormModal}
        />
      </Modal>

      {/* Modal de confirmación de eliminación */}
      <Modal opened={deleteModalOpened} onClose={closeDeleteModal} title="Confirmar Desvinculación" centered>
        <Text>
          ¿Estás seguro de que quieres desvincular la Orden de Compra "
          <Text span fw={700} c="red">
            {selectedOcOperacion?.ordenCompra?.numeroOrden}
          </Text>
          " de esta operación?
        </Text>
        <Flex justify="flex-end" gap="md" mt="md">
          <Button variant="default" onClick={closeDeleteModal}>
            Cancelar
          </Button>
          <Button color="red" onClick={handleDeleteOcOperacion}>
            Desvincular
          </Button>
        </Flex>
      </Modal>
    </>
  );
}