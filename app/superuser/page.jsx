'use client';

import { Title, Stack, useMantineTheme, Box, Text, Badge, Flex, Loader, Center, Paper, UnstyledButton, Group, ThemeIcon, Card, SimpleGrid } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import {
    IconTruck, IconCash, IconArchive, IconUser, IconClock2,
    IconClipboardText, IconBuildingBank, IconChartBar, IconExchange, IconShoppingCart, IconFileInvoice
} from '@tabler/icons-react';
import './superuser.css'; // Asegúrate de que este archivo no tenga estilos que choquen
import { useAuth } from '@/hooks/useAuth';
import DashboardTareas from '../components/DashboardTareas';

// --- ANIMACIÓN FADE UP (Reutilizada de la Landing) ---
const FadeInSection = ({ children, delay = 0 }) => {
    const [isVisible, setVisible] = useState(false);
    const domRef = useRef();
    useEffect(() => {
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    setVisible(true);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });
        const currentElement = domRef.current;
        if (currentElement) observer.observe(currentElement);
        return () => { if (currentElement) observer.unobserve(currentElement); };
    }, []);
    return (
        <div ref={domRef} style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
            transition: `opacity 0.6s ease-out ${delay}s, transform 0.6s ease-out ${delay}s`,
            width: '100%'
        }}>
            {children}
        </div>
    );
};

export default function SuperUserHome() {
    const [isLoading, setIsLoading] = useState(true);
    const { isAdmin, departamentos, rol } = useAuth();
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
                }
            } catch (error) {
                console.error("Error fetching BCV price:", error);
            }
        })();
        setIsLoading(false);
    }, []);

    // --- ESTILOS VISUALES (Copiados de la Landing) ---
    const bgPattern = {
        backgroundColor: '#f8f9fa15',
        backgroundImage: 'radial-gradient(#cbd3da 1.5px, transparent 1.5px)',
        backgroundSize: '24px 24px',
        minHeight: '100vh', // Asegura que cubra toda la pantalla
    };

    const glassStyle = {
        backgroundColor: 'rgba(255, 255, 255, 0.65)', // Un poco más opaco para legibilidad
        backdropFilter: 'blur(16px) saturate(180%)',
        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        border: '1px solid rgba(255, 255, 255, 0.5)',
        boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.1)',
        transition: 'all 0.3s ease',
    };

    const handleGlassHover = (e, lift) => {
        e.currentTarget.style.transform = lift ? 'translateY(-5px)' : 'translateY(0)';
        e.currentTarget.style.boxShadow = lift 
            ? '0 15px 40px 0 rgba(31, 38, 135, 0.2)' 
            : '0 8px 32px 0 rgba(31, 38, 135, 0.1)';
    };

    const menuOptions = [
        // { disabled: false, visible: isAdmin || departamentos.includes("Presidencia"), title: 'Estimación de costos', href: '/superuser/estimacion-costos', description: 'Calcula el costo operativo por servicio.', icon: IconChartBar, color: 'orange' },
        // { disabled: false, visible: isAdmin || departamentos.includes("Presidencia"), title: 'Gastos Fijos', href: '/superuser/gastos', description: 'Configura los gastos mensuales.', icon: IconExchange, color: 'cyan' },
        { disabled: false, visible: isAdmin || departamentos.includes("Presidencia"), title: 'Pagar Empleados', href: '/superuser/pagar', description: 'Gestión de nómina semanal.', icon: IconCash, color: 'green' },
        { disabled: false, visible: isAdmin || departamentos.includes("Presidencia"), title: 'Cuentas Bancarias', href: '/superuser/mis-cuentas', description: 'Gestión de tesorería.', icon: IconBuildingBank, color: 'yellow' },
        { disabled: false, visible: isAdmin || departamentos.includes("Mantenimiento"), title: 'Mantenimiento', href: '/superuser/flota', description: 'Administración de flota y equipos.', icon: IconTruck, color: 'teal' },
        { disabled: false, visible: isAdmin || departamentos.includes("Almacen"), title: 'Inventario', href: '/superuser/inventario', description: 'Control de stock y repuestos.', icon: IconArchive, color: 'indigo' },
        { disabled: false, visible: isAdmin || departamentos.includes("Recursos Humanos") || departamentos.includes("Operaciones") || departamentos.includes("Administracion") || departamentos.includes("Presidencia"), title: 'Recursos Humanos', href: '/superuser/rrhh', description: 'Personal y departamentos.', icon: IconUser, color: 'cyan' },
        { disabled: false, visible: isAdmin || departamentos.includes("Operaciones") || departamentos.includes("Administracion") || departamentos.includes("Presidencia"), title: 'ODTs', href: '/superuser/odt', description: 'Órdenes de Trabajo.', icon: IconClock2, color: 'blue' },
        { disabled: false, visible: isAdmin || departamentos.includes("Operaciones") || departamentos.includes("Administracion") || departamentos.includes("Presidencia"), title: 'Fletes', href: '/superuser/fletes', description: 'Registro de viajes.', icon: IconTruck, color: 'red' },
        { disabled: false, visible: isAdmin || departamentos.includes("Operaciones") || departamentos.includes("Administracion") || departamentos.includes("Presidencia"), title: 'Pizarra', href: '/superuser/pizarra', description: 'Visualización de actividades.', icon: IconClipboardText, color: 'grape' },
    ];

    if (isLoading) {
        return (
            <Box style={{ ...bgPattern, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
                <Loader size="xl" />
            </Box>
        );
    }

    return (
        <Box style={bgPattern}>
            <Box maw={1200} mx="auto">
                
                {/* HEADER */}
                <FadeInSection>
                    <Stack align="center" spacing={ 0}>
                        <Title order={1} align="center" style={{ 
                            background: '-webkit-linear-gradient(45deg, #1c7ed6, #22b8cf)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            filter: 'drop-shadow(0 2px 10px rgba(0,0,0,0.1))'
                        }}>
                            PANEL DE ADMINISTRACIÓN
                        </Title>

                        <UnstyledButton onClick={() => router.push('/superuser/bcv')}>
                            <Badge 
                                size="xl" 
                                variant="gradient" 
                                gradient={precioBCV ? { from: 'green', to: 'teal' } : { from: 'gray', to: 'gray' }}
                                style={{ boxShadow: '0 4px 15px rgba(0,0,0,0.1)', cursor: 'pointer' }}
                            >
                                BCV: {precioBCV ? `${precioBCV} BS` : "Cargando..."}
                            </Badge>
                        </UnstyledButton>
                    </Stack>
                </FadeInSection>

                {/* DASHBOARD TAREAS (Integrado visualmente) */}
                <FadeInSection delay={0.1}>
                    <Box mb={40}>
                        <DashboardTareas glassStyle={glassStyle} />
                    </Box>
                </FadeInSection>

                {/* GRID DE MENÚ */}
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="lg">
                    {menuOptions.map((option, index) => (
                        option.visible && (
                            <FadeInSection key={index} delay={index * 0.05}>
                                <UnstyledButton 
                                    onClick={() => !option.disabled && router.push(option.href)}
                                    style={{ width: '100%', height: '100%' }}
                                    disabled={option.disabled}
                                >
                                    <Card 
                                        p="lg" 
                                        radius="lg" 
                                        style={{ 
                                            ...glassStyle, 
                                            height: '100%', 
                                            cursor: option.disabled ? 'not-allowed' : 'pointer',
                                            opacity: option.disabled ? 0.6 : 1
                                        }}
                                        onMouseEnter={(e) => !option.disabled && handleGlassHover(e, true)}
                                        onMouseLeave={(e) => !option.disabled && handleGlassHover(e, false)}
                                    >
                                        <Group align="flex-start" wrap="nowrap" mb="xs">
                                            <ThemeIcon 
                                                size={48} 
                                                radius="md" 
                                                variant="gradient" 
                                                gradient={{ from: option.color, to: `${option.color}.4`, deg: 135 }}
                                                style={{ boxShadow: `0 4px 15px var(--mantine-color-${option.color}-2)` }}
                                            >
                                                <option.icon size={26} stroke={1.5} />
                                            </ThemeIcon>
                                            <div>
                                                <Text fw={700} size="md" lh={1.2}>{option.title}</Text>
                                                <Text size="xs" c="dimmed" mt={4} lineClamp={2}>
                                                    {option.description}
                                                </Text>
                                            </div>
                                        </Group>
                                    </Card>
                                </UnstyledButton>
                            </FadeInSection>
                        )
                    ))}
                </SimpleGrid>
            </Box>
        </Box>
    );
}