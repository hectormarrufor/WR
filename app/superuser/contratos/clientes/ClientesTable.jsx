// components/rrhh/ClientesTable.jsx
'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { MantineReactTable, useMantineReactTable } from 'mantine-react-table';
import { Button, Box, Flex, Tooltip, ActionIcon, Text, Menu, Modal, MantineProvider, Badge, Avatar } from '@mantine/core';
import { IconEdit, IconTrash, IconEye, IconPlus, IconRefresh } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useDisclosure } from '@mantine/hooks';
import { useRouter } from 'next/navigation'; // o 'next/router'
import BackButton from '../../../components/BackButton';
import { ModalClienteForm } from './ModalClienteForm';


// Definición de las columnas de la tabla
const getColumns = (openDeleteModal, router) => [
  {
    accessorKey: 'imagen',
    header: "",
    enableColumnFilters: false,
    size: 80,
    Cell: ({ cell }) => (
      <Avatar
        src={`${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/${cell.getValue()}`}   // aquí va la URL o base64
        alt="Foto cliente"
        radius="xl"
        size="md"
      />
    ),
  },

  {
    accessorKey: 'identificacion',
    header: 'Identificacion',
    size: 100,
  },
  {
    accessorKey: 'nombre',
    header: 'Nombre',
    size: 150,
  },
  {
    accessorKey: 'telefono',
    header: 'Teléfono',
    size: 120,
  },
  {
    accessorKey: 'email',
    header: 'Email',
    size: 200,
  },
  {
    accessorKey: 'direccion',
    header: 'Dirección',
    size: 250,
  },
];

export default function ClientesTable() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();
  const [clienteModalOpened, { open: openClienteModal, close: closeClienteModal }] = useDisclosure(false);

  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [opened, setOpened] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/contratos/clientes');
      if (!response.ok) {
        throw new Error(`Error fetching data: ${response.statusText}`);
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Fallo al cargar lo clientes: ', err);
      setError(err);
      notifications.show({
        title: 'Error',
        message: 'No se pudieron cargar los clientes. Intenta de nuevo.',
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
    if (!selectedCliente) return;
    try {
      const response = await fetch(`/api/contratos/clientes/${selectedCliente.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(`Error deleting client: ${response.statusText}`);
      }
      notifications.show({
        title: 'Cliente Eliminado',
        message: 'El cliente ha sido eliminado exitosamente.',
        color: 'success',
      });
      fetchData(); // Recargar datos
    } catch (err) {
      console.error('Failed to delete client:', err);
      notifications.show({
        title: 'Error',
        message: `No se pudo eliminar el cliente: ${err.message}`,
        color: 'red',
      });
    } finally {
      closeDeleteModal();
      setSelectedCliente(null);
    }
  };

  const columns = useMemo(() => getColumns(openDeleteModal, router), [openDeleteModal, router]);

  const table = useMantineReactTable({
    w: "100%",
    enableColumnFilters: true,
    enableDensityToggle: false,
    enableFullScreenToggle: false,
    enableHiding: false,
    enablePagination: true,
    mantineTableHeadCellProps: {
      style: {
        backgroundColor: "lightblue"
      }
    },
    mantineTableBodyRowProps: ({ row }) => ({
      onClick: () => router.push(`/superuser/contratos/clientes/${row.original.id}`),
      style: { cursor: 'pointer' },
    }),
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
            setSelectedCliente(row.original)
            openClienteModal()
        }
          }
        >
          Editar
        </Menu.Item>
        <Menu.Item
          leftSection={<IconTrash size={18} />}
          color="red"
          onClick={() => {
            setSelectedCliente(row.original);
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
          onClick={() => openClienteModal()}
          variant="filled"
          color="blue"
        >
          Registrar Nuevo Cliente
        </Button>
        <Tooltip label="Refrescar Datos">
          <ActionIcon onClick={fetchData} variant="light" size="lg" aria-label="Refrescar">
            <IconRefresh size={24} />
          </ActionIcon>
        </Tooltip>
      </Flex>
    ),
    initialState: {
      density: 'xs', // 'xs', 'sm', 'md', 'lg'
      pagination: { pageSize: 10, pageIndex: 0 },
    },
    mantineTableContainerProps: {
      style: { minHeight: '400px' }, // Ajusta la altura según necesidad
    },
  });

  return (
    <>
      <MantineProvider
        theme={{
          components: {
            ActionIcon: {
              styles: {
                root: {
                  backgroundColor: 'transparent',
                  color: 'black',
                  '&:hover': {
                    backgroundColor: '#f0f0f0',
                  },
                },
              },
            },
          },
        }}
      >
        <MantineReactTable table={table} />
      </MantineProvider>
      <Modal opened={deleteModalOpened} onClose={closeDeleteModal} title="Confirmar Eliminación" centered>
        <Text>
          ¿Estás seguro de que quieres eliminar el cliente "
          <Text span fw={700} c="red">
            {selectedCliente?.nombre} {selectedCliente?.apellido}
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
      <ModalClienteForm
        cliente={selectedCliente}
        opened={clienteModalOpened}
        onClose={closeClienteModal}
        onClienteCreated={fetchData}
        onClienteUpdated={fetchData} // Refrescar la lista de empleados al crear un Cliente   
      />
 
    </>
  );
}