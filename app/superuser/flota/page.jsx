'use client';

import { useEffect, useMemo, useState } from 'react';
import { MantineReactTable } from 'mantine-react-table';
import { Paper, Flex, Title, Button } from '@mantine/core';
import { useRouter } from 'next/navigation';

export default function FlotaPage() {
  const router = useRouter();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Carga de datos
  useEffect(() => {
    (async () => {
      const res = await fetch('/api/vehiculos');
      setData(await res.json());
      setLoading(false);
    })();
  }, []);

  // Columnas personalizadas
  const columns = useMemo(
    () => [
      { accessorKey: 'marca', header: 'Marca' },
      { accessorKey: 'modelo', header: 'Modelo' },
      { accessorKey: 'placa', header: 'Placa' },
      { accessorKey: 'ano', header: 'Año' },
      { accessorKey: 'tipo', header: 'Tipo' },
      { accessorKey: 'tipoPeso', header: 'Peso' },
      { accessorKey: 'ejes', header: 'Ejes' },
      { accessorKey: 'kilometraje', header: 'Kilometraje' },
      {
        accessorFn: (row) => row.motor?.aceite?.status ?? '',
        id: 'estadoAceite',
        header: 'Estado aceite',
      },
    ],
    []
  );

  return (
    <Paper
      withBorder
      radius="md"
      p="md"
      mt={90}
      sx={{ backgroundColor: 'rgba(255,255,255,0.95)' }}
    >
      <Flex justify="space-between" align="center" mb="md">
        <Title order={2}>Flota de vehículos</Title>
        <Button onClick={() => router.push('/superuser/flota/crear')}>
          Añadir vehículo
        </Button>
      </Flex>

      <MantineReactTable
        columns={columns}
        data={data}
        state={{ isLoading: loading }}
        enableColumnFilters
        enableSorting
        enablePagination
        mantineTableProps={{
          striped: true,
          highlightOnHover: true,
          withBorder: false,
          sx: { fontSize: '14px' },
        }}
        // Cada fila es clicable y navega al detalle
        mantineTableBodyRowProps={({ row }) => ({
          onClick: () => router.push(`/superuser/flota/${row.original.id}`),
          style: { cursor: 'pointer' },
        })}
      />
    </Paper>
  );
}