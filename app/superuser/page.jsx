'use client';

import { Button, Card, Title, Stack, Grid } from '@mantine/core';
import { useRouter } from 'next/navigation';

export default function SuperUserHome() {
  const router = useRouter();

  return (
    <Stack justify="center" align="center" h="100vh">
      <Card
        shadow="md"
        padding="xl"
        radius="md"
        withBorder
        style={{ width: '100%', maxWidth: 600, backgroundColor: 'white' }}
      >
        <Title order={2} align="center" mb="lg">
          Administración
        </Title>

        <Grid grow>
          <Grid.Col span={4}>
            <Button
              fullWidth
              variant="outline"
              color="dark"
              onClick={() => router.push('/superuser/flota')}
            >
              Flota
            </Button>
          </Grid.Col>
          <Grid.Col span={4}>
            <Button
              fullWidth
              variant="outline"
              color="dark"
              onClick={() => router.push('/superuser/usuarios')}
            >
              Usuarios
            </Button>
          </Grid.Col>
          <Grid.Col span={4}>
            <Button
              fullWidth
              variant="outline"
              color="dark"
              onClick={() => router.push('/superuser/orders')}
            >
              Orders
            </Button>
          </Grid.Col>
        </Grid>
      </Card>
    </Stack>
  );
}