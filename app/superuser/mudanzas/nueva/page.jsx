// src/app/superuser/servicios-adquiridos/[id]/mudanzas/new/page.jsx
'use client';

import { Container, Title } from '@mantine/core';
import { MudanzaForm } from '../componentes/MudanzaForm';

export default function NewMudanzaPage() {
  return (
    <Container size="xl" py="xl">
      <Title order={2} ta="center" mb="lg">
        Registrar Nueva Mudanza
      </Title>
      <MudanzaForm />
    </Container>
  );
}