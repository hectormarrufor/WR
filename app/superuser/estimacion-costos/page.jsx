import { Button, Group, Container, Title } from '@mantine/core';
import Link from 'next/link';

export default function EstimacionCostosMenu() {
  return (
    <Container py="xl">
      <Title order={2} mb="lg">Módulo de estimación de costos</Title>
      <Group grow>
        <Button component={Link} href="/superuser/estimacion-costos/nuevo">Estimar nuevo costo</Button>
        <Button component={Link} href="/superuser/estimacion-costos/ver">Ver estimaciones</Button>
        <Button component={Link} href="/superuser/estimacion-costos/parametros">Modificar parámetros</Button>
      </Group>
    </Container>
  );
}