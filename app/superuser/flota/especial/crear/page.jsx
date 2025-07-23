// app/superuser/flota/especial/crear/page.jsx
'use client';

import { Title, Paper, Center, Text, SimpleGrid, Card, useMantineTheme, Loader } from '@mantine/core'; // Importar Loader
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react'; // Importar useEffect, useState, useCallback
import { notifications } from '@mantine/notifications';

// Importa los iconos relevantes para cada tipo de equipo especial
import { 
  IconTools, 
  IconDrill, 
  IconCrane, 
  IconGauge, 
  IconBolt, 
  IconBucket, 
  IconFlame, 
  IconTruckLoading 
} from '@tabler/icons-react';
import { httpGet } from '../../../../ApiFunctions/httpServices';

export default function CrearEquipoEspecialPage() {
  const router = useRouter();
  const theme = useMantineTheme();
  
  const [tiposEquiposEspeciales, setTiposEquiposEspeciales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Mapeo de nombres de tipo a iconos (puedes expandirlo según tus tipos)
  const iconMap = {
    "Coiled Tubing": IconGauge,
    "Snubbing": IconCrane,
    "Wireline": IconBolt,
    "Taladro": IconDrill,
    "Cementacion": IconBucket,
    "Fractura": IconFlame,
    // Puedes tener un icono por defecto si no hay una coincidencia
    "default": IconTruckLoading,
  };

  const fetchTiposEquiposEspeciales = useCallback(async () => {
    setLoading(true);
    try {
      // API para obtener todos los tipos de equipos especiales
      const data = await httpGet('/api/tiposEquiposEspeciales'); // <-- Esta es la API a la que llamamos
      setTiposEquiposEspeciales(data);
    } catch (err) {
      console.error('Error al cargar tipos de equipos especiales:', err);
      setError('No se pudieron cargar los tipos de equipos especiales.');
      notifications.show({
        title: 'Error',
        message: 'No se pudieron cargar los tipos de equipos especiales.',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTiposEquiposEspeciales();
  }, [fetchTiposEquiposEspeciales]);

  const handleSelectType = (typeNombre) => {
    // Codifica el nombre del tipo para pasarlo en la URL
    const encodedType = encodeURIComponent(typeNombre);
    router.push(`/superuser/flota/especial/crear/${encodedType}`);
  };

  if (loading) {
    return (
      <Center style={{ minHeight: 'calc(100vh - 120px)' }}>
        <Loader size="lg" />
        <Text ml="md">Cargando tipos de equipos especiales...</Text>
      </Center>
    );
  }

  if (error) {
    return (
      <Center style={{ minHeight: 'calc(100vh - 120px)' }}>
        <Text color="red">{error}</Text>
      </Center>
    );
  }

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
          Selecciona el Tipo de Equipo Especial a Registrar
        </Title>

        <SimpleGrid 
          cols={{ base: 1, sm: 2, lg: 3 }}
          spacing="lg" 
          verticalSpacing="lg"
        >
          {tiposEquiposEspeciales.map((option) => {
            const IconComponent = iconMap[option.nombre] || iconMap.default; // Obtener el componente de icono
            return (
              <Card 
                key={option.id} // Usar el ID del tipo como key
                shadow="sm" 
                p="lg" 
                radius="md" 
                withBorder 
                component="button"
                onClick={() => handleSelectType(option.nombre)} // Pasar el nombre del tipo
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  textAlign: 'center',
                  textDecoration: 'none',
                  color: theme.colors.text,
                  cursor: 'pointer',
                  border: 'none',
                  backgroundColor: theme.colors.gray[0],
                }}
                sx={{ 
                  transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out, background-color 0.2s ease-in-out', 
                  '&:hover': {
                    transform: 'translateY(-8px) scale(1.02)',
                    boxShadow: theme.shadows.xl,
                    backgroundColor: theme.colors.blue[0],
                  }
                }}
              >
                <IconComponent size={48} style={{ marginBottom: theme.spacing.md, color: theme.colors.blue[6] }} />
                <Title order={4} mb="xs">{option.nombre}</Title>
                <Text size="sm" c="dimmed">{option.descripcion}</Text>
              </Card>
            );
          })}
        </SimpleGrid>
      </Paper>
    </Center>
  );
}