// app/superuser/operaciones-campo/nuevo/page.js
'use client';

import { Container } from '@mantine/core';
import { OperacionCampoForm } from '../../../../operaciones-campo/componentes/OperacionCampoForm';

export default function NuevaOperacionCampoPage() {
  return (
    <Container size="xl" py="xl">
      <OperacionCampoForm />
    </Container>
  );
}