'use client';

import React, { useRef, useEffect, useState } from 'react';
import {
    Title, Text, Button, Container, Paper, Box, Stack,
    Group, Anchor, Center, Image, ThemeIcon, Grid,
    Flex, SimpleGrid, Card, Badge, List, Divider, Overlay,
    Avatar, Blockquote
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import {
    IconMail, IconPhone, IconBrandWhatsapp, IconArrowRight,
    IconTruck, IconRecycle, IconCertificate, IconShieldCheck,
    IconMapPin, IconCheck, IconWorld, IconClock, IconUsers,
    IconTool, IconBiohazard, IconCrane, IconFileText
} from '@tabler/icons-react';
import { Fade } from 'react-slideshow-image';
import 'react-slideshow-image/dist/styles.css';
import { useRouter } from 'next/navigation';

// --- COLORES CORPORATIVOS (Hex Manuales para precisión) ---
const COLORS = {
    petrol: '#0D2B3E', // Azul Petróleo
    industrial: '#F1F3F5', // Gris claro fondo
    darkGray: '#2C2E33', // Gris Industrial Oscuro
    safetyYellow: '#FCC419', // Amarillo Seguridad
    textDark: '#1A1B1E',
};

// --- COMPONENTE DE ANIMACIÓN (Fade In Up) ---
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

        return () => {
            if (currentElement) observer.unobserve(currentElement);
        };
    }, []);

    return (
        <div
            ref={domRef}
            style={{
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateY(0)' : 'translateY(50px)',
                transition: `opacity 0.8s ease-out ${delay}s, transform 0.8s ease-out ${delay}s`,
                willChange: 'opacity, transform',
                width: '100%'
            }}
        >
            {children}
        </div>
    );
};

// --- DATOS ---
const slideImages = [
    `/carrusel1.jpg?v=${process.env.NEXT_PUBLIC_APP_VERSION || '1'}`,
    `/carrusel2.jpg?v=${process.env.NEXT_PUBLIC_APP_VERSION || '1'}`,
    `/carrusel4.jpg?v=${process.env.NEXT_PUBLIC_APP_VERSION || '1'}`,
    `/carrusel5.jpg?v=${process.env.NEXT_PUBLIC_APP_VERSION || '1'}`,
    `/carrusel6.jpg?v=${process.env.NEXT_PUBLIC_APP_VERSION || '1'}`,
    `/carrusel7.jpg?v=${process.env.NEXT_PUBLIC_APP_VERSION || '1'}`,
    `/carrusel8.jpg?v=${process.env.NEXT_PUBLIC_APP_VERSION || '1'}`,
    `/carrusel9.jpg?v=${process.env.NEXT_PUBLIC_APP_VERSION || '1'}`,
    `/carrusel10.jpg?v=${process.env.NEXT_PUBLIC_APP_VERSION || '1'}`,
    `/carrusel11.jpg?v=${process.env.NEXT_PUBLIC_APP_VERSION || '1'}`,
    `/carrusel12.jpg?v=${process.env.NEXT_PUBLIC_APP_VERSION || '1'}`,
];

const serviciosPrincipales = [
    {
        title: "Transporte de Carga Pesada",
        img: "/plataforma.jpg",
        desc: "Movilizamos equipos, materiales y estructuras con flota certificada, operadores capacitados y protocolos de seguridad industrial.",
        icon: IconTruck
    },
    {
        title: "Gestión de Residuos",
        img: "/vaccum.jpg",
        desc: "Soluciones responsables para recolección, transporte y disposición de residuos industriales, con cumplimiento normativo y trazabilidad.",
        icon: IconRecycle
    },
    {
        title: "Mantenimiento Industrial",
        img: "/retro.jpg",
        desc: "Servicios especializados para garantizar continuidad operativa, eficiencia y seguridad en plantas, instalaciones y equipos.",
        icon: IconTool
    },
];

const valores = [
    "Seguridad como prioridad",
    "Cumplimiento normativo",
    "Puntualidad y responsabilidad",
    "Transparencia",
    "Trabajo en equipo",
    "Mejora continua"
];

const teamData = [
    { name: "Ing. Hector Marrufo", cargo: "Desarrollador web fullstack", img: `${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/23883618.png` },
    { name: "Lic. Rey Canelo", cargo: "Gerente Administrativo", img: `${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/10486538.png` },
    { name: "Edwin Rodriguez", cargo: "Jefe de Mantenimiento", img: `${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/13023136.png` }
];

// Mock Data para Logos (Comentado hasta tener autorización)
// const clientesLogos = [
//     { name: "PDVSA", img: "/logos/pdvsa.png" },
//     { name: "Chevron", img: "/logos/chevron.png" },
// ];

const blogPosts = [
    { title: "¿Cómo elegir un proveedor de transporte pesado?", category: "Logística", ruta: "como-elegir-proveedor-transporte" },
    { title: "Importancia del mantenimiento preventivo", category: "Industrial", ruta: "importancia-mantenimiento-preventivo" },
    { title: "Manejo seguro de materiales peligrosos", category: "Seguridad", ruta: "manejo-seguro-materiales-peligrosos" },
    { title: "Normativas venezolanas de transporte", category: "Legal", ruta: "normativas-venezolanas-transporte" }
];

export default function LandingPage() {
    const isMobile = useMediaQuery('(max-width: 768px)');
    const heroHeight = isMobile ? '60vh' : '85vh';
    const router = useRouter();

    // Clips y Estilos
    const heroClipPath = 'polygon(0 0, 100% 0, 100% 90%, 0 100%)';
    const diagonalClip = 'polygon(0 5%, 100% 0, 100% 100%, 0 100%)';

    const glassStyle = {
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.5)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
    };

    return (
        <Box style={{ overflowX: 'hidden', width: '100%', fontFamily: 'system-ui, sans-serif', backgroundColor: '#f8f9fa' }}>

            {/* =========================================
                SECCIÓN 1: HERO (Azul Petróleo)
               ========================================= */}
            <Box
                pos="relative" w="100%" h={heroHeight} bg={COLORS.petrol}
                style={{ clipPath: heroClipPath, zIndex: 1 }} mb={80}
            >
                {/* Carrusel de Fondo */}
                <Box pos="absolute" inset={0} style={{ zIndex: 0 }} >
                    <Fade duration={4000} transitionDuration={1500} arrows={false} pauseOnHover={false} infinite>
                        {slideImages.map((img, index) => (
                            <div key={index} style={{ height: heroHeight, width: '100%' }}>
                                <Image
                                    src={img}
                                    alt="Slide"
                                    h={heroHeight}
                                    w="100%"
                                    fit="cover"
                                    style={{ filter: 'grayscale(30%) contrast(1.1)' }}
                                    fallbackSrc="https://placehold.co/1920x1080/0D2B3E/FFF?text=Transporte+Dadica"
                                />
                            </div>
                        ))}
                    </Fade>
                </Box>
                {/* Overlay oscuro tipo petróleo */}
                <Box pos="absolute" inset={0} style={{ zIndex: 1, background: `linear-gradient(180deg, rgba(13, 43, 62, 0.6) 0%, rgba(13, 43, 62, 0.85) 100%)` }} />

                <Container size="xl" h="100%" pos="relative" style={{ zIndex: 2 }}>
                    <Center h="100%" pb={80}>
                        <FadeInSection>
                            <Stack align="flex-start" gap="md" maw={isMobile? 400 : 600} pt={30}>

                                <Title order={2} c="white" fz={{ base: 32, sm: 48, md: 55 }} fw={900} lh={1.1}>
                                    Movemos tu industria con <Text span c="yellow.4" inherit>precisión, seguridad y cumplimiento.</Text>
                                </Title>

                                <Button
                                    size="md"
                                    color="yellow"
                                    c="dark"
                                    radius="md"
                                    component="a"
                                    href="https://wa.me/584120756457"
                                    target="_blank"
                                    rightSection={<IconBrandWhatsapp size={22} />}
                                    mt="xl"
                                    className="hover:scale-105"
                                    style={{ transition: 'transform 0.2s', fontWeight: 700 }}
                                >
                                    Solicitar cotización
                                </Button>
                            </Stack>
                        </FadeInSection>
                    </Center>
                </Container>
            </Box>

            {/* =========================================
                SECCIÓN 2: INTRODUCCIÓN (Texto Destacado)
               ========================================= */}
            <Container size="xl" mt={-40} pos="relative" style={{ zIndex: 10 }}>
                <FadeInSection delay={0.2}>
                    <Paper p={{ base: 'xl', md: 50 }} radius="md" shadow="xl" bg="white">
                        <Grid align="center" gutter={50}>
                            <Grid.Col span={{ base: 12, md: 8 }}>
                                <Text size="xl" lh={1.6} c="dimmed" fw={500} style={{ borderLeft: `4px solid ${COLORS.safetyYellow}`, paddingLeft: 20 }}>
                                    Soluciones integrales en transporte pesado, gestión de residuos, mantenimiento industrial y operaciones críticas para los sectores petrolero, energético e industrial.
                                </Text>
                            </Grid.Col>
                            <Grid.Col span={{ base: 12, md: 4 }}>
                                <Group justify={isMobile ? 'center' : 'flex-end'}>
                                    <Stack gap={0} align="center">
                                        <Title order={2} c={COLORS.petrol} fz={40}>+15</Title>
                                        <Text size="sm" tt="uppercase" fw={700} c="dimmed">Años de Trayectoria</Text>
                                    </Stack>
                                    <Divider orientation="vertical" h={40} />
                                    <Stack gap={0} align="center">
                                        <Title order={2} c={COLORS.petrol} fz={40}>24/7</Title>
                                        <Text size="sm" tt="uppercase" fw={700} c="dimmed">Operatividad</Text>
                                    </Stack>
                                </Group>
                            </Grid.Col>
                        </Grid>
                    </Paper>
                </FadeInSection>
            </Container>

            {/* =========================================
                SECCIÓN 3: NOSOTROS (Misión/Visión/Valores)
               ========================================= */}
            <Container size="xl" py={100}>
                <Grid gutter={60}>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                        <FadeInSection>
                            <Stack gap="lg">
                                <Title order={3} size="h1" lh={1.2}>
                                    Excelencia operativa en entornos exigentes
                                </Title>
                                <Text c="dimmed" size="lg" ta="justify">
                                    <Text span fw={700} c="dark">Transporte Dadica C.A.</Text> es una empresa venezolana con trayectoria en soluciones logísticas, transporte especializado y servicios industriales. Nos caracterizamos por la puntualidad, el cumplimiento legal y la capacidad de respuesta.
                                </Text>

                                <SimpleGrid cols={{ base: 1, sm: 2 }} mt="md">
                                    <Paper p="lg" bg="gray.0" radius="md">
                                        <Group mb="xs"><IconWorld color={COLORS.petrol} /><Text fw={700}>Misión</Text></Group>
                                        <Text size="sm" c="dimmed">Brindar servicios de transporte y soluciones industriales con altos estándares de seguridad, eficiencia y confiabilidad.</Text>
                                    </Paper>
                                    <Paper p="lg" bg="gray.0" radius="md">
                                        <Group mb="xs"><IconCertificate color={COLORS.petrol} /><Text fw={700}>Visión</Text></Group>
                                        <Text size="sm" c="dimmed">Ser referente en el sector industrial y petrolero, reconocidos por excelencia operativa e innovación.</Text>
                                    </Paper>
                                </SimpleGrid>
                            </Stack>
                        </FadeInSection>
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                        <FadeInSection delay={0.2}>
                            <Card radius="md" p="xl" bg={COLORS.petrol} c="white">
                                <Title order={4} mb="xl" c="yellow.4">Nuestros Valores</Title>
                                <SimpleGrid cols={2} spacing="lg">
                                    {valores.map((val, i) => (
                                        <Group key={i} gap="xs" align="start">
                                            <ThemeIcon size="xs" color="yellow" radius="xl" mt={4}><IconCheck size={12} /></ThemeIcon>
                                            <Text size="sm" fw={500}>{val}</Text>
                                        </Group>
                                    ))}
                                </SimpleGrid>
                                <Box mt={40} p="lg" bg="rgba(255,255,255,0.1)" style={{ borderRadius: 8 }}>
                                    <Text size="sm" fs="italic">
                                        "La seguridad y la integridad de nuestro equipo y el medio ambiente no son negociables."
                                    </Text>
                                </Box>
                            </Card>
                        </FadeInSection>
                    </Grid.Col>
                </Grid>
            </Container>

            {/* =========================================
                SECCIÓN 4: SERVICIOS (Bloques + Lista Técnica)
               ========================================= */}
            <Box py={100} bg="#f1f3f5" style={{ clipPath: diagonalClip }}>
                <Container size="xl">
                    <Stack align="center" mb={60}>
                        <Title order={2} c={COLORS.petrol} tt="uppercase" lts={1}>Servicios</Title>
                        <Text c="dimmed" ta="center" maw={700}>
                            Estrategias logísticas personalizadas para optimizar tiempos y recursos.
                        </Text>
                    </Stack>

                    {/* Bloques Destacados (Cards) */}
                    <SimpleGrid cols={{ base: 1, md: 3 }} spacing={30}>
                        {serviciosPrincipales.map((srv, index) => (
                            <FadeInSection key={index} delay={index * 0.1}>
                                <Card padding="none" radius="md" withBorder shadow="sm" h="100%">
                                    <Card.Section>
                                        <Image src={srv.img} height={200} alt={srv.title} fallbackSrc="https://placehold.co/600x400?text=Servicio" />
                                    </Card.Section>
                                    <Stack p="xl" gap="sm">
                                        <Group justify="space-between">
                                            <Title order={4} size="h3" c={COLORS.petrol}>{srv.title}</Title>
                                            <ThemeIcon variant="light" color="gray" size="lg"><srv.icon size={20} /></ThemeIcon>
                                        </Group>
                                        <Text size="sm" c="dimmed" lh={1.6}>{srv.desc}</Text>
                                    </Stack>
                                </Card>
                            </FadeInSection>
                        ))}
                    </SimpleGrid>

                    {/* Lista Complementaria Técnica */}
                    <FadeInSection delay={0.3}>
                        <Grid mt={60} gutter={40}>
                            <Grid.Col span={{ base: 12, md: 6 }}>
                                <Paper p="xl" withBorder radius="md">
                                    <Group mb="md">
                                        <ThemeIcon color="orange" size="lg" radius="md"><IconBiohazard size={22} /></ThemeIcon>
                                        <Title order={4}>Transporte de materiales peligrosos</Title>
                                    </Group>
                                    <Text size="sm" c="dimmed">
                                        Operaciones certificadas bajo protocolos de seguridad, permisos vigentes y personal capacitado para el manejo responsable de sustancias reguladas (Hazmat).
                                    </Text>
                                </Paper>
                            </Grid.Col>
                            <Grid.Col span={{ base: 12, md: 6 }}>
                                <Paper p="xl" withBorder radius="md">
                                    <Group mb="md">
                                        <ThemeIcon color="blue" size="lg" radius="md"><IconCrane size={22} /></ThemeIcon>
                                        <Title order={4}>Izamiento y maniobras</Title>
                                    </Group>
                                    <Text size="sm" c="dimmed">
                                        Soluciones para movimientos de carga, izamiento de equipos y maniobras especiales con personal técnico calificado.
                                    </Text>
                                </Paper>
                            </Grid.Col>
                        </Grid>
                    </FadeInSection>
                </Container>
            </Box>

            {/* =========================================
                SECCIÓN 5: EQUIPO DIRECTIVO
               ========================================= */}
            <Container size="xl" py={100}>
                <Title order={2} c={COLORS.petrol} tt="uppercase" lts={1} mb="xl" ta="center">Equipo Directivo</Title>
                <SimpleGrid cols={{ base: 1, sm: 3 }} spacing={40} verticalSpacing={40}>
                    {teamData.map((member, i) => (
                        <FadeInSection key={i} delay={i * 0.1}>
                            <Stack align="center" gap="xs">
                                <Avatar src={member.img} size={120} radius={120} mb="sm" style={{ border: `4px solid ${COLORS.industrial}` }} />
                                <Text fw={700} size="lg" c={COLORS.petrol}>{member.name}</Text>
                                <Text size="sm" c="dimmed" tt="uppercase">{member.cargo}</Text>
                            </Stack>
                        </FadeInSection>
                    ))}
                </SimpleGrid>
            </Container>

            {/* =========================================
                SECCIÓN 6: FLOTA (Fondo Oscuro)
               ========================================= */}
            <Box bg={COLORS.darkGray} c="white" py={100}>
                <Container size="xl">
                    <Grid align="center" gutter={60}>
                        <Grid.Col span={{ base: 12, md: 6 }}>
                            <FadeInSection>
                                <Title order={2} c="yellow.5" mb="md" tt="uppercase" lts={1}>Flota Certificada</Title>
                                <Text c="gray.4" mb="xl" size="lg">
                                    Nuestra flota está compuesta por unidades certificadas, mantenidas bajo estándares estrictos y equipadas con sistemas de monitoreo GPS.
                                </Text>

                                <List
                                    spacing="sm"
                                    size="md"
                                    center
                                    icon={<ThemeIcon color="yellow" size={20} radius="xl"><IconCheck size={12} /></ThemeIcon>}
                                >
                                    <List.Item>Camiones 350 y Plataformas</List.Item>
                                    <List.Item>Chutos 30 toneladas</List.Item>
                                    <List.Item>Equipos para saneamiento (Vacuum)</List.Item>
                                    <List.Item>Unidades Hazmat (Materiales Peligrosos)</List.Item>
                                    <List.Item>Maquinaria Amarilla (Movimiento de tierra)</List.Item>
                                </List>

                                <Divider my="xl" color="gray.7" />

                                <SimpleGrid cols={2}>
                                    <Box>
                                        <Text fw={700} c="white">Certificaciones</Text>
                                        <Text size="sm" c="dimmed">Vigentes y al día</Text>
                                    </Box>
                                    <Box>
                                        <Text fw={700} c="white">Mantenimiento</Text>
                                        <Text size="sm" c="dimmed">Preventivo documentado</Text>
                                    </Box>
                                </SimpleGrid>
                            </FadeInSection>
                        </Grid.Col>
                        <Grid.Col span={{ base: 12, md: 6 }}>
                            <FadeInSection delay={0.2}>
                                <Image radius="md" src="/flota.jpg" alt="Flota Dadica" fallbackSrc="https://placehold.co/800x600/333/666?text=Flota+Operativa" />
                            </FadeInSection>
                        </Grid.Col>
                    </Grid>
                </Container>
            </Box>

            {/* =========================================
                SECCIÓN 7: SEGURIDAD Y CUMPLIMIENTO
               ========================================= */}
            <Container size="xl" py={100}>
                <Stack align="center" mb={60}>
                    <Title order={2} c={COLORS.petrol} tt="uppercase" lts={1}>Seguridad y Cumplimiento</Title>
                    <Text c="dimmed" ta="center" maw={700}>
                        En Transporte Dadica C.A. la seguridad es un principio innegociable.
                    </Text>
                </Stack>

                <SimpleGrid cols={{ base: 1, md: 2, lg: 4 }} spacing="lg">
                    {[
                        { title: "RACDA", desc: "Manejo de Sustancias Controladas", icon: IconShieldCheck },
                        { title: "DAEX", desc: "Permisos de Armas y Explosivos", icon: IconShieldCheck },
                        { title: "RNC", desc: "Registro Nacional de Contratistas", icon: IconFileText },
                        { title: "GPS", desc: "Monitoreo Satelital 24/7", icon: IconMapPin }
                    ].map((item, i) => (
                        <FadeInSection key={i} delay={i * 0.1}>
                            <Paper p="xl" radius="md" withBorder style={{ borderColor: COLORS.petrol }}>
                                <ThemeIcon size="xl" radius="md" variant="light" color="cyan" mb="md">
                                    <item.icon size={28} />
                                </ThemeIcon>
                                <Text fw={800} size="lg" c={COLORS.petrol}>{item.title}</Text>
                                <Text size="sm" c="dimmed">{item.desc}</Text>
                            </Paper>
                        </FadeInSection>
                    ))}
                </SimpleGrid>
            </Container>

            {/* =========================================
                SECCIÓN 8: CLIENTES Y ESTADÍSTICAS
               ========================================= */}
            <Box bg="#f8f9fa" py={100}>
                <Container size="xl">
                    <Grid gutter={50} align="center">
                        <Grid.Col span={{ base: 12, md: 5 }}>
                            <FadeInSection>
                                <Title order={2} c={COLORS.petrol} tt="uppercase" mb="lg">🏢 Casos de Éxito</Title>
                                <Text c="dimmed" mb="xl">
                                    Hemos acompañado a empresas del sector industrial, energético y petrolero en proyectos críticos.
                                </Text>
                                <List spacing="sm">
                                    <List.Item icon={<IconCheck color="green" />}>98% de puntualidad operativa</List.Item>
                                    <List.Item icon={<IconCheck color="green" />}>Más de 10.000 horas de servicio</List.Item>
                                    <List.Item icon={<IconCheck color="green" />}>Cero incidentes mayores recientes</List.Item>
                                </List>
                            </FadeInSection>
                        </Grid.Col>
                        <Grid.Col span={{ base: 12, md: 7 }}>
                            {/* AQUÍ IRÍA EL RENDER DE LOGOS CUANDO TENGAS AUTORIZACIÓN */}
                            <Center h={200} bg="gray.1" style={{ borderRadius: 16, border: '2px dashed #ced4da' }}>
                                <Text c="dimmed" size="sm" fs="italic">Espacio reservado para logos de Aliados Comerciales</Text>
                            </Center>
                        </Grid.Col>
                    </Grid>
                </Container>
            </Box>

            {/* =========================================
                SECCIÓN 9: BLOG TÉCNICO
               ========================================= */}
            <Container size="xl" py={100}>
                <Title order={2} c={COLORS.petrol} tt="uppercase" mb="xl">📝 Blog Técnico</Title>
                <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg">
                    {blogPosts.map((post, i) => (
                        <FadeInSection key={i} delay={i * 0.1}>
                            <Card withBorder padding="lg" radius="md" h="100%">
                                <Badge color="gray" mb="sm">{post.category}</Badge>
                                <Text fw={700} size="md" mb="md" lineClamp={2}>{post.title}</Text>
                                <Button variant="subtle" size="xs" color="dark" onClick={() => router.push(`blog/${post.ruta}`)} rightSection={<IconArrowRight size={14} />}>Leer más</Button>
                            </Card>
                        </FadeInSection>
                    ))}
                </SimpleGrid>
            </Container>

            {/* =========================================
                SECCIÓN 10: CTA FINAL
               ========================================= */}
            <Box py={100} bg={COLORS.petrol} c="white" style={{ position: 'relative', overflow: 'hidden' }}>
                <Overlay opacity={0.1} color="#000" zIndex={0} />
                <Container size="md" pos="relative" style={{ zIndex: 1 }}>
                    <FadeInSection>
                        <Stack align="center" gap="xl">
                            <ThemeIcon size={80} radius="xl" color="yellow" variant="filled">
                                <IconPhone size={40} color={COLORS.petrol} />
                            </ThemeIcon>
                            <Title order={2} ta="center" fz={{ base: 32, md: 48 }}>¿Listo para movilizar su carga?</Title>
                            <Text size="xl" c="gray.3" ta="center">
                                Obtenga una cotización rápida y transparente. Nuestro equipo de operaciones está listo.
                            </Text>
                            <Group mt="lg">
                                <Button size="lg" variant="white" color="dark" component="a" href="mailto:transportedadica@gmail.com" leftSection={<IconMail />}>
                                    Enviar Correo
                                </Button>
                                <Button size="lg" color="green" component="a" href="https://wa.me/584120756457" target="_blank" leftSection={<IconBrandWhatsapp />}>
                                    WhatsApp
                                </Button>
                            </Group>
                        </Stack>
                    </FadeInSection>
                </Container>
            </Box>

            {/* =========================================
                FOOTER
               ========================================= */}
            <Box bg="#050505" c="dimmed" py={60} style={{ borderTop: '1px solid #222' }}>
                <Container size="lg">
                    <Flex direction={isMobile ? 'column' : 'row'} justify="space-between" align="center" gap="xl">
                        <Stack gap={5} align={isMobile ? 'center' : 'flex-start'}>
                            <Image src="/logo.png" alt="Logo Dadica" w={200} fit="contain" mb="xs" fallbackSrc="https://placehold.co/150x50/000/FFF?text=DADICA" />
                            <Text size="sm">Rif: J-29599557-0</Text>
                            <Text size="xs">Ciudad Ojeda, Zulia, Venezuela</Text>
                        </Stack>
                        <Group gap="xl">
                            <Anchor c="dimmed" size="sm" href="#">Inicio</Anchor>
                            <Anchor c="dimmed" size="sm" href="#">Nosotros</Anchor>
                            <Anchor c="dimmed" size="sm" href="#">Servicios</Anchor>
                            <Anchor c="dimmed" size="sm" href="#">Flota</Anchor>
                            <Anchor c="dimmed" size="sm" href="#">Blog</Anchor>
                        </Group>
                        <Text size="sm">© {new Date().getFullYear()} Transporte DADICA C.A.</Text>
                    </Flex>
                </Container>
            </Box>
        </Box>
    );
}