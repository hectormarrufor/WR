'use client';

import { useEffect, useMemo, useState } from 'react';
import { MantineReactTable } from 'mantine-react-table';
import { Paper, Flex, Title, Button, Badge, MantineProvider } from '@mantine/core';
import { useRouter } from 'next/navigation';

export default function FlotaPage() {
  const router = useRouter();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/vehiculos');
      setData(await res.json());
      setLoading(false);
    })();
  }, []);

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
        accessorKey: 'estado',
        header: 'Estado',
        Cell: ({ cell }) => {
          const val = cell.getValue();
          const color =
            val === 'OK'
              ? 'green'
              : val === 'Próximo a mantenimiento'
                ? 'orange'
                : 'red';

          return <Badge color={color}>{val}</Badge>;
        },
      },
    ],
    []
  );

  return (
    <Paper
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

      <MantineProvider theme={{
        "components": {
          "ActionIcon": {
            "styles": {
              "root": {
                "backgroundColor": "rgba(178,34,34,0)",
                "color": "black",
                "textTransform": "uppercase",
                "fontWeight": 700
              }
            }
          }
        },
      }}>
        <MantineReactTable
          columns={columns}
          data={data}
          state={{ isLoading: loading }}
          enableColumnFilters
          enableSorting
          enablePagination

          mantineTableBodyRowProps={({ row }) => ({
            onClick: () => router.push(`/superuser/flota/${row.original.id}`),
            style: { cursor: 'pointer' },
          })}
        />
      </MantineProvider>
    </Paper>
  );
}