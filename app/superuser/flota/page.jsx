// app/superuser/flota/crear/page.jsx
'use client';

import { Title, Paper, Group, Button, Center, Box, Text, Flex, Stack, Divider, SimpleGrid, Card, useMantineTheme } from '@mantine/core';
import { useRouter } from 'next/navigation';
import { IconCar, IconTruckLoading, IconTools, IconShip } from '@tabler/icons-react';
import classes from './CrearFlotaPage.module.css'; // ¡Importar el módulo CSS!

export default function CrearFlotaPage() {
  const router = useRouter();
  const theme = useMantineTheme();

  const options = [
    {
      href: "/superuser/flota/vehiculo",
      icon: IconCar,
      title: "Vehículo (Liviano/Pesado)",
      description: "Camionetas, sedanes, camiones chuto, lowboy, volquetes, cisternas, montacargas, grúas (móviles sobre camión)."
    },
    {
      href: "/superuser/flota/especial",
      icon: IconTruckLoading,
      title: "Equipo Especial",
      description: "Unidades completas de operación (p.ej., Coiled Tubing (montado en camión), Snubbing, Wireline, Cementación, Fractura, Taladros de perforación (si son móviles))."
    },
    {
      href: "/superuser/flota/equipo",
      icon: IconTools,
      title: "Equipo",
      description: "Componentes independientes que forman parte de unidades mayores o gabarras. (p.ej., Bombas (centrifugas, alta presion, bomba de trasnferencia de gasoil y otras), Generadores, Compresores, Unidad de Coiled Tubing (remolcado/sin motor), Cabina de control)."
    },
    {
      href: "/superuser/flota/gabarra",
      icon: IconShip,
      title: "Gabarra (Offshore)",
      description: "Unidades flotantes para operaciones marítimas (p.ej., gabarras de perforación, de producción, de alojamiento). Pueden vincular equipos modulares."
    }
  ];

  return (
    <Center style={{ minHeight: 'calc(100vh - 120px)' }}>
      <Paper 
        withBorder 
        shadow="md" 
        p="xl" 
        radius="md" 
        mt={70}
        style={{ width: '90%', maxWidth: theme.breakpoints.xl }}
      >
        <Title order={2} ta="center" mb="xl">
          Selecciona el Tipo de Recurso a Gestionar
        </Title>

        <SimpleGrid 
          cols={{ base: 1, sm: 2, lg: 2 }}
          spacing="lg" 
          verticalSpacing="lg"
        >
          {options.map((option, index) => (
            <Card 
              key={index} 
              shadow="sm" 
              p="lg" 
              radius="md" 
              withBorder 
              component="a"
              href={option.href}
              className={classes.cardOption} // ¡Aplicar la clase CSS aquí!
              // Eliminar los props 'style' y 'sx' que contenían estilos de hover
            >
              <option.icon size={48} style={{ marginBottom: theme.spacing.md, color: theme.colors.blue[6] }} />
              <Title order={4} mb="xs">{option.title}</Title>
              <Text size="sm" c="dimmed">{option.description}</Text>
            </Card>
          ))}
        </SimpleGrid>
      </Paper>
    </Center>
  );
}