// components/operaciones-campo/TrabajosExtraTable.jsx
'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { MantineReactTable, useMantineReactTable } from 'mantine-react-table';
import { Button, Box, Flex, Tooltip, ActionIcon, Text, Menu, Modal, Badge } from '@mantine/core';
import { IconEdit, IconTrash, IconEye, IconPlus, IconRefresh } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useDisclosure } from '@mantine/hooks';
import { TrabajoExtraForm } from './TrabajosExtraForm';

// Definición de las columnas de la tabla
const getColumns = () => [
  {
    accessorKey: 'descripcion',
    header: 'Descripción del Trabajo Extra',
    size: 300,
  },
  {
    accessorKey: 'fechaRealizacion',
    header: 'Fecha Realización',
    size: 150,
    Cell: ({ cell }) => new Date(cell.getValue()).toLocaleDateString(),
  },
  {
    accessorKey: 'costoEstimado',
    header: 'Costo Estimado',
    size: 120,
    Cell: ({ cell }) => `$${parseFloat(cell.getValue()).toFixed(2)}`,
  },
  {
    accessorKey: 'estado', // Ej: 'Pendiente', 'Aprobado', 'Facturado'
    header: 'Estado',
    size: 100,
    Cell: ({ cell }) => (
      <Badge color={
        cell.getValue() === 'Aprobado' ? 'green' :
        cell.getValue() === 'Pendiente' ? 'orange' :
        cell.getValue() === 'Facturado' ? 'blue' :
        'gray'
      }>
        {cell.getValue()}
      </Badge>
    ),
  },
  {
    accessorKey: 'notas',
    header: 'Notas',
    size: 200,
  },
];

export function TrabajosExtraTable({ operacionId }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [formModalOpened, { open: openFormModal, close: closeFormModal }] = useDisclosure(false);
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  const [selectedTrabajoExtra, setSelectedTrabajoExtra] = useState(null); // Para editar o eliminar

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // API para obtener trabajos extra de una operación específica
      const response = await fetch(`/api/superuser/operaciones-campo/${operacionId}/trabajos-extra`);
      if (!response.ok) {
        throw new Error(`Error fetching data: ${response.statusText}`);
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Failed to fetch trabajos extra:', err);
      setError(err);
      notifications.show({
        title: 'Error',
        message: 'No se pudieron cargar los trabajos extra. Intenta de nuevo.',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  }, [operacionId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveTrabajoExtra = () => {
    closeFormModal();
    setSelectedTrabajoExtra(null);
    fetchData(); // Recargar datos después de guardar
  };

  const handleDeleteTrabajoExtra = async () => {
    if (!selectedTrabajoExtra) return;
    try {
      const response = await fetch(`/api/superuser/operaciones-campo/${operacionId}/trabajos-extra/${selectedTrabajoExtra.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(`Error deleting trabajo extra: ${response.statusText}`);
      }
      notifications.show({
        title: 'Trabajo Extra Eliminado',
        message: 'El trabajo extra ha sido eliminado exitosamente.',
        color: 'green',
      });
      fetchData(); // Recargar datos
    } catch (err) {
      console.error('Failed to delete trabajo extra:', err);
      notifications.show({
        title: 'Error',
        message: `No se pudo eliminar el trabajo extra: ${err.message}`,
        color: 'red',
      });
    } finally {
      closeDeleteModal();
      setSelectedTrabajoExtra(null);
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
            setSelectedTrabajoExtra(row.original);
            openFormModal();
          }}
        >
          Editar
        </Menu.Item>
        <Menu.Item
          leftSection={<IconTrash size={18} />}
          color="red"
          onClick={() => {
            setSelectedTrabajoExtra(row.original);
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
            setSelectedTrabajoExtra(null); // Para asegurar que es un nuevo registro
            openFormModal();
          }}
          variant="filled"
          color="blue"
        >
          Registrar Trabajo Extra
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

      {/* Modal para el formulario de Trabajo Extra */}
      <Modal opened={formModalOpened} onClose={closeFormModal} title={selectedTrabajoExtra ? "Editar Trabajo Extra" : "Registrar Trabajo Extra"} centered size="lg">
        <TrabajoExtraForm
          operacionId={operacionId}
          initialData={selectedTrabajoExtra}
          onSuccess={handleSaveTrabajoExtra}
          onCancel={closeFormModal}
        />
      </Modal>

      {/* Modal de confirmación de eliminación */}
      <Modal opened={deleteModalOpened} onClose={closeDeleteModal} title="Confirmar Eliminación" centered>
        <Text>
          ¿Estás seguro de que quieres eliminar el trabajo extra: "
          <Text span fw={700} c="red">
            {selectedTrabajoExtra?.descripcion}
          </Text>
          "?
        </Text>
        <Flex justify="flex-end" gap="md" mt="md">
          <Button variant="default" onClick={closeDeleteModal}>
            Cancelar
          </Button>
          <Button color="red" onClick={handleDeleteTrabajoExtra}>
            Eliminar
          </Button>
        </Flex>
      </Modal>
    </>
  );
}