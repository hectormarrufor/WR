// app/superuser/operaciones-campo/nuevo/page.js
'use client';

import { OperacionCampoForm } from '@/components/operaciones-campo/OperacionCampoForm';
import { Container } from '@mantine/core';

export default function NuevaOperacionCampoPage() {
  return (
    <Container size="xl" py="xl">
      <OperacionCampoForm />
    </Container>
  );
}