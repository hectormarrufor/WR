// components/rrhh/EmpleadosTable.jsx
'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { MantineReactTable, useMantineReactTable } from 'mantine-react-table';
import { Button, Box, Flex, Tooltip, ActionIcon, Text, Menu, Modal, MantineProvider, Badge } from '@mantine/core';
import { IconEdit, IconTrash, IconEye, IconPlus, IconRefresh } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useDisclosure } from '@mantine/hooks';
import { useRouter } from 'next/navigation'; // o 'next/router'
import BackButton from '../../../components/BackButton';
import CrearUsuarioModal from './CrearUsuarioModal';
import EditUsuarioModal from './EditUsuarioModal';

function calcularEdad(fechaNacimiento) {
  if (!fechaNacimiento) return null;

  const nacimiento = new Date(fechaNacimiento); // Sequelize DATEONLY ya viene como string tipo "YYYY-MM-DD"
  const hoy = new Date();

  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const haCumplidoEsteAno = (
    hoy.getMonth() > nacimiento.getMonth() ||
    (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() >= nacimiento.getDate())
  );

  if (!haCumplidoEsteAno) edad--;

  return edad;
}

// Definición de las columnas de la tabla
const getColumns = (openDeleteModal, router) => [
  {
    accessorKey: 'cedula',
    header: 'Cédula',
    size: 100,
  },
  {
    accessorKey: 'nombreCompleto',
    header: 'Nombre y apellido',
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
  {
    accessorKey: 'edad',
    header: 'Edad',
    size: 150,
  },
  {
    accessorKey: 'fechaIngreso',
    header: 'Fecha Contratación',
    size: 150,
    Cell: ({ cell }) => new Date(cell.getValue()).toLocaleDateString(),
  },
  {
    accessorKey: 'estado',
    header: 'Estado',
    Cell: ({ cell }) => {
      const val = cell.getValue();
      const color =
        val === 'Activo'
          ? 'green'
          : val === 'Vacaciones'
            ? 'orange'
            : val === 'Suspendido' ? 'red' :
              val === 'Inactivo' && 'gray';
      ;
      return <Badge color={color}>{val}</Badge>;
    },
  },
];

export default function EmpleadosTable() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();
  const [crearUsuarioModalOpened, { open: openCrearUsuarioModal, close: closeCrearUsuarioModal }] = useDisclosure(false);
  const [editUsuarioModalOpened, { open: openEditUsuarioModal, close: closeEditUsuarioModal }] = useDisclosure(false);

  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  const [selectedEmpleado, setSelectedEmpleado] = useState(null);
  const [opened, setOpened] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/rrhh/empleados');
      if (!response.ok) {
        throw new Error(`Error fetching data: ${response.statusText}`);
      }
      const result = await response.json();
      setData(result.map(empleado => { return { ...empleado, nombreCompleto: empleado.nombre + " " + empleado.apellido, edad: calcularEdad(empleado.fechaNacimiento) } }));
    } catch (err) {
      console.error('Failed to fetch employees:', err);
      setError(err);
      notifications.show({
        title: 'Error',
        message: 'No se pudieron cargar los empleados. Intenta de nuevo.',
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
    if (!selectedEmpleado) return;
    try {
      const response = await fetch(`/api/rrhh/empleados/${selectedEmpleado.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(`Error deleting employee: ${response.statusText}`);
      }
      notifications.show({
        title: 'Empleado Eliminado',
        message: 'El empleado ha sido eliminado exitosamente.',
        color: 'success',
      });
      fetchData(); // Recargar datos
    } catch (err) {
      console.error('Failed to delete employee:', err);
      notifications.show({
        title: 'Error',
        message: `No se pudo eliminar el empleado: ${err.message}`,
        color: 'red',
      });
    } finally {
      closeDeleteModal();
      setSelectedEmpleado(null);
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
    mantineTableBodyRowProps:({ row }) => ({
      onClick: () => router.push(`/superuser/rrhh/empleados/${row.original.id}`),
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
          onClick={() => router.push(`/superuser/rrhh/empleados/${row.original.id}/editar`)}
        >
          Editar
        </Menu.Item>
        <Menu.Item
          leftSection={<IconTrash size={18} />}
          color="red"
          onClick={() => {
            setSelectedEmpleado(row.original);
            openDeleteModal();
          }}
        >
          Eliminar
        </Menu.Item>

        <Menu.Item
          leftSection={row.original.usuario?.user ? <IconEdit size={18} /> : <IconPlus size={18} />}
          color="blue"
          onClick={() => {
            setSelectedEmpleado(row.original);
            {
              row.original.usuario?.user ?
              openEditUsuarioModal(selectedEmpleado)
              :
              openCrearUsuarioModal(selectedEmpleado);
            }
          }}
        >
          {row.original.usuario?.user ? "Editar cuenta de usuario" : "Crear cuenta en sistema"}
        </Menu.Item>
      </Menu>
    ),
    renderTopToolbarCustomActions: () => (
      <Flex gap="md">
        <Button
          leftSection={<IconPlus size={20} />}
          onClick={() => router.push('/superuser/rrhh/empleados/nuevo')}
          variant="filled"
          color="blue"
        >
          Registrar Nuevo Empleado
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
          ¿Estás seguro de que quieres eliminar el empleado "
          <Text span fw={700} c="red">
            {selectedEmpleado?.nombre} {selectedEmpleado?.apellido}
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
      <CrearUsuarioModal
        empleado={selectedEmpleado}
        opened={crearUsuarioModalOpened}
        onClose={closeCrearUsuarioModal}
        onUserCreated={fetchData} // Refrescar la lista de empleados al crear un usuario   
      />
      <EditUsuarioModal
        usuario={selectedEmpleado?.usuario}
        opened={editUsuarioModalOpened}
        onClose={closeEditUsuarioModal}
        onUpdated={fetchData} // Refrescar la lista de empleados al crear un usuario   
      />
    </>
  );
}