'use client'
import { theme } from '@/theme';
import { Button, Group, Title, Paper, Stack } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import Link from 'next/link';

export default function EstimacionCostosMenu() {
   const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);
 
  return (
    <Stack py={isMobile? 0 : "xl"}  h="80vh"  justify='center' align='center' w="100%" >
      <Paper justify="center" shadow="sm" padding={isMobile? 0 : "lg"} w={isMobile? "100%" : "40%"}  >
        <Title order={2} mb="lg">Módulo de estimación de costos</Title>
        <Stack>
          <Button component={Link} href="/superuser/estimacion-costos/nuevo">Estimar nuevo costo</Button>
          <Button component={Link} href="/superuser/estimacion-costos/ver">Ver estimaciones</Button>
          <Button component={Link} href="/superuser/estimacion-costos/parametros">Modificar parámetros</Button>
        </Stack>
      </Paper>
    </Stack>
  );
}