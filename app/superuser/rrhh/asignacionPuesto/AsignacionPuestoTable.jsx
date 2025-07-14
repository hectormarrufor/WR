// components/rrhh/AsignacionPuestoTable.jsx
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
    accessorFn: (row) => `${row.empleado.nombre} ${row.empleado.apellido}`, // Asume que incluye el objeto empleado
    id: 'nombreEmpleado', // ID único para esta columna
    header: 'Empleado',
    size: 200,
  },
  {
    accessorFn: (row) => row.puesto.nombre, // Asume que incluye el objeto puesto
    id: 'nombrePuesto',
    header: 'Puesto Asignado',
    size: 200,
  },
  {
    accessorKey: 'fechaInicio',
    header: 'Fecha Inicio',
    size: 150,
    Cell: ({ cell }) => new Date(cell.getValue()).toLocaleDateString(),
  },
  {
    accessorKey: 'fechaFin',
    header: 'Fecha Fin',
    size: 150,
    Cell: ({ cell }) => (cell.getValue() ? new Date(cell.getValue()).toLocaleDateString() : 'Actual'),
  },
  {
    accessorKey: 'activo',
    header: 'Activa',
    size: 80,
    Cell: ({ cell }) => (cell.getValue() ? 'Sí' : 'No'),
  },
];

export function AsignacionPuestoTable() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  const [selectedAsignacion, setSelectedAsignacion] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Importante: Tu API GET de asignaciones debe incluir los datos relacionados de Empleado y Puesto
      // (ej. usando `include: { empleado: true, puesto: true }` en Prisma).
      const response = await fetch('/api/superuser/rrhh/asignacion-puestos');
      if (!response.ok) {
        throw new Error(`Error fetching data: ${response.statusText}`);
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Failed to fetch asignaciones de puestos:', err);
      setError(err);
      notifications.show({
        title: 'Error',
        message: 'No se pudieron cargar las asignaciones de puestos. Intenta de nuevo.',
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
    if (!selectedAsignacion) return;
    try {
      const response = await fetch(`/api/superuser/rrhh/asignacion-puestos/${selectedAsignacion.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(`Error deleting asignacion: ${response.statusText}`);
      }
      notifications.show({
        title: 'Asignación Eliminada',
        message: 'La asignación de puesto ha sido eliminada exitosamente.',
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
          onClick={() => router.push(`/superuser/rrhh/asignacion-puestos/${row.original.id}/editar`)}
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
          onClick={() => router.push('/superuser/rrhh/asignacion-puestos/nuevo')}
          variant="filled"
          color="blue"
        >
          Registrar Nueva Asignación
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
          ¿Estás seguro de que quieres eliminar la asignación de "
          <Text span fw={700} c="red">
            {selectedAsignacion?.empleado?.nombre} {selectedAsignacion?.empleado?.apellido}
          </Text>
          " al puesto "
          <Text span fw={700} c="red">
            {selectedAsignacion?.puesto?.nombre}
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