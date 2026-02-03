'use client';

import React from 'react';
import {
    Title, Text, Button, Container, Paper, Box, Stack,
    Group, Anchor, Center, Image, rem, ThemeIcon, Grid, 
    Flex, SimpleGrid, Card, Badge, List, Divider, Overlay
} from '@mantine/core';
import { useMediaQuery, useViewportSize } from '@mantine/hooks';
import { 
    IconMail, IconPhone, IconBrandWhatsapp, IconArrowRight, 
    IconTruck, IconRecycle, IconCertificate, IconShieldCheck,
    IconMapPin, IconCheck, IconWorld, IconClock
} from '@tabler/icons-react';
import { Fade } from 'react-slideshow-image';
import 'react-slideshow-image/dist/styles.css';

// --- DATOS ---
const slideImages = [`/carrusel1.jpg?v=${process.env.NEXT_PUBLIC_APP_VERSION}`, `/carrusel2.jpg?v=${process.env.NEXT_PUBLIC_APP_VERSION}`, `/carrusel3.jpg?v=${process.env.NEXT_PUBLIC_APP_VERSION}`, `/carrusel4.jpg?v=${process.env.NEXT_PUBLIC_APP_VERSION}`, `/carrusel5.jpg?v=${process.env.NEXT_PUBLIC_APP_VERSION}`];

const servicios = [
    { title: "Gestión de carga", img: "/plataforma.jpg", desc: "Logística integral punto a punto con trazabilidad." },
    { title: "Adecuación de Locaciones", img: "/retro.jpg", desc: "Movimiento de tierra y preparación de terrenos." },
    { title: "Gestión Ambiental", img: "/vaccum.jpg", desc: "Transporte certificado de fluidos y residuos." },
    { title: "Cargas Especiales", img: "/lowboy.jpg", desc: "Transporte de equipos sobredimensionados." },
];

const flota = ["16 Chutos", "5 Volteos", "1 Volqueta", "3 Lowboys", "8 Bateas", "Montacargas", "Vacuum", "Fénix Trailers"];

export default function LandingPage() {
    const isMobile = useMediaQuery('(max-width: 768px)');
    
    // --- 1. ALTURA HERO ---
    const heroHeight = isMobile ? '50vh' : '80vh';

    // --- 2. FLECHA CLIP-PATH ---
    const heroClipPath = isMobile 
        ? 'polygon(0% 0%, 100% 0%, 100% 90%, 50% 100%, 0% 90%)' 
        : 'polygon(0% 0%, 100% 0%, 100% 85%, 50% 100%, 0% 85%)';

    // --- 3. PATRÓN DE FONDO (Más sutil para el efecto cristal) ---
    const bgPattern = {
        backgroundColor: '#bda2692f', // Fondo base ligeramente gris
        backgroundImage: 'radial-gradient(#dde1e7 1.5px, transparent 1.5px)', // Puntos sutiles
        backgroundSize: '24px 24px'
    };

    // --- 4. ESTILO "GLASSMORPHISM" (CRISTAL ESMERILADO) ---
    // Este objeto define el look premium para todos los papers.
    const glassStyle = {
        backgroundColor: 'rgba(255, 255, 255, 0.38)', // Blanco semitransparente
        backdropFilter: 'blur(12px) saturate(160%)',  // El efecto borroso mágico
        WebkitBackdropFilter: 'blur(12px) saturate(160%)', // Para Safari
        border: '1px solid rgba(255, 255, 255, 0.06)', // Borde blanco sutil
        boxShadow: '0 8px 10px 0 rgba(13, 15, 41, 0.72)', // Sombra suave y profunda
        transition: 'all 0.3s ease',
    };

    // Función auxiliar para el hover en elementos de cristal
    const handleGlassHover = (e, lift) => {
        e.currentTarget.style.transform = lift ? 'translateY(-5px)' : 'translateY(0)';
        // Al hacer hover, la sombra se vuelve un poco más intensa
        e.currentTarget.style.boxShadow = lift 
            ? '0 12px 40px 0 rgba(31, 38, 135, 0.18)' 
            : glassStyle.boxShadow;
    };


    return (
        <Box style={{ overflowX: 'hidden', width: '100%', fontFamily: 'sans-serif', ...bgPattern }}>
            
            {/* =========================================
                SECCIÓN 1: HERO (Sin cambios aquí)
               ========================================= */}
            <Box 
                pos="relative" w="100%" h={heroHeight} bg="black"
                style={{ clipPath: heroClipPath, zIndex: 1 }}
            >
                <Box pos="absolute" inset={0} style={{ zIndex: 0 }}>
                    <Fade duration={4000} transitionDuration={1500} arrows={false} pauseOnHover={false} infinite>
                        {slideImages.map((img, index) => (
                            <div key={index} style={{ height: heroHeight, width: '100%' }}>
                                <Image src={img} alt="Slide" h={heroHeight} w="100%" fit="cover" style={{ objectPosition: 'center center' }} fallbackSrc="https://placehold.co/1920x1080/1a1b1e/FFF?text=Transporte+Dadica" />
                            </div>
                        ))}
                    </Fade>
                </Box>
                <Box pos="absolute" inset={0} style={{ zIndex: 1, background: 'linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.6) 60%, rgba(10,25,40,0.95) 100%)' }} />

                <Container size="xl" h="100%" pos="relative" style={{ zIndex: 2 }}>
                    <Center h="100%" pb={isMobile ? 20 : 80}> 
                        <Stack align="center" gap={isMobile ? 'xs' : 'lg'} pt={isMobile? -20 : 40}>
                            <Box style={{ filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.2))' }}>
                                <Image src="/logo.png" alt="DADICA Logo" w={isMobile ? 200 : 320} fit="contain" />
                            </Box>
                            <Badge size={isMobile ? 'xs' : 'lg'} variant="gradient" gradient={{ from: 'blue', to: 'cyan', deg: 90 }} style={{ boxShadow: '0 0 15px rgba(34, 139, 230, 0.4)', letterSpacing: '1px' }}>LOGÍSTICA INDUSTRIAL</Badge>
                            <Title order={1} c="white" ta="center" fz={{ base: 24, sm: 42, md: 52 }} fw={900} lh={1.1} maw={800} style={{ textShadow: '0 4px 20px rgba(0,0,0,0.6)', letterSpacing: '-0.5px' }}>
                                Potencia en movimiento, <br /> <Text span c="blue.4" inherit>precisión en cada entrega.</Text>
                            </Title>
                            <Group mt={isMobile ? 'xs' : 'md'}>
                                <Button size={isMobile ? 'sm' : 'lg'} color="green" radius="xl" component="a" href="https://wa.me/584120756457" target="_blank" rightSection={<IconArrowRight size={18} />} leftSection={<IconBrandWhatsapp size={isMobile ? 18 : 22} />} style={{ boxShadow: '0 10px 20px rgba(0,0,0,0.3)' }}>Cotizar</Button>
                                <Button size={isMobile ? 'sm' : 'lg'} variant="white" color="dark" radius="xl" component="a" href="tel:+584120756457" leftSection={<IconPhone size={isMobile ? 18 : 22} />} style={{ boxShadow: '0 10px 20px rgba(0,0,0,0.3)' }}>Llamar</Button>
                            </Group>
                        </Stack>
                    </Center>
                </Container>
            </Box>

            {/* =========================================
                SECCIÓN 2: STATS (AHORA CON EFECTO CRISTAL)
               ========================================= */}
            <Container size="xl" mt={isMobile ? 20 : 30} pos="relative" style={{ zIndex: 10 }}>
                <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
                     {[
                        { icon: IconWorld, title: "Cobertura Nacional", text: "Logística punto a punto en todo el país.", color: 'blue' },
                        { icon: IconShieldCheck, title: "Permisología al Día", text: "RACDA, DAEX y RNC 100% vigentes.", color: 'green' },
                        { icon: IconClock, title: "Disponibilidad 24/7", text: "Operaciones continuas sin interrupciones.", color: 'orange' }
                     ].map((stat, i) => (
                        <Paper 
                            key={i} 
                            radius="lg" 
                            p="xl" 
                            // APLICAMOS EL ESTILO CRISTAL AQUÍ
                            style={{ 
                                ...glassStyle,
                                // Eliminamos el borde superior marcado que no te gustaba
                            }}
                             onMouseEnter={(e) => handleGlassHover(e, true)}
                             onMouseLeave={(e) => handleGlassHover(e, false)}
                        >
                            <Group align="flex-start" wrap="nowrap">
                                {/* Icono con gradiente sutil */}
                                <ThemeIcon 
                                    size={50} 
                                    radius="md" 
                                    variant="gradient" 
                                    gradient={{ from: stat.color, to: `${stat.color}.3`, deg: 135 }}
                                    style={{ boxShadow: `0 4px 15px var(--mantine-color-${stat.color}-2)` }}
                                >
                                    <stat.icon size={26} stroke={1.5} />
                                </ThemeIcon>
                                <div>
                                    <Text fw={800} size="lg" c="dark.9" mb={2}>{stat.title}</Text>
                                    <Text size="sm" c="dimmed" lh={1.3}>{stat.text}</Text>
                                </div>
                            </Group>
                        </Paper>
                     ))}
                </SimpleGrid>
            </Container>

            {/* =========================================
                SECCIÓN 3: SOBRE NOSOTROS (CON EFECTO CRISTAL)
               ========================================= */}
            <Container size="xl" py={isMobile ? 60 : 100}>
                <SimpleGrid cols={{ base: 1, md: 2 }} spacing={80} verticalSpacing={40}>
                    <Stack justify="center" gap="lg">
                        <Group gap="xs">
                            <Box w={40} h={4} bg="blue" style={{ borderRadius: 4 }} />
                            <Text tt="uppercase" c="blue" fw={800} lts={1}>Nuestra Trayectoria</Text>
                        </Group>
                        <Title order={2} c="dark.9" fz={{ base: 28, md: 42 }} lh={1.2}>Más de 15 años impulsando la industria venezolana.</Title>
                        <Text size="lg" c="dimmed" lh={1.6}>
                            Fundada en 2008, <Text span fw={700} c="dark">Transporte DADICA</Text> es su socio estratégico en logística pesada. Hemos ejecutado proyectos críticos para gigantes como Schlumberger, Chevron y PDVSA.
                        </Text>
                    </Stack>
                    
                    <Stack gap="md">
                         {/* Aplicamos glassStyle a las Cards de Misión/Visión */}
                         <Card padding="xl" radius="lg" style={{ ...glassStyle }}>
                            <Group align="start" wrap="nowrap">
                                <ThemeIcon variant="light" color="blue" size="xl" radius="md"><IconTruck size={24}/></ThemeIcon>
                                <div>
                                    <Text fw={700} size="lg" mb={5}>Misión</Text>
                                    <Text size="sm" c="dimmed">Soluciones logísticas seguras y eficientes, cuidando la carga y el medio ambiente.</Text>
                                </div>
                            </Group>
                         </Card>

                         <Card padding="xl" radius="lg" style={{ ...glassStyle }}>
                             <Group align="start" wrap="nowrap">
                                <ThemeIcon variant="light" color="orange" size="xl" radius="md"><IconMapPin size={24}/></ThemeIcon>
                                <div>
                                    <Text fw={700} size="lg" mb={5}>Visión</Text>
                                    <Text size="sm" c="dimmed">Ser el referente indiscutible en transporte de carga extrapesada en el Occidente.</Text>
                                </div>
                            </Group>
                         </Card>
                    </Stack>
                </SimpleGrid>
            </Container>

            {/* =========================================
                SECCIÓN 4: SERVICIOS (CON EFECTO CRISTAL)
               ========================================= */}
            {/* Quitamos el fondo blanco sólido y dejamos que el patrón del body se vea */}
            <Box py={100} style={{ clipPath: 'polygon(0 3%, 100% 0, 100% 97%, 0 100%)' }}>
                <Container size="xl" py="xl">
                    <Stack align="center" mb={60}>
                        <Title order={2} ta="center" fz={{ base: 28, md: 42 }}>Soluciones Integrales</Title>
                        <Text c="dimmed" ta="center" maw={600}>
                            Estrategias logísticas personalizadas para optimizar tiempos y recursos.
                        </Text>
                    </Stack>

                    <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="xl">
                        {servicios.map((item, index) => (
                            <Card 
                                key={index} 
                                padding="none" 
                                radius="lg" 
                                // Aplicamos glassStyle, pero debemos asegurar que la imagen no sea transparente
                                style={{ 
                                    ...glassStyle, 
                                    overflow: 'hidden' // Para que la imagen respete el borde redondeado
                                }}
                                onMouseEnter={(e) => {
                                    handleGlassHover(e, true);
                                    e.currentTarget.querySelector('img').style.transform = 'scale(1.05)';
                                }} 
                                onMouseLeave={(e) => {
                                    handleGlassHover(e, false);
                                    e.currentTarget.querySelector('img').style.transform = 'scale(1)';
                                }}
                            >
                                <Card.Section>
                                    <Image src={item.img} height={200} alt={item.title} fallbackSrc="https://placehold.co/600x400/e0e0e0/888?text=Servicio" style={{ transition: 'transform 0.5s ease' }} />
                                </Card.Section>
                                <Stack p="lg" gap="xs" h={100}>
                                    <Title order={4} size="h4">{item.title}</Title>
                                    <Text size="sm" c="dimmed" lh={1.5}>{item.desc}</Text>
                                    {/* <Group mt="auto">
                                        <Text size="xs" fw={700} c="blue" tt="uppercase">Detalles</Text>
                                        <IconArrowRight size={14} color="var(--mantine-color-blue-6)" />
                                    </Group> */}
                                </Stack>
                            </Card>
                        ))}
                    </SimpleGrid>
                </Container>
            </Box>

            {/* =========================================
                SECCIÓN 5, 6, 7, 8 (FLOTA, SEGURIDAD, CTA, FOOTER)
                Estas secciones son oscuras o de color sólido y se ven bien como contraste,
                no necesitan el efecto cristal. Se mantienen igual que en la versión anterior.
               ========================================= */}
            <Box bg="#1A1B1E" py={120} c="white">
                <Container size="xl">
                    <Grid align="center" gutter={60}>
                        <Grid.Col span={{ base: 12, md: 5 }}>
                            <Badge variant="filled" color="yellow" size="lg" mb="md" c="dark">INFRAESTRUCTURA</Badge>
                            <Title order={2} mb="md" c="white" fz={42}>Poder para Mover</Title>
                            <Text c="gray.5" mb="xl" size="lg" lh={1.6}>
                                Equipos modernos, certificados y sometidos a rigurosos planes de mantenimiento preventivo.
                            </Text>
                            
                            <Title order={4} c="white" mb="md">Inventario Destacado:</Title>
                            <Group gap="xs">
                                {flota.map((item, index) => (
                                    <Badge key={index} size="lg" radius="sm" variant="outline" color="gray" style={{ color: '#e9ecef', borderColor: '#495057' }}>{item}</Badge>
                                ))}
                            </Group>
                        </Grid.Col>
                        <Grid.Col span={{ base: 12, md: 7 }}>
                            <Box style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', border: '1px solid #333', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
                                <Image src="/flota.jpg" alt="Flota" fallbackSrc="https://placehold.co/800x500/333/666?text=Flota+Moderna" />
                                <Overlay color="#000" opacity={0.2} />
                            </Box>
                        </Grid.Col>
                    </Grid>
                </Container>
            </Box>

            <Container size="xl" py={100}>
                <Grid gutter={60}>
                    <Grid.Col span={{ base: 12, md: 7 }}>
                        <Title order={2} mb="lg" fz={36} c="dark.9">Seguridad y Permisología</Title>
                        <Text size="lg" c="dimmed" mb="xl">En la industria petrolera, el cumplimiento normativo es vital. Nosotros nos encargamos de la burocracia operativa.</Text>
                        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xl">
                            <Group align="start"><ThemeIcon color="green" radius="xl" size="lg" variant="light"><IconCheck size={20} /></ThemeIcon><div><Text fw={700}>RACDA / DAEX</Text><Text size="sm" c="dimmed">Manejo de sustancias</Text></div></Group>
                            <Group align="start"><ThemeIcon color="green" radius="xl" size="lg" variant="light"><IconCheck size={20} /></ThemeIcon><div><Text fw={700}>GPS Satelital</Text><Text size="sm" c="dimmed">Monitoreo 24/7</Text></div></Group>
                            <Group align="start"><ThemeIcon color="green" radius="xl" size="lg" variant="light"><IconCheck size={20} /></ThemeIcon><div><Text fw={700}>RNC Vigente</Text><Text size="sm" c="dimmed">Contrataciones públicas</Text></div></Group>
                            <Group align="start"><ThemeIcon color="green" radius="xl" size="lg" variant="light"><IconCheck size={20} /></ThemeIcon><div><Text fw={700}>Bolipuertos</Text><Text size="sm" c="dimmed">Acceso portuario</Text></div></Group>
                        </SimpleGrid>
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 5 }}>
                        <Card shadow="xl" radius="lg" p={40} bg="blue.6" style={{ backgroundImage: 'linear-gradient(135deg, #228be6 0%, #15aabf 100%)' }}>
                            <Stack align="center" gap="md">
                                <ThemeIcon size={80} radius="100%" color="white" variant="white" style={{ color: '#228be6' }}><IconCertificate size={40} /></ThemeIcon>
                                <Title order={3} ta="center" c="white">Compromiso RSE</Title>
                                <Text ta="center" size="sm" c="white" style={{ opacity: 0.9 }}>Operamos bajo estrictos protocolos ambientales y de seguridad industrial.</Text>
                            </Stack>
                            <Divider my="lg" color="white" style={{ opacity: 0.3 }} />
                            <List spacing="sm" size="sm" center icon={<ThemeIcon color="white" variant="transparent"><IconRecycle size={18} /></ThemeIcon>}>
                                <List.Item style={{color:'white'}}>Gestión de desechos peligrosos</List.Item>
                                <List.Item style={{color:'white'}}>Reducción de huella de carbono</List.Item>
                                <List.Item style={{color:'white'}}>Capacitación en seguridad vial</List.Item>
                            </List>
                        </Card>
                    </Grid.Col>
                </Grid>
            </Container>

            <Box py={100} style={{ position: 'relative', overflow: 'hidden', background: '#081c36' }}>
                 <Box pos="absolute" top={-100} right={-100} w={400} h={400} style={{ borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,139,230,0.15) 0%, rgba(0,0,0,0) 70%)' }} />
                 <Container size="md" pos="relative" style={{ zIndex: 2 }}>
                    <Stack align="center" gap="xl">
                        <Title order={2} c="white" ta="center" fz={{ base: 32, md: 48 }}>¿Listo para movilizar su carga?</Title>
                        <Text size="xl" c="blue.1" ta="center" maw={600}>Obtenga una cotización rápida y transparente. Nuestro equipo de operaciones está listo.</Text>
                        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg" w="100%" mt="lg">
                             <Button fullWidth size="xl" variant="white" color="dark" component="a" href="mailto:transportedadica@gmail.com" leftSection={<IconMail />} style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>Enviar Correo</Button>
                            <Button fullWidth size="xl" color="green" component="a" href="https://wa.me/584120756457" target="_blank" leftSection={<IconBrandWhatsapp />} style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>WhatsApp</Button>
                        </SimpleGrid>
                    </Stack>
                </Container>
            </Box>

             <Box bg="#141517" c="dimmed" py={60} style={{ borderTop: '1px solid #333' }}>
                <Container size="lg">
                    <Flex direction={isMobile ? 'column' : 'row'} justify="space-between" align="center" gap="xl">
                        <Stack gap={5} align={isMobile ? 'center' : 'flex-start'}>
                            <Image src="/logo.png" w={120} alt="Dadica" style={{ filter: 'grayscale(100%) brightness(150%)' }} />
                            <Text size="xs">Rif: J-29599557-0</Text>
                        </Stack>
                        <Group gap="xl">
                            <Anchor c="dimmed" size="sm" href="#">Inicio</Anchor>
                            <Anchor c="dimmed" size="sm" href="#">Servicios</Anchor>
                            <Anchor c="dimmed" size="sm" href="#">Flota</Anchor>
                        </Group>
                        <Text size="xs">© {new Date().getFullYear()} Transporte DADICA C.A.</Text>
                    </Flex>
                </Container>
            </Box>
        </Box>
    );
}