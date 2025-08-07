import { Suspense } from 'react';
import { Paper, Title, Loader, Center } from '@mantine/core';
import OrdenMantenimientoForm from './OrdenMantenimientoForm';

export default function NuevaOrdenPage() {
  return (
    <Paper withBorder p="xl" mt={30}>
      <Title order={2} mb="xl">Nueva Orden de Mantenimiento</Title>
      
      <Suspense fallback={<Center h={200}><Loader /></Center>}>
        <OrdenMantenimientoForm />
      </Suspense>

    </Paper>
  );
}