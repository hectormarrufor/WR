'use client'
import { Suspense } from 'react';
import { Title, Loader, Center } from '@mantine/core';
import OrdenMantenimientoForm from './OrdenMantenimientoForm';

export default function NuevaOrdenPage() {
  return (
    <Paper>
      <Title order={2} align='center'>Nueva Orden de Mantenimiento</Title>
      
      <Suspense fallback={<Center h={200}><Loader /></Center>}>
        <OrdenMantenimientoForm />
      </Suspense>

    </Paper>
  );
}