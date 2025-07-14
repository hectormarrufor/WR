// app/superuser/rrhh/page.js
'use client'; // Si estás usando Next.js App Router, esto es necesario para componentes con interactividad

import { SimpleGrid, Button, Title, Container, Flex, Paper } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { useRouter } from 'next/navigation'; // O 'next/router' si usas Pages Router
import { IconUsers, IconBuildingCommunity, IconUserScan } from '@tabler/icons-react'; // Iconos para mejor UX

export default function RRHHDashboardPage() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const router = useRouter();

  return (
    <Container size="xl" py="xl">
      <Paper p="xl" mt={100}>
        <Flex direction="column" align="center" mb="lg">
          <Title order={2} ta="center" mb="md">
            Gestión de Recursos Humanos
          </Title>
          <p>Selecciona una opción para administrar los recursos humanos de la empresa.</p>
        </Flex>
        <SimpleGrid
          cols={isMobile ? 1 : 2}
          spacing="md"
          breakpoints={[
            { maxWidth: 'lg', cols: 2 },
            { maxWidth: 'md', cols: 2 },
            { maxWidth: 'sm', cols: 1 },
          ]}
        >
          <Button
            fullWidth
            variant="outline"
            color="blue"
            leftSection={<IconUsers size={20} />}
            onClick={() => router.push('/superuser/rrhh/empleados')}
          >
            Administrar Empleados
          </Button>
          <Button
            fullWidth
            variant="outline"
            color="teal"
            leftSection={<IconBuildingCommunity size={20} />}
            onClick={() => router.push('/superuser/rrhh/puestos')} // Crearás esta página después
          >
            Administrar Puestos
          </Button>
          <Button
            fullWidth
            variant="outline"
            color="grape"
            leftSection={<IconUserScan size={20} />}
            onClick={() => router.push('/superuser/rrhh/asignacion-puestos')} // Crearás esta página después
          >
            Asignación de Puestos
          </Button>
          {/* Puedes añadir más botones para otros sub-módulos de RRHH aquí */}
        </SimpleGrid>
      </Paper>
    </Container>
  );
}   