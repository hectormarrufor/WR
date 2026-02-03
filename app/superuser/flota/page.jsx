'use client';

import { Container, Title, Text, SimpleGrid, Group, ThemeIcon, rem, Flex, Stack, Loader, Center, Card, ActionIcon } from '@mantine/core';
import { IconBuildingWarehouse, IconBoxModel, IconChevronLeft } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth'; // Asumo que tu hook está aquí

// Datos del menú
const mockdata = [
  {
    title: 'Todos los Activos',
    icon: IconBuildingWarehouse,
    color: 'blue',
    description: 'Inventario físico completo: vehículos, maquinaria, herramientas y equipos.',
    href: '/superuser/flota/activos',
  },
  {
    title: 'Gestión de Modelos',
    icon: IconBoxModel,
    color: 'pink', // Un color vibrante para diferenciar
    description: 'Configuración de fichas técnicas, marcas y modelos (Silverado, Granite, etc.).',
    href: '/superuser/flota/modelos',
  },
];

export default function FlotaDashboardPage() {
  const router = useRouter();
  const { userId } = useAuth(); // Obtenemos el ID
  
  // Estado para controlar la carga inicial de autenticación
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  
  // Estado para la navegación manual (cuando hacen click en una tarjeta)
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    // Simulamos una pequeña espera o esperamos a que userId tenga valor
    // Nota: Si useAuth tiene una propiedad 'loading', úsala en la condición.
    if (userId !== undefined && userId !== null) {
        if (userId !== 1) {
            // NO ES EL SUPERADMIN (ID 1) -> REDIRIGIR
            router.replace('/superuser/flota/activos');
        } else {
            // ES EL SUPERADMIN -> MOSTRAR DASHBOARD
            setIsAuthChecking(false);
        }
    }
  }, [userId, router]);

  const handleNavigate = (href) => {
    setIsNavigating(true);
    router.push(href);
  }

  // 1. Mostrar Loader si estamos verificando permisos, redirigiendo o navegando
  if (isAuthChecking || isNavigating) {
    return (
      <Center style={{ height: '70vh' }}>
        <Stack align="center" gap="md">
            <Loader size="lg" type="dots" />
            <Text c="dimmed" size="sm">
                {isAuthChecking ? 'Verificando permisos...' : 'Cargando módulo...'}
            </Text>
        </Stack>
      </Center>
    );
  }

  // 2. Renderizar Dashboard (Solo si pasó la validación)
  const items = mockdata.map((item) => (
    <Card
      key={item.title}
      shadow="sm"
      padding="lg"
      radius="md"
      withBorder
      onClick={() => handleNavigate(item.href)}
      style={{ 
          cursor: "pointer", 
          transition: 'transform 0.2s ease, box-shadow 0.2s ease' 
      }}
      onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-5px)';
          e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
      }}
      onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'var(--mantine-shadow-sm)';
      }}
    >
      <Flex align="flex-start">
        <ThemeIcon 
            variant="light" 
            color={item.color} 
            size={60} 
            radius="md" 
        >
          <item.icon style={{ width: rem(32), height: rem(32) }} stroke={1.5} />
        </ThemeIcon>
        
        <Stack ml="md" gap={5}>
          <Text size="lg" fw={700} style={{ lineHeight: 1.2 }}>
            {item.title}
          </Text>
          <Text size="sm" c="dimmed" style={{ lineHeight: 1.4 }}>
            {item.description}
          </Text>
        </Stack>
      </Flex>
    </Card>
  ));

  return (
    <Container size="xl" py="xl">
        {/* Encabezado */}
      <Group justify="space-between" mb="xl" align="center">
         <Group>
            {/* Opcional: Botón Atrás si vienes de un nivel superior */}
            <ActionIcon variant="subtle" color="gray" size="xl" onClick={() => router.back()}>
                <IconChevronLeft size={28} />
            </ActionIcon>
            <div>
                <Title order={2}>Operaciones de Flota</Title>
                <Text c="dimmed">Administración centralizada de activos y configuraciones</Text>
            </div>
         </Group>
      </Group>
      
      {/* Grid de Tarjetas */}
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        {items}
      </SimpleGrid>
    </Container>
  );
}