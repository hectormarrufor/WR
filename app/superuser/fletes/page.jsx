'use client';

import { Title, Paper } from '@mantine/core';
import { useRouter } from 'next/navigation';

export default function FletesPage() {
  const router = useRouter();

  return (
    <Paper size="lg"  p={40}>
        <Title order={2}>
          Gestión de Flete y Operaciones
        </Title>
    </Paper>
  );
}