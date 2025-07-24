'use client';

import { Container, Title, Text, SimpleGrid, Paper, Group, ThemeIcon, rem, Menu, Button } from '@mantine/core';
import { IconBuildingWarehouse, IconAssembly, IconTruck, IconTool, IconPlus } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import classes from './flota.module.css';

// Datos para las nuevas tarjetas de navegación
const mockdata = [
  {
    title: 'Inventario de Activos',
    icon: IconBuildingWarehouse,
    color: 'blue',
    description: 'Gestiona cada activo físico individual: vehículos, skids, motores, power packs y más.',
    href: '/superuser/flota/activos', // <-- RUTA CORREGIDA
  },
  {
    title: 'Unidades Operativas',
    icon: IconAssembly,
    color: 'teal',
    description: 'Configura y gestiona los equipos funcionales ensamblados, listos para el servicio en campo.',
    href: '/superuser/flota/unidades', // <-- RUTA CORREGIDA
  },
];

export default function FlotaDashboardPage() {
  const router = useRouter();

  const items = mockdata.map((item) => (
    <Paper
      key={item.title}
      withBorder
      p="md"
      radius="md"
      className={classes.card}
      onClick={() => router.push(item.href)}
    >
      <Group>
        <ThemeIcon variant="light" color={item.color} size={48} radius="md">
          <item.icon style={{ width: rem(28), height: rem(28) }} stroke={1.5} />
        </ThemeIcon>
        <div>
          <Text size="xl" fw={700}>{item.title}</Text>
          <Text size="sm" c="dimmed" mt={4}>{item.description}</Text>
        </div>
      </Group>
    </Paper>
  ));

  return (
    <Container size="lg" my="xl">
      <Group justify="space-between" mb="lg">
        <Title order={2}>
          Gestión de Flota y Operaciones
        </Title>
        
        <Menu shadow="md" width={280}>
          <Menu.Target>
            <Button leftSection={<IconPlus size={18} />}>
              Añadir Nuevo Activo
            </Button>
          </Menu.Target>

          <Menu.Dropdown>
            <Menu.Label>Selecciona el tipo de activo a registrar</Menu.Label>
            <Menu.Item
              leftSection={<IconTruck style={{ width: rem(16), height: rem(16) }} />}
              component={Link}
              href="/superuser/flota/activos/vehiculos/crear" // <-- RUTA CORREGIDA
            >
              Registrar Vehículo
              <Text size="xs" c="dimmed">Camionetas, chutos, chasis autopropulsados, etc.</Text>
            </Menu.Item>
            <Menu.Item
              leftSection={<IconTool style={{ width: rem(16), height: rem(16) }} />}
              component={Link}
              href="/superuser/flota/activos/componentes/crear" // <-- RUTA CORREGIDA
            >
              Registrar Componente Mayor
              <Text size="xs" c="dimmed">Skids de bombeo, power packs, carretes, cabrias, etc.</Text>
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>
      
      <Text c="dimmed" ta="left" mb="xl">
        Selecciona un módulo para comenzar a gestionar los activos físicos y las unidades operativas de la empresa.
      </Text>
      
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
        {items}
      </SimpleGrid>
    </Container>
  );
}