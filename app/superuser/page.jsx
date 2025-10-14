// app/superuser/page.js
'use client';

import { Button, Card, Title, Stack, SimpleGrid, useMantineTheme, Box, Text, Badge, Flex, LoadingOverlay, Loader, Center } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
    IconFileText, IconTools, IconTruck, IconGasStation, IconUsers,
    IconToolsKitchen2, IconSteeringWheel, IconCash, IconShoppingCart,
    IconFileInvoice, IconArchive, IconUser, IconChartBar, IconMapPin, IconShieldLock,
    IconExchange
} from '@tabler/icons-react';
import './superuser.css';
import { useAuth } from '@/hooks/useAuth';

export default function SuperUserHome() {
    const [isLoading, setIsLoading] = useState(true);
    const { isAdmin, departamentos } = useAuth();
    const [precioBCV, setPrecioBCV] = useState(0);
    const router = useRouter();
    const theme = useMantineTheme();
    const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);

    useEffect(() => {
        (async () => {
            try {
                const req = await fetch('/api/bcv');
                if (req.ok) {
                    const data = await req.json();
                    setPrecioBCV(data.precio);
                } else {
                    console.error("Error fetching BCV price: ", req.statusText);
                }
            } catch (error) {
                console.error("Error fetching BCV price:", error);
            }
        })();
    }, []);

    useEffect(() => {
        if (departamentos.length > 1 || isAdmin) {
            setIsLoading(false);
            return
        }
        else {
            switch (departamentos[0]) {
                case "Almacen":
                    router.push('/superuser/inventario')
                    break;
                case "Mantenimiento":
                    router.push('/superuser/flota')

                default:
                    break;
            }

        }
    }, [departamentos])


    const menuOptions = [
        { disabled: false, visible: isAdmin, title: 'Estimación de costos', href: '/superuser/estimacion-costos', description: 'Calcula el costo operativo por servicio de transporte.', icon: IconChartBar, size: 32, color: theme.colors.orange[6] },
        { disabled: false, visible: isAdmin, title: 'Gastos Fijos mensuales', href: '/superuser/gastos', description: 'Configura los gastos fijos de la empresa', icon: IconExchange, size: 32, color: theme.colors.cyan[6] },
        { disabled: false, visible: isAdmin || departamentos.includes("not set"), title: 'Contratos', href: '/superuser/contratos', description: 'Gestiona contratos de servicio con clientes.', icon: IconFileText, size: 32, color: theme.colors.blue[5] },
        { disabled: false, visible: isAdmin, title: 'Fletes', href: '/superuser/fletes', description: 'Administrar fletes', icon: IconTruck, size: 32, color: theme.colors.yellow[8] },
        { disabled: false, visible: isAdmin || departamentos.includes("not set"), title: 'Operaciones', href: '/superuser/operaciones-campo', description: 'Control de operaciones diarias en pozos.', icon: IconGasStation, size: 32, color: theme.colors.red[5] },
        { disabled: false, visible: isAdmin || departamentos.includes("Mantenimiento"), title: 'Mantenimiento', href: '/superuser/flota', description: 'Administra todos los vehículos y equipos.', icon: IconTruck, size: 32, color: theme.colors.teal[6] },
        { disabled: false, visible: isAdmin || departamentos.includes("not set"), title: 'Transporte', href: '#', description: 'Logística de transporte de personal.', icon: IconSteeringWheel, size: 32, color: theme.colors.cyan[6] },
        { disabled: false, visible: isAdmin || departamentos.includes("not set"), title: 'Tesorería', href: '#', description: 'Gestiona cuentas bancarias y flujos de caja.', icon: IconCash, size: 32, color: theme.colors.cyan[6] },
        { disabled: false, visible: isAdmin || departamentos.includes("not set"), title: 'Compras', href: '/superuser/compras', description: 'Administra proveedores y órdenes de compra.', icon: IconShoppingCart, size: 32, color: theme.colors.pink[5] },
        { disabled: false, visible: isAdmin || departamentos.includes("not set"), title: 'Cobranza', href: '/superuser/facturacion', description: 'Seguimiento de facturas y pagos de clientes.', icon: IconFileInvoice, size: 32, color: theme.colors.lime[6] },
        { disabled: false, visible: isAdmin || departamentos.includes("Almacen"), title: 'Inventario', href: '/superuser/inventario', description: 'Control de stock de partes y consumibles.', icon: IconArchive, size: 32, color: theme.colors.indigo[5] },
        { disabled: false, visible: isAdmin || departamentos.includes("Recursos Humanos"), title: 'Recursos Humanos', href: '/superuser/rrhh', description: 'Administra personal, puestos y departamentos.', icon: IconUser, size: 32, color: theme.colors.cyan[8] },
        { disabled: false, visible: isAdmin || departamentos.includes("not set"), title: 'Guardias', href: '/superuser/guardias', description: 'Planificación de turnos y guardias del personal.', icon: IconShieldLock, size: 32, color: theme.colors.cyan[6] },
        { disabled: false, visible: isAdmin || departamentos.includes("not set"), title: 'Reportes', href: '/superuser/reportes', description: 'Genera reportes gerenciales y operativos.', icon: IconChartBar, size: 32, color: theme.colors.red[8] },
    ];

    return (
        <Stack justify="center" align="center" style={{ minHeight: '93vh', padding: '1rem 0' }} mt={0} p={0}>
            <Card
                shadow="md"
                padding="xl"
                m={0}
                radius="md"
                withBorder
                style={{ width: '100%', maxWidth: 1200, backgroundColor: 'white' }}
            >
                {isLoading ?
                    <Center>
                        <Loader />
                    </Center>
                    : <>

                        <Title order={1} align="center" mb={0} c="blue.8">
                            PANEL DE ADMINISTRACIÓN
                        </Title>

                        <Box mb="sm" style={{ display: 'flex', justifyContent: 'center' }}>
                            <Badge color={precioBCV ? "green" : "gray"} size="lg">
                                BCV: {precioBCV ? `${precioBCV} BS` : "Cargando..."}
                            </Badge>
                        </Box>
                        <Flex
                            justify="center"
                            align="stretch"
                            wrap="wrap"
                            gap="md"
                            style={{
                                maxWidth: isMobile ? '100%' : 1200,
                                margin: '0 auto',
                                padding: isMobile ? '0 1rem' : '0',
                            }}
                        // spacing="xl"
                        // verticalSpacing="xl"
                        // breakpoints={[
                        //     { maxWidth: 'lg', cols: 4 },
                        //     { maxWidth: 'md', cols: 3 },
                        //     { maxWidth: 'sm', cols: 2 },
                        // ]}
                        >
                            {menuOptions.map((option, index) => (
                                option.visible && <Button
                                    w={isMobile ? "100%" : 200}
                                    h={isMobile ? 100 : 120}
                                    p={isMobile ? 5 : 10}
                                    key={index}
                                    variant="default"
                                    disabled={option.disabled}
                                    onClick={() => !option.disabled && router.push(option.href)}
                                    className="superuser-button"
                                >
                                    {<option.icon color={option.disabled ? "gray" : option.color} size={option.size} />}
                                    <Text fw={700} size="sm" mt={5}>{option.title}</Text>
                                    <Text size="xs" c="dimmed" mt={3} style={{ whiteSpace: 'normal', lineHeight: 1.2 }}>
                                        {option.disabled ? '(No disponible)' : option.description}
                                    </Text>
                                </Button>
                            ))}
                        </Flex>
                    </>}
            </Card>
        </Stack>
    );
}