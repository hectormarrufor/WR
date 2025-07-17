// components/compras/FacturasProveedorTable.jsx
'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { MantineReactTable, useMantineReactTable } from 'mantine-react-table';
import { Button, Box, Flex, Tooltip, ActionIcon, Text, Menu, Modal, Badge, Anchor } from '@mantine/core';
import { IconTrash, IconEye, IconPlus, IconRefresh, IconEdit, IconCurrencyDollar } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useDisclosure } from '@mantine/hooks';
import { useRouter } from 'next/navigation';

const getEstadoColor = (estado) => {
  switch (estado) {
    case 'Pendiente': return 'red';
    case 'Parcialmente Pagada': return 'orange';
    case 'Pagada': return 'green';
    case 'Anulada': return 'gray';
    default: return 'gray';
  }
};

const getColumns = () => [
  {
    accessorKey: 'numeroFactura',
    header: 'Nº Factura',
    size: 120,
  },
  {
    accessorKey: 'proveedor.nombre',
    header: 'Proveedor',
    size: 180,
    Cell: ({ row }) => row.original.proveedor?.nombre || 'N/A',
  },
  {
    accessorKey: 'ordenCompra.numeroOrden',
    header: 'Nº OC',
    size: 100,
    Cell: ({ row }) => row.original.ordenCompra ? (
      <Anchor onClick={() => window.location.href = `/superuser/compras/ordenes-compra/${row.original.ordenCompra.id}`}>
        {row.original.ordenCompra.numeroOrden}
      </Anchor>
    ) : 'N/A',
  },
  {
    accessorKey: 'fechaEmision',
    header: 'F. Emisión',
    size: 100,
    Cell: ({ cell }) => new Date(cell.getValue()).toLocaleDateString(),
  },
  {
    accessorKey: 'fechaVencimiento',
    header: 'F. Vencimiento',
    size: 120,
    Cell: ({ cell }) => new Date(cell.getValue()).toLocaleDateString(),
  },
  {
    accessorKey: 'totalAPagar',
    header: 'Total a Pagar',
    size: 120,
    Cell: ({ cell }) => `$${parseFloat(cell.getValue()).toFixed(2)}`,
  },
  {
    accessorKey: 'montoPagado',
    header: 'Monto Pagado',
    size: 120,
    Cell: ({ cell }) => `$${parseFloat(cell.getValue()).toFixed(2)}`,
  },
  {
    accessorKey: 'estado',
    header: 'Estado',
    size: 120,
    Cell: ({ cell }) => (
      <Badge color={getEstadoColor(cell.getValue())} variant="light">
        {cell.getValue()}
      </Badge>
    ),
  },
];

export function FacturasProveedorTable() {
  const router = useRouter();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  const [selectedFactura, setSelectedFactura] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/compras/facturas-proveedor');
      if (!response.ok) {
        throw new Error(`Error fetching data: ${response.statusText}`);
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Failed to fetch facturas de proveedor:', err);
      setError(err);
      notifications.show({
        title: 'Error',
        message: 'No se pudieron cargar las facturas de proveedor. Intenta de nuevo.',
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
      const response = await fetch(`/api/compras/facturas-proveedor/${selectedFactura.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || response.statusText);
      }
      notifications.show({
        title: 'Factura Eliminada',
        message: 'La factura de proveedor ha sido eliminada y los montos revertidos.',
        color: 'green',
      });
      fetchData(); // Recargar datos
    } catch (err) {
      console.error('Failed to delete factura de proveedor:', err);
      notifications.show({
        title: 'Error',
        message: `No se pudo eliminar la factura de proveedor: ${err.message}`,
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
      <Menu.Target>
        <ActionIcon variant="light" size="md" aria-label="Acciones">
          <IconEye size={18} />
        </ActionIcon>
        <Menu.Dropdown>
          <Menu.Item
            leftSection={<IconEye size={18} />}
            onClick={() => router.push(`/superuser/compras/facturas-proveedor/${row.original.id}`)}
          >
            Ver Detalles
          </Menu.Item>
          <Menu.Item
            leftSection={<IconEdit size={18} />}
            onClick={() => router.push(`/superuser/compras/facturas-proveedor/${row.original.id}/editar`)}
          >
            Editar
          </Menu.Item>
          <Menu.Item
            leftSection={<IconCurrencyDollar size={18} />}
            onClick={() => router.push(`/superuser/compras/facturas-proveedor/${row.original.id}/registrar-pago`)}
            disabled={row.original.estado === 'Pagada' || row.original.estado === 'Anulada'}
          >
            Registrar Pago
          </Menu.Item>
          <Menu.Item
            leftSection={<IconTrash size={18} />}
            color="red"
            onClick={() => {
              setSelectedFactura(row.original);
              openDeleteModal();
            }}
            disabled={row.original.montoPagado > 0 || row.original.estado === 'Anulada'} // No permitir eliminar si ya hay pagos
          >
            Eliminar
          </Menu.Item>
        </Menu.Dropdown>
      </Menu.Target>
    ),
    renderTopToolbarCustomActions: () => (
      <Flex gap="md">
        <Button
          leftSection={<IconPlus size={20} />}
          onClick={() => router.push('/superuser/compras/facturas-proveedor/nueva')}
          variant="filled"
          color="blue"
        >
          Registrar Nueva Factura
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
          ¿Estás seguro de que quieres eliminar la Factura de Proveedor Nº{" "}
          <Text span fw={700} c="red">
            {selectedFactura?.numeroFactura}
          </Text>
          {" "}del proveedor{" "}
          <Text span fw={700} c="red">
            {selectedFactura?.proveedor?.nombre}
          </Text>
          ?
          <br />
          Esta acción revertirá los montos facturados en la Orden de Compra asociada.
        </Text>
        <Flex justify="flex-end" gap="md" mt="md">
          <Button variant="default" onClick={closeDeleteModal}>
            Cancelar
          </Button>
          <Button color="red" onClick={handleDeleteFactura}>
            Eliminar
          </Button>
        </Flex>
      </Modal>
    </>
  );
}