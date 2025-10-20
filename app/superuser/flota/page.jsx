'use client';

import { Container, Title, Text, SimpleGrid, Paper, Group, ThemeIcon, rem, Menu, Button, Flex, Stack } from '@mantine/core';
import { IconBuildingWarehouse, IconAssembly, IconTruck, IconTool, IconPlus, IconShip, IconRectangleRoundedTop, IconLayersUnion, IconCar4wd, IconCar4wdFilled, IconCar, IconCategory, IconBoxModel } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import classes from './flota.module.css';

// Datos para las nuevas tarjetas de navegación
const mockdata = [
  {
    title: 'Todos los Activos',
    icon: IconBuildingWarehouse,
    color: 'blue',
    description: 'Gestiona cada activo físico individual: vehículos, skids, motores, power packs y más.',
    href: '/superuser/flota/activos', // <-- RUTA CORREGIDA
  },
  
  {
    title: 'Grupos',
    icon: IconLayersUnion,
    color: 'yellow',
    description: 'Configura y gestiona los grupos de activos (motor, vehiculo, bombas, transmision, gabarra).',
    href: '/superuser/flota/grupos', // <-- RUTA CORREGIDA
  },
  {
    title: 'Categorias',
    icon: IconCategory,
    color: 'green',
    description: 'Configura y gestiona las categorias de activos (Taladro autopropulsado, camioneta, Chuto, Lowboys).',
    href: '/superuser/flota/categorias', // <-- RUTA CORREGIDA
  },
  {
    title: 'Modelos',
    icon: IconBoxModel,
    color: 'magenta',
    description: 'Configura y gestiona los modelos (Silverado, Ikaicene, Motor Cummins IS12).',
    href: '/superuser/flota/modelos', // <-- RUTA CORREGIDA
  },
];

export default function FlotaDashboardPage() {
  const router = useRouter();

  const items = mockdata.map((item) => (
    <Paper
      key={item.title}
       
      p="md"
      radius="md"
      className={classes.card}
      onClick={() => router.push(item.href)}
    >
      <Flex>
        <ThemeIcon variant="light" color={item.color} size={48} radius="md" m={10}>
          <item.icon style={{ width: rem(28), height: rem(28) }} stroke={1.5} />
        </ThemeIcon>
        <Stack ml={10} gap={0}>
          <Text size="xl" fw={700}>{item.title}</Text>
          <Text size="sm" c="dimmed" mt={4}>{item.description}</Text>
        </Stack>
      </Flex>
    </Paper>
  ));

  return (
    <Paper size="lg"  p={40}>
      <Group justify="space-between" mb="lg">
        <Title order={2}>
          Gestión de Flota y Operaciones
        </Title>
        
        
      </Group>
      
      <Text c="dimmed" ta="left" mb="xl">
        Selecciona un módulo para comenzar a gestionar los activos físicos y las unidades operativas de la empresa.
      </Text>
      
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
        {items}
      </SimpleGrid>
    </Paper>
  );
}