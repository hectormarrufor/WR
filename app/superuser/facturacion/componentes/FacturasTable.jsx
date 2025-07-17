// components/facturacion/FacturasTable.jsx
'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { MantineReactTable, useMantineReactTable } from 'mantine-react-table';
import { Button, Box, Flex, Tooltip, ActionIcon, Text, Menu, Modal, Badge } from '@mantine/core';
import { IconEdit, IconTrash, IconEye, IconPlus, IconRefresh } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useDisclosure } from '@mantine/hooks';
import { useRouter } from 'next/navigation'; // Para navegación

// Definición de las columnas de la tabla
const getColumns = () => [
  {
    accessorKey: 'numeroFactura',
    header: 'Nº Factura',
    size: 100,
  },
  {
    accessorKey: 'cliente.nombreCompleto', // Asume que el cliente viene incluido
    header: 'Cliente',
    size: 200,
    Cell: ({ row }) => row.original.cliente?.razonSocial || row.original.cliente?.nombreCompleto || 'N/A',
  },
  {
    accessorKey: 'fechaEmision',
    header: 'Fecha Emisión',
    size: 120,
    Cell: ({ cell }) => new Date(cell.getValue()).toLocaleDateString(),
  },
  {
    accessorKey: 'fechaVencimiento',
    header: 'Fecha Vencimiento',
    size: 120,
    Cell: ({ cell }) => new Date(cell.getValue()).toLocaleDateString(),
  },
  {
    accessorKey: 'montoTotal',
    header: 'Subtotal ($)',
    size: 100,
    Cell: ({ cell }) => `$${parseFloat(cell.getValue()).toFixed(2)}`,
  },
  {
    accessorKey: 'impuestos',
    header: 'Impuestos ($)',
    size: 100,
    Cell: ({ cell }) => `$${parseFloat(cell.getValue()).toFixed(2)}`,
  },
  {
    accessorKey: 'totalAPagar',
    header: 'Total ($)',
    size: 100,
    Cell: ({ cell }) => `$${parseFloat(cell.getValue()).toFixed(2)}`,
  },
  {
    accessorKey: 'estado', // Ej: 'Pendiente', 'Pagada', 'Vencida', 'Anulada'
    header: 'Estado',
    size: 100,
    Cell: ({ cell }) => (
      <Badge color={
        cell.getValue() === 'Pagada' ? 'green' :
        cell.getValue() === 'Pendiente' ? 'orange' :
        cell.getValue() === 'Vencida' ? 'red' :
        'gray'
      }>
        {cell.getValue()}
      </Badge>
    ),
  },
];

export function FacturasTable() {
  const router = useRouter();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  const [selectedFactura, setSelectedFactura] = useState(null); // Para eliminar

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    console.log('Iniciando Fetch')
    try {
      const response = await fetch('/api/contratos/facturacion'); // API para obtener todas las facturas
      if (!response.ok) {
        throw new Error(`Error fetching data: ${response.statusText}`);
      }
      const result = await response.json();
      console.log(result);
      if (result.length === 0) throw new Error("No hay facturas registradas aun")
      setData(result);
    } catch (err) {
      console.error('Failed to fetch facturas:', err);
      setError(err);
      notifications.show({
        title: 'Error',
        message: `No se pudieron cargar las facturas: ${err.message}`,
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDeleteFactura = async () => {
    if (!selectedFactura) return;
    try {
      const response = await fetch(`/api/contratos/facturacion/${selectedFactura.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || response.statusText);
      }
      notifications.show({
        title: 'Factura Eliminada',
        message: 'La factura ha sido eliminada exitosamente.',
        color: 'green',
      });
      fetchData(); // Recargar datos
    } catch (err) {
      console.error('Failed to delete factura:', err);
      notifications.show({
        title: 'Error',
        message: `No se pudo eliminar la factura: ${err.message}`,
        color: 'red',
      });
    } finally {
      closeDeleteModal();
      setSelectedFactura(null);
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
          leftSection={<IconEye size={18} />}
          onClick={() => router.push(`/superuser/facturacion/${row.original.id}`)}
        >
          Ver Detalle
        </Menu.Item>
        <Menu.Item
          leftSection={<IconEdit size={18} />}
          onClick={() => router.push(`/superuser/facturacion/${row.original.id}/editar`)}
        >
          Editar
        </Menu.Item>
        <Menu.Item
          leftSection={<IconTrash size={18} />}
          color="red"
          onClick={() => {
            setSelectedFactura(row.original);
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
          onClick={() => router.push('/superuser/facturacion/nueva')}
          variant="filled"
          color="blue"
        >
          Crear Nueva Factura
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
          ¿Estás seguro de que quieres eliminar la factura Nº "
          <Text span fw={700} c="red">
            {selectedFactura?.numeroFactura}
          </Text>
          "?
          Esta acción no se puede deshacer.
        </Text>
        <Flex justify="flex-end" gap="md" mt="md">
          <Button variant="default" onClick={closeDeleteModal}>
            Cancelar
          </Button>
          <Button color="red" onClick={handleDeleteFactura}>
            Eliminar Factura
          </Button>
        </Flex>
      </Modal>
    </>
  );
}