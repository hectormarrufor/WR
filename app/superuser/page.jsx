// app/superuser/page.jsx
'use client';
import { useState, useEffect } from 'react';
import { Container, Paper, Title, Text, SimpleGrid, ThemeIcon, UnstyledButton, Group, Badge, Loader, Tooltip } from '@mantine/core';
import Link from 'next/link';
import {
    IconFileText,
    IconChecklist,
    IconArrowsLeftRight,
    IconEngine,
    IconTruck,
    IconUsers,
    IconToolsKitchen2,
    IconBus,
    IconPigMoney,
    IconShoppingCart,
    IconCashBanknote,
    IconBuildingStore,
    IconUsersGroup,
    IconCalendarTime,
    IconReport
} from '@tabler/icons-react';
import classes from './superuser.module.css';

// LISTA DEFINITIVA BASADA EN TUS INSTRUCCIONES
const modulesData = [
    { title: 'Contratos', icon: IconFileText, color: 'indigo', href: '/superuser/contratos', description: 'Gestiona contratos de servicio con clientes.' },
    { title: 'Servicios Adquiridos', icon: IconChecklist, color: 'blue', href: '/superuser/servicios-adquiridos', description: 'Administra los servicios contratados.' },
    { title: 'Mudanzas', icon: IconArrowsLeftRight, color: 'orange', href: '/superuser/mudanzas', description: 'Coordina la logística de traslados de equipos.' },
    { title: 'Operaciones', icon: IconEngine, color: 'red', href: '/superuser/operaciones-campo', description: 'Control de operaciones diarias en pozos.' },
    { title: 'Flota', icon: IconTruck, color: 'cyan', href: '/superuser/flota', description: 'Administra todos los vehículos y equipos.' },
    { title: 'Usuarios', icon: IconUsers, color: 'gray', href: '/superuser/usuarios', description: 'Gestiona el acceso y roles de los usuarios.' },
    { title: 'Comidas', icon: IconToolsKitchen2, color: 'lime', href: '#', description: 'Control de consumos y logística de alimentos.' },
    { title: 'Transporte', icon: IconBus, color: 'yellow', href: '#', description: 'Logística de transporte de personal.' },
    { title: 'Tesorería', icon: IconPigMoney, color: 'pink', href: '#', description: 'Gestiona cuentas bancarias y flujos de caja.' },
    { title: 'Compras', icon: IconShoppingCart, color: 'grape', href: '/superuser/compras', description: 'Administra proveedores y órdenes de compra.' },
    { title: 'Cobranza', icon: IconCashBanknote, color: 'green', href: '#', description: 'Seguimiento de facturas y pagos de clientes.' },
    { title: 'Inventario', icon: IconBuildingStore, color: 'violet', href: '/superuser/inventario', description: 'Control de stock de partes y consumibles.' },
    { title: 'Recursos Humanos', icon: IconUsersGroup, color: 'teal', href: '/superuser/rrhh', description: 'Administra personal, puestos y departamentos.' },
    { title: 'Guardias', icon: IconCalendarTime, color: 'blue', href: '#', description: 'Planificación de turnos y guardias del personal.' },
    { title: 'Reportes', icon: IconReport, color: 'red', href: '/superuser/reportes', description: 'Genera reportes gerenciales y operativos.' },
];

export default function SuperuserDashboard() {
    const [bcvRate, setBcvRate] = useState(null);
    const [loadingBcv, setLoadingBcv] = useState(true);

    useEffect(() => {
        const fetchBcvRate = async () => {
            try {
                const response = await fetch("/api/bcv");
                const data = await response.json();
                setBcvRate(data.precio);
            } catch (error) {
                console.error("Error fetching BCV rate:", error);
                setBcvRate('Error');
            } finally {
                setLoadingBcv(false);
            }
        };

        fetchBcvRate();
    }, []);

    const items = modulesData.map((item) => {
        const isEnabled = item.href !== '#';

        const cardContent = (
            <UnstyledButton
                component={isEnabled ? Link : 'div'}
                href={item.href}
                key={item.title}
                className={classes.item}
                style={{ opacity: isEnabled ? 1 : 0.6, cursor: isEnabled ? 'pointer' : 'not-allowed' }}
            >
                <ThemeIcon color={item.color} variant="light" size={60}>
                    <item.icon size="1.8rem" />
                </ThemeIcon>
                <Text size="sm" mt="sm" weight={500}>{item.title}</Text>
                <Text size="xs" c="dimmed" mt={4}>{item.description}</Text>
            </UnstyledButton>
        );

        if (isEnabled) {
            return cardContent;
        }

        return (
            <Tooltip label="Módulo en construcción" key={item.title}>
                {cardContent}
            </Tooltip>
        );
    });

    return (
        <Container fluid>
            <Paper withBorder shadow="md" p={30} mt={70} radius="md" className={classes.paper_translucent}>
                <Title order={2} ta="center">
                    Panel de Administración
                </Title>

                <Group justify="center" mt="xs" mb="lg">


                    <Badge variant="light" color={bcvRate === 'Error' ? 'red' : 'green'} size="lg">
                        BCV: {loadingBcv ? <Loader size="xs" /> : bcvRate + " Bs"}
                    </Badge>

                </Group>

                <SimpleGrid cols={{ base: 2, sm: 3, md: 4, lg: 5 }}>
                    {items}
                </SimpleGrid>
            </Paper>
        </Container>
    );
}