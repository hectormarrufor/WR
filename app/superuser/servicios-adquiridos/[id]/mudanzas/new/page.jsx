// src/app/superuser/servicios-adquiridos/[id]/mudanzas/new/page.jsx
'use client';

import { Container } from '@mantine/core';
import { MudanzaForm } from '../../../../mudanzas/componentes/MudanzaForm';

export default function NewMudanzaPage() {
  return (
    <Container size="xl" py="xl">
      <MudanzaForm />
    </Container>
  );
}