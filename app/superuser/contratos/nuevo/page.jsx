// app/superuser/contratos/nuevo/page.js
'use client';

import { Container } from '@mantine/core';
import { ContratoForm } from '../ContratoFormulary';

export default function NuevoContratoPage() {
  return (
    <Container size="xl" py="xl">
      <ContratoForm />
    </Container>
  );
}