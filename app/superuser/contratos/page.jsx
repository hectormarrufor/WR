// app/superuser/contratos/page.js
'use client';

import { Container, Title } from '@mantine/core';
import { ContratosTable } from './contratosTable';

export default function ContratosPage() {
  return (
    <Container size="xl" py="xl">
      <Title order={2} ta="center" mb="lg">
        Gestión de Contratos
      </Title>
      <ContratosTable />
    </Container>
  );
}