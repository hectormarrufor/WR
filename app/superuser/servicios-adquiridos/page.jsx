// src/app/superuser/servicios-adquiridos/page.jsx
'use client';

import {  Paper, Title } from '@mantine/core';
import { ServiciosAdquiridosTable } from './componentes/ServiciosAdquiridosTable'; // Ruta correcta al componente

export default function ServiciosAdquiridosPage() {
  return (
    <Paper size="xl" py="xl" mt={60} shadow='xl'px={10} mx={30}>
      <Title order={2} ta="center" mb="lg">
        Servicios Adquiridos (Fases de Contrato)
      </Title>
      <ServiciosAdquiridosTable />
    </Paper>
  );
}