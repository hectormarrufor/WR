'use client'
import { Suspense } from 'react';
import { Title, Loader, Center } from '@mantine/core';
import OrdenMantenimientoForm from './OrdenMantenimientoForm';
import PaddedPaper from '@/app/superuser/flota/components/PaddedPaper';

export default function NuevaOrdenPage() {
  return (
    <PaddedPaper>
      <Title order={2} align='center'>Nueva Orden de Mantenimiento</Title>
      
      <Suspense fallback={<Center h={200}><Loader /></Center>}>
        <OrdenMantenimientoForm />
      </Suspense>

    </PaddedPaper>
  );
}