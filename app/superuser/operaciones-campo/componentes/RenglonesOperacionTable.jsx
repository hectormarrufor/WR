// components/operaciones-campo/RenglonesOperacionTable.jsx
'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { MantineReactTable, useMantineReactTable } from 'mantine-react-table';
import { Button, Box, Flex, Tooltip, ActionIcon, Text, Menu, Modal, Badge } from '@mantine/core';
import { IconEdit, IconTrash, IconEye, IconPlus, IconRefresh } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useDisclosure } from '@mantine/hooks';
import { RenglonOperacionForm } from './RenglonesOperacionForm';
// Definición de las columnas de la tabla
const getColumns = () => [
  {
    accessorKey: 'descripcion',
    header: 'Descripción del Renglón',
    size: 300,
  },
  {
    accessorKey: 'cantidad',
    header: 'Cantidad',
    size: 100,
  },
  {
    accessorKey: 'unidadMedida',
    header: 'Unidad',
    size: 100,
  },
  {
    accessorKey: 'precioUnitario',
    header: 'Precio Unitario',
    size: 120,
    Cell: ({ cell }) => `$${parseFloat(cell.getValue()).toFixed(2)}`,
  },
  {
    accessorKey: 'subtotal', // Puedes calcularlo en el frontend o traerlo del backend
    header: 'Subtotal',
    size: 120,
    Cell: ({ row }) => {
      const cantidad = parseFloat(row.original.cantidad);
      const precioUnitario = parseFloat(row.original.precioUnitario);
      const subtotal = isNaN(cantidad) || isNaN(precioUnitario) ? 0 : cantidad * precioUnitario;
      return `$${subtotal.toFixed(2)}`;
    },
  },
  {
    accessorKey: 'estado',
    header: 'Estado',
    size: 100,
    Cell: ({ cell }) => (
      <Badge color={
        cell.getValue() === 'Pendiente' ? 'orange' :
        cell.getValue() === 'En Progreso' ? 'blue' :
        cell.getValue() === 'Completado' ? 'green' :
        'gray'
      }>
        {cell.getValue()}
      </Badge>
    ),
  },
];

export function RenglonesOperacionTable({ operacionId }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [formModalOpened, { open: openFormModal, close: closeFormModal }] = useDisclosure(false);
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  const [selectedRenglon, setSelectedRenglon] = useState(null); // Para editar o eliminar

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // API para obtener renglones de una operación específica
      const response = await fetch(`/api/contratos/operaciones-campo/${operacionId}/renglones`);
      if (!response.ok) {
        throw new Error(`Error fetching data: ${response.statusText}`);
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Failed to fetch renglones de operacion:', err);
      setError(err);
      notifications.show({
        title: 'Error',
        message: 'No se pudieron cargar los renglones de la operación. Intenta de nuevo.',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  }, [operacionId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveRenglon = () => {
    closeFormModal();
    setSelectedRenglon(null);
    fetchData(); // Recargar datos después de guardar
  };

  const handleDeleteRenglon = async () => {
    if (!selectedRenglon) return;
    try {
      const response = await fetch(`/api/contratos/operaciones-campo/${operacionId}/renglones/${selectedRenglon.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(`Error deleting renglon: ${response.statusText}`);
      }
      notifications.show({
        title: 'Renglón Eliminado',
        message: 'El renglón ha sido eliminado exitosamente.',
        color: 'green',
      });
      fetchData(); // Recargar datos
    } catch (err) {
      console.error('Failed to delete renglon:', err);
      notifications.show({
        title: 'Error',
        message: `No se pudo eliminar el renglón: ${err.message}`,
        color: 'red',
      });
    } finally {
      closeDeleteModal();
      setSelectedRenglon(null);
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
          onClick={() => {
            setSelectedRenglon(row.original);
            openFormModal();
          }}
        >
          Editar
        </Menu.Item>
        <Menu.Item
          leftSection={<IconTrash size={18} />}
          color="red"
          onClick={() => {
            setSelectedRenglon(row.original);
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
          onClick={() => {
            setSelectedRenglon(null); // Para asegurar que es un nuevo renglón
            openFormModal();
          }}
          variant="filled"
          color="blue"
        >
          Agregar Nuevo Renglón
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

      {/* Modal para el formulario de Renglón de Operación */}
      <Modal opened={formModalOpened} onClose={closeFormModal} title={selectedRenglon ? "Editar Renglón de Operación" : "Agregar Nuevo Renglón"} centered size="lg">
        <RenglonOperacionForm
          operacionId={operacionId}
          initialData={selectedRenglon}
          onSuccess={handleSaveRenglon}
          onCancel={closeFormModal}
        />
      </Modal>

      {/* Modal de confirmación de eliminación */}
      <Modal opened={deleteModalOpened} onClose={closeDeleteModal} title="Confirmar Eliminación" centered>
        <Text>
          ¿Estás seguro de que quieres eliminar el renglón "
          <Text span fw={700} c="red">
            {selectedRenglon?.descripcion}
          </Text>
          "?
        </Text>
        <Flex justify="flex-end" gap="md" mt="md">
          <Button variant="default" onClick={closeDeleteModal}>
            Cancelar
          </Button>
          <Button color="red" onClick={handleDeleteRenglon}>
            Eliminar
          </Button>
        </Flex>
      </Modal>
    </>
  );
}