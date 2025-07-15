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
import { notifications } from '@mantine/notifications';

export default function FlotaPage() {
  const router = useRouter();
  const theme = useMantineTheme();
  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/vehiculos');
      const data = await res.json();
      let vs = data.map(v => {return {
        id: v.id,
        ano: v.ano,
        color: v.color,
        createdAt: v.createdAt,
        tipo: v.fichaTecnica.tipo,
        tipoPeso: v.fichaTecnica.tipoPeso,
        // fichaTecnica: v.fichaTecnica,
        horometro: v.horometros?.length > 0 ? v.horometros[0].horas  : 0,
        imagen: v.imagen,
        ejes: v.fichaTecnica.ejes,
        inspecciones: v.inspecciones,
        kilometraje: v.kilometrajes?.length > 0 ? v.kilometrajes[0].kilometrajeActual : 0,
        mantenimientos: v.mantenimientos,
        marca: v.marca,
        modelo: v.modelo,
        placa: v.placa,
        updatedAt: v.updatedAt,
        vin: v.vin,
        estado: v.estadoOperativoGeneral

      }})
      console.log(vs)
      setData(vs);
      setLoading(false);
    })();
  }, []);

  const columns = useMemo(() => {
    const baseColumns = [
      { accessorKey: 'marca', header: 'Marca' },
      { accessorKey: 'modelo', header: 'Modelo' },
      { accessorKey: 'placa', header: 'Placa' },
      {
        accessorKey: 'estado',
        header: 'Estado',
        Cell: ({ cell }) => {
          const val = cell.getValue();
          const color =
            val === 'Operativo'
              ? 'green'
              : val === 'Operativo con Advertencias'
                ? 'orange'
                : val === 'No operativo' ? 'red' :
                val === 'En Taller' ? 'blue':
                val === 'Desconocido' && 'gray';
                ;
          return <Badge color={color}>{val}</Badge>;
        },
      },
    ];

    const extraColumns = [
      { accessorKey: 'ano', header: 'Año' },
      { accessorKey: 'tipo', header: 'Tipo' },
      { accessorKey: 'tipoPeso', header: 'Peso' },
      { accessorKey: 'ejes', header: 'Ejes' },
      { accessorKey: 'kilometraje', header: 'Kilometraje' },
    ];

    return isMobile ? baseColumns : [...baseColumns, ...extraColumns];
  }, [isMobile]);

  return (
    <Container size="100%" py="md" mx={0} px={0} >
      <Paper
        radius={isMobile ? 0 : "md"}
        p={isMobile ? 0 : "xs"}
        mt={80}
        mx={isMobile ? 0 : 20}
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
          <ScrollArea w="100%" p={0}>
            <MantineReactTable
              columns={columns}
              data={data}
              state={{ isLoading: loading }}
              w="100%"
              enableColumnFilters
              enableDensityToggle={false}
              enableFullScreenToggle={false}
              enableHiding={false}
              enableSorting={false}
              enablePagination
              mantineTableHeadCellProps={{
                style: {
                  backgroundColor: "lightblue"
                }
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