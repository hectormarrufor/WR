import React from 'react';
import { 
    Container, Title, Text, Badge, Group, Image, 
    Button, Paper, Stack, ThemeIcon, Box, Divider, 
    Avatar
} from '@mantine/core';
import { 
    IconCalendar, IconUser, IconArrowLeft, IconShare, 
    IconTag, IconCheck, IconAlertTriangle 
} from '@tabler/icons-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

// --- NOTA: NO AGREGUES 'use client' AQUÍ ARRIBA ---
// Este archivo debe ser un Server Component para leer los params

const COLORS = {
    petrol: '#0D2B3E',
    yellow: '#FCC419',
    gray: '#F1F3F5',
};

// --- DATA DE LOS ARTÍCULOS ---
const POSTS_DATA = {
    'como-elegir-proveedor-transporte': {
        title: "¿Cómo elegir un proveedor de transporte pesado?",
        category: "Logística",
        date: "14 Oct 2024",
        author: "Ing. Hector Marrufo",
        role: "Desarrollador web fullstack",
        img: "/plataforma.jpg",
        content: (
            <>
                <Text size="lg" mb="md">
                    Seleccionar un socio logístico en Venezuela no es solo cuestión de precio; es un tema de seguridad operativa y continuidad de negocio. Un error en la elección puede costar días de retraso en taladros o paradas de planta.
                </Text>
                <Title order={3} mt="xl" mb="sm" c={COLORS.petrol}>1. Certificaciones Vigentes</Title>
                <Text mb="md">
                    Asegúrese de que la empresa cuente con el <strong>RACDA</strong> actualizado y el <strong>RNC</strong> para contrataciones públicas. Sin estos documentos, la carga puede ser retenida por las autoridades, generando pérdidas millonarias.
                </Text>
                <Title order={3} mt="xl" mb="sm" c={COLORS.petrol}>2. Flota Propia vs. Tercerizada</Title>
                <Text mb="md">
                    Un proveedor con flota propia garantiza disponibilidad inmediata. Verifique que cuenten con unidades de respaldo (Lowboys, Chutos, Plataformas) para contingencias.
                </Text>
                <Paper bg="gray.1" p="lg" radius="md" my="xl" withBorder>
                    <Group>
                        <IconAlertTriangle color="orange" size={30} />
                        <Text fw={500} size="sm">
                            Tip Pro: Solicite siempre la hoja de vida de los equipos y el historial de mantenimiento de los últimos 6 meses antes de firmar contrato.
                        </Text>
                    </Group>
                </Paper>
            </>
        )
    },
    'importancia-mantenimiento-preventivo': {
        title: "Importancia del mantenimiento preventivo en operaciones industriales",
        category: "Industrial",
        date: "28 Sep 2024",
        author: "Ing. Hector Marrufo",
        role: "Desarrollador web fullstack",
        img: "/retro.jpg",
        content: (
            <>
                <Text size="lg" mb="md">
                    El mantenimiento correctivo es, en promedio, <strong>3 veces más costoso</strong> que el preventivo. En la industria petrolera, una falla imprevista no solo detiene la producción, sino que compromete la seguridad del personal.
                </Text>
                <Title order={3} mt="xl" mb="sm" c={COLORS.petrol}>Beneficios Directos</Title>
                <List spacing="sm" size="md" center icon={<ThemeIcon color="green" size={20} radius="xl"><IconCheck size={12} /></ThemeIcon>}>
                    <List.Item>Extensión de la vida útil de los activos.</List.Item>
                    <List.Item>Reducción de paradas no programadas.</List.Item>
                    <List.Item>Optimización del consumo de combustible y lubricantes.</List.Item>
                </List>
                <Text mt="lg">
                    En <strong>Transporte Dadica</strong>, aplicamos protocolos rigurosos de revisión cada 5.000 KM para nuestra flota y ofrecemos este mismo estándar para la maquinaria de nuestros clientes.
                </Text>
            </>
        )
    },
    'manejo-seguro-materiales-peligrosos': {
        title: "Manejo seguro de materiales peligrosos (Hazmat)",
        category: "Seguridad",
        date: "10 Nov 2024",
        author: "Ing. Hector Marrufo",
        role: "Desarrollador web fullstack",
        img: "/vaccum.jpg",
        content: (
            <>
                <Text size="lg" mb="md">
                    El transporte de sustancias químicas y desechos peligrosos requiere más que un camión; requiere conocimiento técnico y cumplimiento estricto de la normativa nacional e internacional (UN).
                </Text>
                <Title order={3} mt="xl" mb="sm" c={COLORS.petrol}>Protocolos de Emergencia</Title>
                <Text mb="md">
                    Cada unidad debe contar con un kit de contención de derrames específico para el tipo de fluido transportado. Además, el conductor debe poseer la certificación para manejo de sustancias peligrosas.
                </Text>
                <Title order={3} mt="xl" mb="sm" c={COLORS.petrol}>Documentación Crítica</Title>
                <Text>
                    No mueva una carga sin la <strong>Hoja de Seguridad (MSDS)</strong> y la guía de movilización aprobada por el Ministerio de Ecosocialismo.
                </Text>
            </>
        )
    },
    'normativas-venezolanas-transporte': {
        title: "Normativas venezolanas aplicables al transporte industrial",
        category: "Legal",
        date: "05 Dic 2024",
        author: "Dpto. Legal",
        role: "Asesoría Jurídica",
        img: "/flota.jpg",
        content: (
            <>
                <Text size="lg" mb="md">
                    Navegar la burocracia venezolana es un reto. Aquí resumimos los 3 permisos indispensables para operar legalmente en 2024-2025.
                </Text>
                <Title order={3} mt="xl" mb="sm" c={COLORS.petrol}>1. RACDA (Registro de Actividades Capaces de Degradar el Ambiente)</Title>
                <Text mb="md">
                    Obligatorio para cualquier empresa que transporte aceites, químicos o desechos. Su renovación es anual.
                </Text>
                <Title order={3} mt="xl" mb="sm" c={COLORS.petrol}>2. Guías de Movilización (SADA / INSAI)</Title>
                <Text mb="md">
                    Dependiendo del rubro, se requieren guías específicas que deben coincidir exactamente con la carga física.
                </Text>
                <Title order={3} mt="xl" mb="sm" c={COLORS.petrol}>3. Revisión Técnica INTT</Title>
                <Text>
                    Certifica que la unidad (chuto y batea) cumple con las condiciones mecánicas para circular.
                </Text>
            </>
        )
    }
};

// --- Componente de lista auxiliar para evitar errores de hidratación ---
// Mantine List component needs to be used carefully in server components
function List({ children, icon, spacing, size, center }) {
    return (
        <Stack gap={spacing || 'sm'}>
            {React.Children.map(children, (child, index) => (
                 <Group key={index} align={center ? "center" : "flex-start"} wrap="nowrap">
                    {icon && <Box mt={center ? 0 : 4}>{icon}</Box>}
                    <Text size={size}>{child.props.children}</Text>
                 </Group>
            ))}
        </Stack>
    )
}
List.Item = ({ children }) => <>{children}</>;


export default async function BlogPost({ params }) {
    // 1. Esperamos los params (ESTO REQUIERE QUE EL COMPONENTE SEA SERVER-SIDE)
    const { slug } = await params;
    
    const post = POSTS_DATA[slug];

    if (!post) {
        notFound();
    }

    return (
        <Box bg="#fff">
            {/* HERO */}
            <Box pos="relative" h={{ base: 300, md: 400 }} bg={COLORS.petrol}>
                <Image
                    src={post.img}
                    alt={post.title}
                    h="100%"
                    w="100%"
                    fit="cover"
                    style={{ opacity: 0.4 }}
                    fallbackSrc="https://placehold.co/1920x600/0D2B3E/FFF?text=Blog+Industrial"
                />
                <Container size="md" h="100%" pos="relative" style={{ zIndex: 2, position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
                    <Stack justify="center" h="100%">
                        <Badge size="lg" color="yellow" c="dark" variant="filled">{post.category}</Badge>
                        <Title order={1} c="white" fz={{ base: 28, md: 48 }} style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
                            {post.title}
                        </Title>
                    </Stack>
                </Container>
            </Box>

            {/* CONTENIDO */}
            <Container size="md" mt={-60} pos="relative" style={{ zIndex: 10 }}>
                <Paper shadow="xl" radius="lg" p={{ base: 'lg', md: 50 }} withBorder bg="white">
                    
                    {/* Header */}
                    <Group justify="space-between" mb="xl">
                        <Button 
                            component={Link} 
                            href="/" 
                            variant="subtle" 
                            color="gray.8" 
                            leftSection={<IconArrowLeft size={18} />}
                        >
                            Volver al Inicio
                        </Button>
                        
                        <Group gap="lg">
                            <Group gap={5}>
                                <IconCalendar size={18} color="gray" />
                                <Text size="sm" c="dimmed">{post.date}</Text>
                            </Group>
                            <Group gap={5}>
                                <IconTag size={18} color="gray" />
                                <Text size="sm" c="dimmed">{post.category}</Text>
                            </Group>
                        </Group>
                    </Group>

                    <Divider mb="xl" />

                    {/* Texto */}
                    <Box style={{ lineHeight: 1.8, color: '#333', fontSize: '1.1rem' }}>
                        {post.content}
                    </Box>

                    <Divider my="xl" />

                    {/* Autor + Botón Compartir (Versión Server Side) */}
                    <Group>
                        <Avatar src={`${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/23883618.png`} alt={post.author} color="blue" radius="xl" size="lg">
                            <IconUser />
                        </Avatar>
                        <div>
                            <Text fw={700} size="lg">{post.author}</Text>
                            <Text c="dimmed" size="sm">{post.role}</Text>
                        </div>
                        
                        {/* SOLUCIÓN: Usamos un enlace 'mailto' en lugar de onClick.
                           Esto funciona en Server Components sin problemas.
                        */}
                        <Button 
                            ml="auto" 
                            variant="light" 
                            color="blue" 
                            component="a"
                            href={`mailto:?subject=${encodeURIComponent(post.title)}&body=Te comparto este artículo: `}
                            leftSection={<IconShare size={18}/>}
                        >
                            Compartir
                        </Button>
                    </Group>

                </Paper>
            </Container>

            {/* CTA FOOTER */}
            <Container size="md" py={80}>
                <Paper bg={COLORS.gray} p="xl" radius="md" ta="center">
                    <Title order={3} mb="md" c={COLORS.petrol}>¿Necesita asesoría experta en este tema?</Title>
                    <Text c="dimmed" mb="lg">
                        Nuestro equipo de operaciones está disponible para consultar su caso específico sin compromiso.
                    </Text>
                    <Group justify="center">
                        <Button component="a" href="https://wa.me/584120756457" color="green" size="md">
                            Contactar por WhatsApp
                        </Button>
                        <Button component="a" href="mailto:transportedadica@gmail.com" variant="default" size="md">
                            Enviar Correo
                        </Button>
                    </Group>
                </Paper>
            </Container>
        </Box>
    );
}