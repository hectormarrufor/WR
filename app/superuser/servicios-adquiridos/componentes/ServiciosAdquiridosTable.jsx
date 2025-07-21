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
import { EditRenglonModal } from '../../contratos/EditRenglonModal';
// Importa el componente del modal de edición de renglones

// Definición de las columnas de la tabla (sin cambios aquí, es solo para contexto)
const getColumns = () => [
  {
    accessorKey: 'contrato.numeroContrato',
    header: 'Nº Contrato',
    size: 120,
    Cell: ({ row }) => {
      const router = useRouter();
      // Enlace para ir al detalle del contrato
      return (
        <Text
          component="a"
          href={`/superuser/contratos/${row.original.contrato?.id}`}
          onClick={(e) => {
            e.preventDefault();
            router.push(`/superuser/contratos/${row.original.contrato?.id}`);
          }}
          style={{ cursor: 'pointer', textDecoration: 'underline', color: 'blue' }}
        >
          {row.original.contrato?.numeroContrato || 'N/A'}
        </Text>
      );
    },
  },
  {
    accessorKey: 'contrato.cliente.nombreCompleto',
    header: 'Cliente',
    size: 200,
    Cell: ({ row }) => row.original.contrato?.cliente?.nombreCompleto || 'N/A',
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
  const [editModalOpened, { open: openEditModal, close: closeEditModal }] = useDisclosure(false); // Para el modal de edición
  const [selectedRenglon, setSelectedRenglon] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Usamos la API que lista todos los renglones, incluyendo el contrato y cliente asociado
      const response = await fetch('/api/contratos/renglones'); // Asegúrate que esta API existe y devuelve los includes
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
      const response = await fetch(`/api/contratos/renglones/${selectedRenglon.id}`, { // Usamos la API de renglones individuales
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

  const handleEditRenglonModal = (renglon) => {
    setSelectedRenglon(renglon);
    openEditModal();
  };

  const handleRenglonUpdated = () => {
    closeEditModal();
    setSelectedRenglon(null);
    fetchData(); // Recargar los datos de la tabla para ver los cambios
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
      <Menu shadow="md" width={250}> {/* Aumentamos el ancho del menú para los nuevos ítems */}
        <Menu.Target>
          <ActionIcon variant="light" size="md" aria-label="Acciones">
            <IconEye size={18} />
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Label>Acciones de Renglón</Menu.Label>
          <Menu.Item
            leftSection={<IconTruck size={18} />}
            // Considera pasar el ID del contrato también si lo necesitas en el formulario de mudanza/operación
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
            onClick={() => router.push(`/superuser/servicios-adquiridos/${row.original.id}`)} // <-- **Aquí el cambio a la página de detalle del renglón**
          >
            Ver Detalle / Historial
          </Menu.Item>
          <Menu.Item
            leftSection={<IconEdit size={18} />}
            onClick={() => handleEditRenglonModal(row.original)} // <-- **Aquí el cambio para abrir el modal de edición**
          >
            Editar Renglón (Directo)
          </Menu.Item>
          {/* El item "Editar Renglón (en Contrato)" podrías mantenerlo si es útil,
              o eliminarlo si la edición directa es suficiente.
              Si lo mantienes, la ruta sería:
              onClick={() => router.push(`/superuser/contratos/${row.original.contratoServicio.id}?renglonId=${row.original.id}`)}
              Y en el formulario del contrato, deberías tener un useEffect que abra el modal si hay un renglonId en la URL.
          */}
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

      {/* Modal de edición de renglón (reutilizado) */}
      {selectedRenglon && (
        <EditRenglonModal
          opened={editModalOpened}
          onClose={closeEditModal}
          renglon={selectedRenglon}
          onUpdate={handleRenglonUpdated}
        />
      )}
    </>
  );
}