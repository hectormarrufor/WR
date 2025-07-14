// app/superuser/rrhh/empleados/page.js
'use client';

import { Container, Title } from '@mantine/core';
import EmpleadosTable from './EmpleadosTable';

export default function EmpleadosPage() {
  return (
    <Container size="xl" py="xl">
      <Title order={2} ta="center" mb="lg">
        Listado de Empleados
      </Title>
      <EmpleadosTable />
    </Container>
  );
}