// Este componente AHORA es un Server Component. No usa hooks.
import { Suspense } from 'react';
import { Container, Center, Loader, Text } from '@mantine/core';
import OperacionCampoDetailContent from '../componentes/OperacionCampolDetailContent';

export default function OperacionCampoDetailPage({ params }) {
  return (
    <Container size="xl" py="xl">
      <Suspense fallback={
        <Center style={{ height: '300px' }}>
          <Loader size="lg" />
          <Text ml="md">Cargando detalles de la operación...</Text>
        </Center>
      }>
        {/* Pasamos los params al componente cliente */}
        <OperacionCampoDetailContent params={params} />
      </Suspense>
    </Container>
  );
}