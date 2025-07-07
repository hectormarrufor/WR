'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Paper, Flex, Title, Button, Group, rem } from '@mantine/core';
import { MantineReactTable } from 'mantine-react-table';
import { IconEdit, IconTrash } from '@tabler/icons-react';

export default function flota() {
  const router = useRouter();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Carga de datos
  const fetchVehiculos = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/vehiculos');
    setData(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchVehiculos();
  }, [fetchVehiculos]);

  // Eliminación
  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar vehículo?')) return;
    await fetch(`/api/vehiculos/${id}`, { method: 'DELETE' });
    fetchVehiculos();
  };

  // Definición de columnas con sorting y filtering habilitados
  const columns = useMemo(
    () => [
      { accessorKey: 'id', header: 'ID', enableSorting: true, enableColumnFilter: true, size: 60 },
      { accessorKey: 'modelo', header: 'Modelo', enableSorting: true, enableColumnFilter: true },
      { accessorKey: 'placa', header: 'Placa', enableSorting: true, enableColumnFilter: true },
      { accessorKey: 'color', header: 'Color', enableSorting: true, enableColumnFilter: true },
      { accessorKey: 'año',   header: 'Año',   enableSorting: true, enableColumnFilter: true, size: 80 },
      {
        id: 'actions',
        header: 'Acciones',
        size: 100,
        enableSorting: false,
        enableColumnFilter: false,
        Cell: ({ row }) => (
          <Group position="right" spacing="xs">
            <IconEdit
              size={18}
              style={{ cursor: 'pointer' }}
              onClick={() => router.push(`/superuser/flota/${row.original.id}/editar`)}
            />
            <IconTrash
              size={18}
              style={{ cursor: 'pointer' }}
              onClick={() => handleDelete(row.original.id)}
            />
          </Group>
        ),
      },
    ],
    [handleDelete, router]
  );

  return (
    <Paper
      withBorder
      radius="md"
      p="md"
      sx={{ backgroundColor: 'rgba(255, 255, 255, 0.9)' }}
      mt={120}
    >
      {/* Cabecera con botón “Añadir” */}
      <Flex justify="space-between" align="center" mb="md">
        <Title order={2}>Mi flota de vehículos</Title>
        <Button
          size="sm"
          onClick={() => router.push('/superuser/flota/crear')}
        >
          Añadir nuevo vehículo
        </Button>
      </Flex>

      {/* Tabla con filtros y orden */}
      <MantineReactTable
        columns={columns}
        data={data}
        initialState={{
          pagination: { pageSize: 10, pageIndex: 0 },
          sorting: [{ id: 'id', desc: false }],
        }}
        enableRowSelection={false}
        enableColumnActions={false}
        enableGlobalFilter={false}
        muiTablePaperProps={{ elevation: 0 }}
        state={{ isLoading: loading }}
      />
    </Paper>
  );
}