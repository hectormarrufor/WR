'use client';

import React from 'react';
import {
    Title, Text, Button, Container, Paper, Box, Stack,
    Group, Anchor, Center, Image, rem, ThemeIcon, Grid, 
    Flex, SimpleGrid, Card, Badge, List, Divider
} from '@mantine/core';
import { useMediaQuery, useViewportSize } from '@mantine/hooks';
import { 
    IconMail, IconPhone, IconBrandWhatsapp, IconArrowRight, 
    IconTruck, IconRecycle, IconCertificate, IconShieldCheck 
} from '@tabler/icons-react';
import { Fade } from 'react-slideshow-image';
import 'react-slideshow-image/dist/styles.css';

// --- DATOS ESTÁTICOS ---
const slideImages = [
    '/carrusel1.jpg',
    '/carrusel2.jpg',
    '/carrusel3.jpg'
];

const servicios = [
    { title: "Gestión de carga", img: "/plataforma.jpg", desc: "Logística integral punto a punto." },
    { title: "Mantenimiento de locaciones", img: "/retro.jpg", desc: "Preparación de terreno y adecuación." },
    { title: "Recolección de residuos", img: "/vaccum.jpg", desc: "Transporte especializado y certificado." },
    { title: "Cargas pesadas", img: "/lowboy.jpg", desc: "Equipos sobredimensionados y maquinaria." },
];

const flota = [
    "16 Chutos", "5 Volteos", "1 Volqueta", "3 Lowboys", 
    "8 Bateas", "Montacargas", "Vacuum", "Fénix Trailers"
];

export default function LandingPage() {
    const isMobile = useMediaQuery('(max-width: 768px)');
    const { height: viewportHeight } = useViewportSize();
    
    // --- SOLUCIÓN DE ALTURA ---
    // En Móvil: Altura fija de 500px (Suficiente para ver contenido, pero no ocupa toda la pantalla)
    // En Desktop: Mínimo 700px o el 90% de la pantalla.
    const heroHeight = isMobile ? 380 : Math.max(700, viewportHeight * 0.9);

    // --- SOLUCIÓN DE RECORTES ---
    // En Móvil: El pico de abajo es menos profundo (95%) para no cortar texto ni imagen.
    // En Desktop: El pico es más pronunciado (85%) para estilo.
    const heroClipPath = isMobile 
        ? 'polygon(0% 0%, 100% 0%, 100% 95%, 50% 100%, 0% 95%)'
        : 'polygon(0% 0%, 100% 0%, 100% 85%, 50% 100%, 0% 85%)';

    const handleMailto = () => {
        window.location.href = `mailto:transportedadica@gmail.com`;
    };

    return (
        <Box style={{ overflowX: 'hidden', width: '100%', backgroundColor: '#e2e1cd9d', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(10px)' }}>
            
            {/* =========================================
                SECCIÓN 1: HERO (AJUSTADO) 
               ========================================= */}
            <Box 
                pos="relative" 
                w="100%" 
                h={heroHeight} 
                style={{ 
                    clipPath: heroClipPath,
                    backgroundColor: '#000',
                    transition: 'height 0.3s ease' // Suaviza el cambio de tamaño al rotar pantalla
                }}
            >
                {/* 1.A - SLIDESHOW DE FONDO */}
                <Box pos="absolute" top={0} left={0} right={0} bottom={0} style={{ zIndex: 0 }}>
                    <Fade duration={5000} transitionDuration={1000} arrows={false} pauseOnHover={false} infinite>
                        {slideImages.map((img, index) => (
                            <div key={index} style={{ height: '100%', width: '100%' }}>
                                <Image
                                    src={img}
                                    alt="Slide"
                                    h={heroHeight} 
                                    w="100%"
                                    fit="cover"
                                    // SOLUCIÓN ZOOM: En móvil centramos la imagen para que se vea el camión y no el cielo/suelo
                                    style={{ objectPosition: 'center center' }} 
                                    fallbackSrc="https://placehold.co/1920x1080?text=Transporte+Dadica"
                                />
                            </div>
                        ))}
                    </Fade>
                </Box>

                {/* 1.B - OVERLAY */}
                <Box 
                    pos="absolute" top={0} left={0} right={0} bottom={0} 
                    style={{ 
                        zIndex: 1,
                        background: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.9) 100%)'
                    }} 
                />

                {/* 1.C - CONTENIDO DEL HERO */}
                <Container size="xl" h="100%" pos="relative" style={{ zIndex: 2 }}>
                    {/* Ajustamos padding top en móvil para subir el contenido */}
                    <Center h="100%" pt={isMobile ? 0 : 0}> 
                        <Stack align="center" spacing={isMobile ? 'xs' : 'xl'}>
                            {/* Logo */}
                            <Image
                                src="/logo.png"
                                alt="DADICA Logo"
                                w={isMobile ? 180 : 450} // Logo más pequeño en móvil
                                fit="contain"
                                style={{ filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.6))' }}
                                mb={isMobile ? 'xs' : 'md'}
                            />
                            
                            {/* Eyebrow */}
                            <Badge 
                                size={isMobile ? 'md' : 'lg'} 
                                variant="gradient" 
                                gradient={{ from: 'blue', to: 'cyan' }}
                                style={{ boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }}
                            >
                                Logística Industrial & Petrolera
                            </Badge>

                            {/* Título Principal */}
                            <Title
                                order={1}
                                c="white"
                                ta="center"
                                fz={isMobile ? 24 : 54} // Fuente reducida considerablemente en móvil
                                fw={900}
                                lh={1.1}
                                maw={900}
                                px={isMobile ? 'md' : 0}
                                style={{ textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}
                            >
                                Movemos tu industria con fuerza y precisión.
                            </Title>

                            {/* Botones */}
                            <Group mt={isMobile ? 'md' : 'md'}>
                                <Button 
                                    size={isMobile ? 'sm' : 'xl'} 
                                    color="green"
                                    radius="xl"
                                    onClick={() => window.open('https://wa.me/584120756457', '_blank')}
                                    rightSection={<IconArrowRight size={isMobile ? 16 : 20} />}
                                    leftSection={<IconBrandWhatsapp size={isMobile ? 16 : 20} />}
                                >
                                    Contactar
                                </Button>
                                <Button 
                                    size={isMobile ? 'sm' : 'xl'} 
                                    variant="white" 
                                    color="dark" 
                                    radius="xl"
                                    component="a"
                                    href="tel:+584120756457"
                                    leftSection={<IconPhone size={isMobile ? 16 : 20} />}
                                >
                                    Llamar
                                </Button>
                            </Group>
                        </Stack>
                    </Center>
                </Container>
            </Box>

            {/* =========================================
                SECCIÓN 2: INTRODUCCIÓN 
               ========================================= */}
            <Container size="xl" mt={isMobile ? 40 : 80} mb={80}>
                <SimpleGrid cols={{ base: 1, md: 2 }} spacing={50}>
                    <Stack justify="center">
                        <Group>
                            <ThemeIcon size={40} radius="md" variant="light" color="blue"><IconTruck /></ThemeIcon>
                            <Title order={2} tt="uppercase" c="blue.9" fz={isMobile ? 24 : 32}>Nuestra Esencia</Title>
                        </Group>
                        <Text size={isMobile ? 'md' : 'lg'} c="dimmed" style={{ textAlign: 'justify' }}>
                            Fundada en 2008, Transporte DADICA, C.A. se ha consolidado como líder en soluciones integrales de transporte. Combinamos una flota moderna con un equipo profesional altamente calificado.
                        </Text>
                        <Text size={isMobile ? 'md' : 'lg'} fw={500} c="dark">
                            Garantizamos operaciones seguras, eficientes y puntuales en todo el territorio nacional.
                        </Text>
                    </Stack>
                    <SimpleGrid cols={1} spacing="md">
                         <Card withBorder padding="lg" radius="md" style={{ borderLeft: '5px solid #228be6' }}>
                            <Title order={4} mb="xs">Misión</Title>
                            <Text size="sm" c="dimmed">Servicio seguro y eficiente, cuidando al trabajador y al medio ambiente.</Text>
                         </Card>
                         <Card withBorder padding="lg" radius="md" style={{ borderLeft: '5px solid #fd7e14' }}>
                            <Title order={4} mb="xs">Visión</Title>
                            <Text size="sm" c="dimmed">Ser el referente indiscutible en transporte de cargas especiales en la región.</Text>
                         </Card>
                    </SimpleGrid>
                </SimpleGrid>
            </Container>

            {/* =========================================
                SECCIÓN 3: SERVICIOS
               ========================================= */}
            <Box bg="white" py={80}>
                <Container size="xl">
                    <Title order={2} ta="center" mb="xl" tt="uppercase" fz={isMobile ? 24 : 32}>Nuestros Servicios</Title>
                    <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg">
                        {servicios.map((item, index) => (
                            <Card key={index} shadow="sm" padding="none" radius="md" withBorder>
                                <Card.Section>
                                    <Image src={item.img} height={180} alt={item.title} fallbackSrc="https://placehold.co/600x400" />
                                </Card.Section>
                                <Stack p="md" spacing="xs">
                                    <Title order={5}>{item.title}</Title>
                                    <Text size="sm" c="dimmed">{item.desc}</Text>
                                </Stack>
                            </Card>
                        ))}
                    </SimpleGrid>
                </Container>
            </Box>

            {/* =========================================
                SECCIÓN 4: FLOTA (OSCURA)
               ========================================= */}
            <Box bg="gray.9" py={80} c="white">
                <Container size="xl">
                    <Grid align="center" gutter={50}>
                        <Grid.Col span={{ base: 12, md: 6 }}>
                            <Title order={2} mb="md" c="white" fz={isMobile ? 24 : 32}>FLOTA Y EQUIPAMIENTO</Title>
                            <Text c="gray.4" mb="xl" size={isMobile ? 'md' : 'lg'}>
                                Maquinaria certificada y mantenida rigurosamente para desafíos logísticos exigentes.
                            </Text>
                            <Group gap="sm">
                                {flota.map((item, index) => (
                                    <Badge key={index} size="lg" radius="sm" variant="outline" color="gray" style={{ color: 'white' }}>
                                        {item}
                                    </Badge>
                                ))}
                            </Group>
                        </Grid.Col>
                        <Grid.Col span={{ base: 12, md: 6 }}>
                            <Image src="/flota.jpg" radius="md" alt="Flota" style={{ border: '2px solid rgba(255,255,255,0.1)' }} fallbackSrc="https://placehold.co/800x400?text=Flota" />
                        </Grid.Col>
                    </Grid>
                </Container>
            </Box>

            {/* =========================================
                SECCIÓN 5: SEGURIDAD Y RSE
               ========================================= */}
            <Container size="xl" py={80}>
                <Grid gutter="xl">
                    <Grid.Col span={{ base: 12, md: 7 }}>
                        <Title order={2} mb="md" tt="uppercase" fz={isMobile ? 24 : 32}>Seguridad y Permisología</Title>
                        <Text size={isMobile ? 'md' : 'lg'} mb="lg">Cumplimos con todos los estándares nacionales (RACDA, DAEX, RNC) para garantizar la integridad de su carga.</Text>
                        <SimpleGrid cols={{ base: 1, sm: 2 }}>
                            <Group><IconShieldCheck color="green" /><Text fw={500}>RACDA / DAEX</Text></Group>
                            <Group><IconShieldCheck color="green" /><Text fw={500}>Monitoreo GPS 24/7</Text></Group>
                            <Group><IconShieldCheck color="green" /><Text fw={500}>Inscripción RNC</Text></Group>
                            <Group><IconShieldCheck color="green" /><Text fw={500}>Permisos Bolipuerto</Text></Group>
                        </SimpleGrid>
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 5 }}>
                        <Card shadow="md" radius="md" p="xl" bg="blue.0" style={{ border: '1px solid #a5d8ff' }}>
                            <Stack align="center" spacing="xs">
                                <IconCertificate size={40} color="#228be6" />
                                <Title order={4} ta="center" c="blue.9">Responsabilidad Total</Title>
                            </Stack>
                            <Divider my="md" />
                            <List spacing="sm" size="sm" center icon={<ThemeIcon color="blue" size={20} radius="xl"><IconRecycle size={12} /></ThemeIcon>}>
                                <List.Item>Reducción de emisiones</List.Item>
                                <List.Item>Gestión de residuos</List.Item>
                                <List.Item>Seguridad vial</List.Item>
                            </List>
                        </Card>
                    </Grid.Col>
                </Grid>
            </Container>

            {/* =========================================
                SECCIÓN 6: CTA (CONTACTO)
               ========================================= */}
            <Paper radius={0} py={80} bg="blue.9" style={{ backgroundImage: 'linear-gradient(135deg, var(--mantine-color-blue-9) 0%, var(--mantine-color-cyan-9) 100%)', color: 'white' }}>
                 <Container size="md">
                    <Stack align="center" spacing="xl">
                        <Stack spacing={0} align="center">
                            <Title order={2} tt="uppercase" ta="center" mb="sm" fz={isMobile ? 24 : 32}>¿Listo para movilizar su carga?</Title>
                            <Text size="lg" ta="center" style={{ opacity: 0.9 }}>Contacte a operaciones hoy mismo.</Text>
                        </Stack>
                        <Paper p="xl" radius="md" shadow="xl" bg="white" w="100%" maw={500} c="dark">
                            <Stack>
                                <Group wrap="nowrap">
                                    <ThemeIcon size="xl" radius="md" variant="light" color="blue"><IconMail /></ThemeIcon>
                                    <div>
                                        <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Correo</Text>
                                        <Anchor href="mailto:transportedadica@gmail.com" fw={600} size="md" c="dark">transportedadica@gmail.com</Anchor>
                                    </div>
                                </Group>
                                <Divider />
                                <Group wrap="nowrap">
                                    <ThemeIcon size="xl" radius="md" variant="light" color="green"><IconBrandWhatsapp /></ThemeIcon>
                                    <div>
                                        <Text size="xs" c="dimmed" tt="uppercase" fw={700}>WhatsApp</Text>
                                        <Anchor href="https://wa.me/584120756457" fw={600} size="md" c="dark">+58 412 075 6457</Anchor>
                                    </div>
                                </Group>
                            </Stack>
                        </Paper>
                    </Stack>
                </Container>
            </Paper>

             {/* =========================================
                SECCIÓN 7: FOOTER
               ========================================= */}
             <Box bg="#1A1B1E" c="dimmed" py="xl" style={{ borderTop: '4px solid #228be6' }}>
                <Container size="lg">
                    <Stack align="center" spacing="xs">
                        <Image src="/logo.png" w={140} alt="Dadica Footer" style={{ opacity: 0.8, filter: 'grayscale(100%) brightness(200%)' }} mb="md" />
                        <Text size="sm" tt="uppercase" fw={700} c="white" ta="center">Transporte DADICA C.A.</Text>
                        <Text size="xs" mt="sm" ta="center">© {new Date().getFullYear()} Todos los derechos reservados.</Text>
                    </Stack>
                </Container>
            </Box>
        </Box>
    );
}