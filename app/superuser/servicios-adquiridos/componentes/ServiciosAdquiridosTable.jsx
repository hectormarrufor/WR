// components/servicios-adquiridos/ServiciosAdquiridosTable.jsx
'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { MantineReactTable, useMantineReactTable } from 'mantine-react-table';
import { Button, Box, Flex, Tooltip, ActionIcon, Text, Menu, Modal, Badge } from '@mantine/core';
import { IconTruck, IconTools, IconClipboardPlus, IconBowl, IconEye, IconEdit, IconRefresh, IconPlus, IconTrash } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useDisclosure } from '@mantine/hooks';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import es from 'date-fns/locale/es';

// Definición de las columnas de la tabla
const getColumns = () => [
  {
    accessorKey: 'contratoServicio.numeroContrato',
    header: 'Nº Contrato',
    size: 120,
  },
  {
    accessorKey: 'contratoServicio.cliente.nombreCompania',
    header: 'Cliente',
    size: 200,
    Cell: ({ row }) => row.original.contratoServicio?.cliente?.nombreCompania || 'N/A',
  },
  {
    accessorKey: 'nombreRenglon',
    header: 'Servicio/Fase',
    size: 200,
  },
  {
    accessorKey: 'pozoNombre',
    header: 'Pozo',
    size: 150,
  },
  {
    accessorKey: 'ubicacionPozo',
    header: 'Ubicación',
    size: 150,
  },
  {
    accessorKey: 'fechaInicioEstimada',
    header: 'Inicio Est.',
    size: 120,
    Cell: ({ cell }) => cell.getValue() ? format(new Date(cell.getValue()), 'dd/MM/yyyy', { locale: es }) : 'N/A',
  },
  {
    accessorKey: 'fechaFinEstimada',
    header: 'Fin Est.',
    size: 120,
    Cell: ({ cell }) => cell.getValue() ? format(new Date(cell.getValue()), 'dd/MM/yyyy', { locale: es }) : 'N/A',
  },
  {
    accessorKey: 'estado',
    header: 'Estado',
    size: 100,
    Cell: ({ cell }) => {
      const status = cell.getValue();
      let color;
      switch (status) {
        case 'Pendiente': color = 'gray'; break;
        case 'En Preparación': color = 'blue'; break;
        case 'Mudanza': color = 'yellow'; break;
        case 'Operando': color = 'green'; break;
        case 'Finalizado': color = 'teal'; break;
        case 'Pausado': color = 'orange'; break;
        case 'Cancelado': color = 'red'; break;
        default: color = 'gray';
      }
      return <Badge color={color} variant="filled">{status}</Badge>;
    },
  },
];

export function ServiciosAdquiridosTable() {
  const router = useRouter();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  const [selectedRenglon, setSelectedRenglon] = useState(null); // Para eliminar un renglón

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/operaciones/renglones-servicio');
      if (!response.ok) {
        throw new Error(`Error fetching data: ${response.statusText}`);
      }
      const result = await response.json();
      console.log(result)
      setData(result);
    } catch (err) {
      console.error('Failed to fetch renglones de servicio:', err);
      setError(err);
      notifications.show({
        title: 'Error',
        message: `No se pudieron cargar los servicios adquiridos: ${err.message}`,
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDeleteRenglon = async () => {
    if (!selectedRenglon) return;
    try {
      // Nota: Eliminar un renglón puede requerir lógica compleja
      // Asegúrate de que tu API maneje la eliminación de renglones correctamente,
      // posiblemente requiriendo la eliminación en cascada de mudanzas/operaciones asociadas.
      const response = await fetch(`/api/operaciones/renglones-servicio/${selectedRenglon.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || response.statusText);
      }
      notifications.show({
        title: 'Renglón Eliminado',
        message: 'El renglón de servicio ha sido eliminado exitosamente.',
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
      <Menu shadow="md" width={200}>
        <Menu.Target>
          <ActionIcon variant="light" size="md" aria-label="Acciones">
            <IconEye size={18} />
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Label>Acciones de Renglón</Menu.Label>
          <Menu.Item
            leftSection={<IconTruck size={18} />}
            onClick={() => router.push(`/superuser/servicios-adquiridos/${row.original.id}/mudanzas/new`)}
          >
            Registrar Mudanza
          </Menu.Item>
          <Menu.Item
            leftSection={<IconTools size={18} />}
            onClick={() => router.push(`/superuser/servicios-adquiridos/${row.original.id}/operaciones/new`)}
          >
            Registrar Operación
          </Menu.Item>
          <Menu.Item
            leftSection={<IconClipboardPlus size={18} />}
            onClick={() => router.push(`/superuser/servicios-adquiridos/${row.original.id}/trabajos-extra/new`)}
          >
            Registrar Trabajo Extra
          </Menu.Item>
          <Menu.Item
            leftSection={<IconBowl size={18} />}
            onClick={() => router.push(`/superuser/servicios-adquiridos/${row.original.id}/consumo-alimentos/new`)}
          >
            Registrar Consumo Alimentos
          </Menu.Item>
          <Menu.Divider />
          <Menu.Item
            leftSection={<IconEye size={18} />}
            onClick={() => router.push(`/superuser/servicios-adquiridos/${row.original.id}`)}
          >
            Ver Detalle / Historial
          </Menu.Item>
          <Menu.Item
            leftSection={<IconEdit size={18} />}
            onClick={() => router.push(`/superuser/contratos/${row.original.contratoServicio.id}/editar?renglonId=${row.original.id}`)}
          >
            Editar Renglón (en Contrato)
          </Menu.Item>
          <Menu.Item
            leftSection={<IconTrash size={18} />}
            color="red"
            onClick={() => {
              setSelectedRenglon(row.original);
              openDeleteModal();
            }}
          >
            Eliminar Renglón
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    ),
    renderTopToolbarCustomActions: () => (
      <Flex gap="md">
        {/* El botón de "Crear Nuevo Renglón" no tiene sentido aquí, ya que los renglones se crean dentro de un contrato */}
        {/* Podrías tener un botón para "Ver Contratos" si quieres facilitar la navegación */}
        <Button
          leftSection={<IconPlus size={20} />}
          onClick={() => router.push('/superuser/contratos/nuevo')}
          variant="filled"
          color="blue"
        >
          Crear Nuevo Contrato (con Renglones)
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
          ¿Estás seguro de que quieres eliminar el renglón "
          <Text span fw={700} c="red">
            {selectedRenglon?.nombreRenglon}
          </Text>
          " del contrato Nº "
          <Text span fw={700} c="red">
            {selectedRenglon?.contratoServicio?.numeroContrato}
          </Text>
          "?
          Esta acción podría afectar operaciones y mudanzas asociadas.
        </Text>
        <Flex justify="flex-end" gap="md" mt="md">
          <Button variant="default" onClick={closeDeleteModal}>
            Cancelar
          </Button>
          <Button color="red" onClick={handleDeleteRenglon}>
            Eliminar Renglón
          </Button>
        </Flex>
      </Modal>
    </>
  );
}