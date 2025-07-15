// app/superuser/compras/page.js
'use client';

import { Button, Card, Title, Stack, SimpleGrid, useMantineTheme, Group } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { useRouter } from 'next/navigation';


export default function ComprasDashboardPage() {
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
                style={{ width: '100%', maxWidth: 800, backgroundColor: 'white' }}
            >
                <Title order={2} align="center" mb="lg">
                    Módulo de Compras
                </Title>

                <SimpleGrid
                    cols={isMobile ? 1 : 2}
                    spacing="md"
                    breakpoints={[
                        { maxWidth: 'lg', cols: 2 },
                        { maxWidth: 'md', cols: 1 },
                    ]}
                >
                    <Button fullWidth variant="filled" onClick={() => router.push('/superuser/compras/proveedores')}>
                        Gestión de Proveedores 🤝
                    </Button>
                    <Button fullWidth variant="filled" onClick={() => router.push('/superuser/compras/ordenes-compra')}>
                        Órdenes de Compra 📄
                    </Button>
                    <Button fullWidth variant="filled" onClick={() => router.push('/superuser/compras/recepciones-compra')}>
                        Recepción de Compras 📦
                    </Button>
                    {/* Botón de Facturas de Proveedores habilitado */}
                    <Button fullWidth variant="filled" onClick={() => router.push('/superuser/compras/facturas-proveedor')}>
                        Facturas de Proveedores 🧾
                    </Button>
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