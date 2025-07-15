// app/superuser/operaciones-campo/page.js
'use client';

import { Container, Title } from '@mantine/core';
import { OperacionesCampoTable } from './componentes/OperacionesCampoTable';

export default function OperacionesCampoPage() {
  return (
    <Container size="xl" py="xl">
      <Title order={2} ta="center" mb="lg">
        Gestión de Operaciones de Campo
      </Title>
      <OperacionesCampoTable />
    </Container>
  );
}