// app/superuser/inventario/page.js
'use client';

import { Button, Card, Title, Stack, SimpleGrid, useMantineTheme, Group} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { useRouter } from 'next/navigation';


export default function InventarioDashboardPage() {
    const router = useRouter();
    const theme = useMantineTheme();
    const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);

    return (
        <Stack justify="center" align="center" h="100vh">
            <Card
                shadow="md"
                padding="xl"
                radius="md"
                 
                style={{ width: '100%', maxWidth: 800, backgroundColor: 'white' }}
            >
                <Title order={2} align="center" mb="lg">
                    Módulo de Inventario
                </Title>

                <SimpleGrid
                    cols={isMobile ? 1 : 2}
                    spacing="md"
                    breakpoints={[
                        { maxWidth: 'lg', cols: 2 },
                        { maxWidth: 'md', cols: 1 },
                    ]}
                >
                    <Button fullWidth variant="filled" onClick={() => router.push('/superuser/inventario/consumibles')}>
                        Gestión de Consumibles 📦
                    </Button>
                    <Button fullWidth variant="filled" onClick={() => router.push('/superuser/inventario/entradas')}>
                        Entradas de Inventario 📥
                    </Button>
                    <Button fullWidth variant="filled" onClick={() => router.push('/superuser/inventario/salidas')}>
                        Salidas de Inventario 📤
                    </Button>
                    <Button fullWidth variant="filled" onClick={() => router.push('/superuser/inventario/consumibles-usados')}>
                        Consumibles Usados 🛠️
                    </Button>
                    <Button fullWidth variant="filled" onClick={() => router.push('/superuser/inventario/tipos-consumibles')}>
                        Editar tipos de consumibles 🛠️
                    </Button>
                    {/* Puedes añadir más botones relacionados con inventario aquí, ej. Ajustes, Reportes */}
                </SimpleGrid>

                <Group justify="flex-end" mt="xl">
                    <Button variant="default" onClick={() => router.push('/superuser')}>
                        Volver al Menú Principal
                    </Button>
                </Group>
            </Card>
        </Stack>
    );
}