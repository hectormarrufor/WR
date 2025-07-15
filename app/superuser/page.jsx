// app/superuser/page.js
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
                        { maxWidth: 'lg', cols: 3 },    // ≥1024px → 3 botones
                        { maxWidth: 'md', cols: 2 },    // ≥768px → 2 botones
                        { maxWidth: 'sm', cols: 1 },    // <768px → 1 botón
                    ]}
                >
                    <Button fullWidth variant="outline" color="dark" onClick={() => router.push('/superuser/flota')}>
                        Flota (casi listo)
                    </Button>

                    <Button fullWidth variant="outline" color="dark" disabled>
                        Usuarios (por comenzar)
                    </Button>

                    <Button fullWidth variant="outline" color="dark" onClick={() => router.push('/superuser/contratos')}>
                        Contratos (en construcción)
                    </Button>

                    <Button fullWidth variant="outline" color="dark" onClick={() => router.push('/superuser/operaciones-campo')}>
                        Operaciones (en construcción)
                    </Button>

                    <Button fullWidth variant="outline" color="dark" disabled>
                        Comidas (por comenzar)
                    </Button>

                    <Button fullWidth variant="outline" color="dark" disabled>
                        Transporte (por comenzar)
                    </Button>

                    <Button fullWidth variant="outline" color="dark" disabled>
                        Mudanzas (por comenzar)
                    </Button>

                    <Button fullWidth variant="outline" color="dark" disabled>
                        Tesoreria (por comenzar)
                    </Button>

                    {/* Habilitamos el botón de Compras y lo dirigimos a su dashboard */}
                    <Button fullWidth variant="outline" color="dark" onClick={() => router.push('/superuser/compras')}>
                        Compras (en construcción)
                    </Button>

                    <Button fullWidth variant="outline" color="dark" onClick={() => router.push('/superuser/facturacion')}>
                        Cobranza / Facturación (en construcción)
                    </Button>

                    {/* Habilitamos el botón de Inventario y lo dirigimos a su dashboard */}
                    <Button fullWidth variant="outline" color="dark" onClick={() => router.push('/superuser/inventario')}>
                        Inventario (en construcción)
                    </Button>

                    <Button fullWidth variant="outline" color="dark" onClick={() => router.push('/superuser/rrhh')}>
                        Recursos Humanos (casi listo)
                    </Button>
                    <Button fullWidth variant="outline" color="dark" onClick={() => router.push('/superuser/rrhh')}>
                        📊 Reportes (en construcción)
                    </Button>

                    {/* Puedes seguir agregando más botones aquí */}
                </SimpleGrid>
            </Card>
        </Stack>
    );
}