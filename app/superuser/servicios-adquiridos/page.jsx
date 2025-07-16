// src/app/superuser/servicios-adquiridos/page.jsx
'use client';

import { Container, Title } from '@mantine/core';
import { ServiciosAdquiridosTable } from './componentes/ServiciosAdquiridosTable'; // Ruta correcta al componente

export default function ServiciosAdquiridosPage() {
  return (
    <Container size="xl" py="xl">
      <Title order={2} ta="center" mb="lg">
        Servicios Adquiridos (Fases de Contrato)
      </Title>
      <ServiciosAdquiridosTable />
    </Container>
  );
}