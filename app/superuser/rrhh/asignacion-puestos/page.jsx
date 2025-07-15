// app/superuser/rrhh/asignacion-puestos/page.js
'use client';

import { Container, Title } from '@mantine/core';
import { AsignacionPuestoTable } from './AsignacionPuestoTable';

export default function AsignacionPuestosPage() {
  return (
    <Container size="xl" py="xl">
      <Title order={2} ta="center" mb="lg">
        Gestión de Asignaciones de Puestos
      </Title>
      <AsignacionPuestoTable />
    </Container>
  );
}