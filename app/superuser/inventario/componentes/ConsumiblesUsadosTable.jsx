// components/inventario/ConsumiblesUsadosTable.jsx
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
    accessorKey: 'consumible.nombre',
    header: 'Consumible',
    size: 200,
    Cell: ({ row }) => row.original.consumible?.nombre || 'N/A',
  },
  {
    accessorKey: 'cantidadUsada',
    header: 'Cantidad Usada',
    size: 100,
    Cell: ({ cell }) => parseFloat(cell.getValue()).toFixed(2),
  },
  {
    accessorKey: 'fechaUso',
    header: 'Fecha de Uso',
    size: 120,
    Cell: ({ cell }) => new Date(cell.getValue()).toLocaleDateString(),
  },
  {
    accessorKey: 'contratoServicio.numeroContrato',
    header: 'Contrato Servicio',
    size: 150,
    Cell: ({ row }) => row.original.contratoServicio ? `Contrato ${row.original.contratoServicio.numeroContrato} (${row.original.contratoServicio.cliente?.razonSocial || 'N/A'})` : 'N/A',
  },
  {
    accessorKey: 'equipo.nombre',
    header: 'Equipo Asociado',
    size: 150,
    Cell: ({ row }) => row.original.equipo ? `${row.original.equipo.nombre} (${row.original.equipo.modelo})` : 'N/A',
  },
  {
    accessorKey: 'empleado.nombre',
    header: 'Reportado Por',
    size: 150,
    Cell: ({ row }) => row.original.empleado ? `${row.original.empleado.nombre} ${row.original.empleado.apellido}` : 'N/A',
  },
  {
    accessorKey: 'notas',
    header: 'Notas del Uso',
    size: 200,
    enableColumnFilterModes: false,
    enableColumnActions: false,
    enableSorting: false,
  },
];

export function ConsumiblesUsadosTable() {
  const router = useRouter();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  const [selectedUsado, setSelectedUsado] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/superuser/inventario/consumibles-usados');
      if (!response.ok) {
        throw new Error(`Error fetching data: ${response.statusText}`);
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Failed to fetch consumibles usados:', err);
      setError(err);
      notifications.show({
        title: 'Error',
        message: 'No se pudieron cargar los registros de usos de consumibles. Intenta de nuevo.',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDeleteUsado = async () => {
    if (!selectedUsado) return;
    try {
      const response = await fetch(`/api/superuser/inventario/consumibles-usados/${selectedUsado.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || response.statusText);
      }
      notifications.show({
        title: 'Uso Eliminado',
        message: 'El registro de uso ha sido eliminado exitosamente. El stock del consumible ha sido ajustado.',
        color: 'green',
      });
      fetchData(); // Recargar datos
    } catch (err) {
      console.error('Failed to delete consumible usado:', err);
      notifications.show({
        title: 'Error',
        message: `No se pudo eliminar el registro de uso: ${err.message}`,
        color: 'red',
      });
    } finally {
      closeDeleteModal();
      setSelectedUsado(null);
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
          onClick={() => router.push(`/superuser/inventario/consumibles-usados/${row.original.id}/editar`)}
        >
          Ver/Editar (Campos Auxiliares)
        </Menu.Item>
        <Menu.Item
          leftSection={<IconTrash size={18} />}
          color="red"
          onClick={() => {
            setSelectedUsado(row.original);
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
          onClick={() => router.push('/superuser/inventario/consumibles-usados/nuevo')}
          variant="filled"
          color="blue"
        >
          Registrar Nuevo Uso
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
          ¿Estás seguro de que quieres eliminar el registro de uso del consumible "
          <Text span fw={700} c="red">
            {selectedUsado?.consumible?.nombre}
          </Text>
          " por la cantidad de "
          <Text span fw={700} c="red">
            {parseFloat(selectedUsado?.cantidadUsada).toFixed(2)}
          </Text>
          " del "
          <Text span fw={700} c="red">
            {selectedUsado?.fechaUso ? new Date(selectedUsado.fechaUso).toLocaleDateString() : 'N/A'}
          </Text>
          "?
          <br />
          **¡Advertencia!** Esto revertirá el stock del consumible. Esta acción no se puede deshacer.
        </Text>
        <Flex justify="flex-end" gap="md" mt="md">
          <Button variant="default" onClick={closeDeleteModal}>
            Cancelar
          </Button>
          <Button color="red" onClick={handleDeleteUsado}>
            Eliminar Uso
          </Button>
        </Flex>
      </Modal>
    </>
  );
}