'use client';

import {
  MantineReactTable,
  MRT_ColumnDef,
} from 'mantine-react-table';

import {
  Paper,
  Flex,
  Title,
  Button,
  Badge,
  Container,
  ScrollArea,
  useMantineTheme,
  MantineProvider,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

export default function FlotaPage() {
  const router = useRouter();
  const theme = useMantineTheme();
  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/vehiculos');
      setData(await res.json());
      setLoading(false);
    })();
  }, []);

  const columns = useMemo(() => [
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
  ], []);

  return (
    <Container size="100%" py="md" mx={0} px={0} >
      <Paper
        radius="md"
        p="xs"
        mt={80}
        mx={20}
        withBorder
        style={{ backgroundColor: 'rgba(255,255,255,0.9)' }}
      >
        <Flex justify="space-between" align="center" wrap="wrap" mb="md">
          <Title order={2} size={isMobile ? 'h4' : 'h2'}>
            Flota de vehículos
          </Title>
          <Button onClick={() => router.push('/superuser/flota/crear')}>
            Añadir vehículo
          </Button>
        </Flex>

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
          <ScrollArea offsetScrollbars>
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
              }}
              mantineTableBodyRowProps={({ row }) => ({
                onClick: () => router.push(`/superuser/flota/${row.original.id}`),
                style: { cursor: 'pointer' },
              })}
            />
          </ScrollArea>
        </MantineProvider>
      </Paper>
    </Container>
  );
}