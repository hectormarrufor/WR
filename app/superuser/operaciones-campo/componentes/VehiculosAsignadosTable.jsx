// components/operaciones-campo/VehiculosAsignadosTable.jsx
'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { MantineReactTable, useMantineReactTable } from 'mantine-react-table';
import { Button, Box, Flex, Tooltip, ActionIcon, Text, Menu, Modal } from '@mantine/core';
import { IconEdit, IconTrash, IconEye, IconPlus, IconRefresh } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useDisclosure } from '@mantine/hooks';
import { VehiculoAsignadoForm } from './VehiculoAsignadoForm'; // Importa el formulario

// Definición de las columnas de la tabla
const getColumns = () => [
  {
    accessorFn: (row) => `${row.vehiculo?.marca} ${row.vehiculo?.modelo} (${row.vehiculo?.placa})`,
    id: 'vehiculoInfo',
    header: 'Vehículo',
    size: 250,
  },
  {
    accessorFn: (row) => `${row.empleado?.nombre} ${row.empleado?.apellido}`,
    id: 'conductor',
    header: 'Conductor',
    size: 200,
  },
  {
    accessorKey: 'fechaAsignacion',
    header: 'Fecha Asignación',
    size: 150,
    Cell: ({ cell }) => new Date(cell.getValue()).toLocaleDateString(),
  },
  {
    accessorKey: 'fechaLiberacion',
    header: 'Fecha Liberación',
    size: 150,
    Cell: ({ cell }) => (cell.getValue() ? new Date(cell.getValue()).toLocaleDateString() : 'Actualmente Asignado'),
  },
  {
    accessorKey: 'notas',
    header: 'Notas',
    size: 250,
  },
];

export function VehiculosAsignadosTable({ operacionId }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [formModalOpened, { open: openFormModal, close: closeFormModal }] = useDisclosure(false);
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  const [selectedAsignacion, setSelectedAsignacion] = useState(null); // Para editar o eliminar

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // API para obtener vehículos asignados a una operación específica
      // Asegúrate de que esta API incluya los datos de Vehiculo y Empleado
      const response = await fetch(`/api/superuser/operaciones-campo/${operacionId}/vehiculos`);
      if (!response.ok) {
        throw new Error(`Error fetching data: ${response.statusText}`);
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Failed to fetch vehiculos asignados:', err);
      setError(err);
      notifications.show({
        title: 'Error',
        message: 'No se pudieron cargar los vehículos asignados. Intenta de nuevo.',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  }, [operacionId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveAsignacion = () => {
    closeFormModal();
    setSelectedAsignacion(null);
    fetchData(); // Recargar datos después de guardar
  };

  const handleDeleteAsignacion = async () => {
    if (!selectedAsignacion) return;
    try {
      const response = await fetch(`/api/superuser/operaciones-campo/${operacionId}/vehiculos/${selectedAsignacion.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(`Error deleting asignacion: ${response.statusText}`);
      }
      notifications.show({
        title: 'Asignación Eliminada',
        message: 'La asignación de vehículo ha sido eliminada exitosamente.',
        color: 'green',
      });
      fetchData(); // Recargar datos
    } catch (err) {
      console.error('Failed to delete asignacion:', err);
      notifications.show({
        title: 'Error',
        message: `No se pudo eliminar la asignación: ${err.message}`,
        color: 'red',
      });
    } finally {
      closeDeleteModal();
      setSelectedAsignacion(null);
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
            setSelectedAsignacion(row.original);
            openFormModal();
          }}
        >
          Editar
        </Menu.Item>
        <Menu.Item
          leftSection={<IconTrash size={18} />}
          color="red"
          onClick={() => {
            setSelectedAsignacion(row.original);
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
            setSelectedAsignacion(null); // Para asegurar que es una nueva asignación
            openFormModal();
          }}
          variant="filled"
          color="blue"
        >
          Asignar Nuevo Vehículo
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

      {/* Modal para el formulario de Asignación de Vehículo */}
      <Modal opened={formModalOpened} onClose={closeFormModal} title={selectedAsignacion ? "Editar Asignación de Vehículo" : "Asignar Nuevo Vehículo"} centered size="lg">
        <VehiculoAsignadoForm
          operacionId={operacionId}
          initialData={selectedAsignacion}
          onSuccess={handleSaveAsignacion}
          onCancel={closeFormModal}
        />
      </Modal>

      {/* Modal de confirmación de eliminación */}
      <Modal opened={deleteModalOpened} onClose={closeDeleteModal} title="Confirmar Eliminación" centered>
        <Text>
          ¿Estás seguro de que quieres eliminar la asignación del vehículo "
          <Text span fw={700} c="red">
            {selectedAsignacion?.vehiculo?.marca} {selectedAsignacion?.vehiculo?.placa}
          </Text>
          " al conductor "
          <Text span fw={700} c="red">
            {selectedAsignacion?.empleado?.nombre} {selectedAsignacion?.empleado?.apellido}
          </Text>
          "?
        </Text>
        <Flex justify="flex-end" gap="md" mt="md">
          <Button variant="default" onClick={closeDeleteModal}>
            Cancelar
          </Button>
          <Button color="red" onClick={handleDeleteAsignacion}>
            Eliminar
          </Button>
        </Flex>
      </Modal>
    </>
  );
}