'use client';

import { Button, Card, Title, Stack, Grid, SimpleGrid, useMantineTheme } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { useRouter } from 'next/navigation';

export default function SuperUserHome() {
    const router = useRouter();
    const theme = useMantineTheme();
    const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);

    return (
        <Stack justify="center" align="center" h="100vh">
            <Card
                shadow="md"
                padding="xl"
                radius="md"
                withBorder
                style={{ width: '100%', maxWidth: 1000, backgroundColor: 'white' }}
            >
                <Title order={2} align="center" mb="lg">
                    Administración
                </Title>


                <SimpleGrid
                    cols={isMobile ? 1 : 3} // diseño base en desktop
                    spacing="md"
                    breakpoints={[
                        { maxWidth: 'lg', cols: 3 },     // ≥1024px → 3 botones
                        { maxWidth: 'md', cols: 2 },     // ≥768px → 2 botones
                        { maxWidth: 'sm', cols: 1 },     // <768px → 1 botón
                    ]}
                >
                    <Button fullWidth variant="outline" color="dark" onClick={() => router.push('/superuser/flota')}>
                        Flota
                    </Button>

                    <Button fullWidth variant="outline" color="dark" disabled>
                        Usuarios (en construcción)
                    </Button>

                    <Button fullWidth variant="outline" color="dark" disabled>
                        Contratos (en construcción)
                    </Button>
                    <Button fullWidth variant="outline" color="dark" disabled>
                        Comidas (en construcción)
                    </Button>
                    <Button fullWidth variant="outline" color="dark" disabled>
                        Transporte (en construcción)
                    </Button>
                    <Button fullWidth variant="outline" color="dark" disabled>
                        Mudanzas (en construcción)
                    </Button>
                    <Button fullWidth variant="outline" color="dark" disabled>
                        Tesoreria (en construcción)
                    </Button>
                    <Button fullWidth variant="outline" color="dark" disabled>
                        Compras (en construcción)
                    </Button>
                    <Button fullWidth variant="outline" color="dark" disabled>
                        Ventas (en construcción)
                    </Button>
                    <Button fullWidth variant="outline" color="dark" disabled>
                        Inventario (en construcción)
                    </Button>
                    <Button fullWidth variant="outline" color="dark" onClick={() => router.push('./superuser/rrhh')}>
                        Recursos Humanos
                    </Button>

                    {/* Puedes seguir agregando más botones aquí */}
                </SimpleGrid>

            </Card>
        </Stack>
    );
}