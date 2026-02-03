'use client';

import React, { useRef, useEffect, useState } from 'react';
import {
    Title, Text, Button, Container, Paper, Box, Stack,
    Group, Anchor, Center, Image, ThemeIcon, Grid, 
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
        }, { threshold: 0.1 }); // Se activa al ver el 10% del elemento

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
    `/carrusel3.jpg?v=${process.env.NEXT_PUBLIC_APP_VERSION || '1'}`,
    `/carrusel4.jpg?v=${process.env.NEXT_PUBLIC_APP_VERSION || '1'}`,
    `/carrusel5.jpg?v=${process.env.NEXT_PUBLIC_APP_VERSION || '1'}`
];

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

    // --- 2. FORMAS DIAGONALES (Clip Paths) ---
    // Hero: Corte inferior inclinado
    const heroClipPath = isMobile 
        ? 'polygon(0% 0%, 100% 0%, 100% 90%, 50% 100%, 0% 90%)' 
        : 'polygon(0% 0%, 100% 0%, 100% 88%, 50% 100%, 0% 88%)';

    // Bloques diagonales generales (Inclinación superior e inferior)
    // Esto crea el efecto "Paralelepípedo" visual entre secciones
    const diagonalClip = 'polygon(0 5%, 100% 0, 100% 95%, 0 100%)'; 
    const diagonalClipTop = 'polygon(0 0, 100% 5%, 100% 100%, 0 100%)'; // Para secciones que empiezan rectas arriba

    // --- 3. PATRÓN DE FONDO ---
    const bgPattern = {
        backgroundColor: '#eef2f502', 
        backgroundImage: 'radial-gradient(#d1d5db 1.5px, transparent 1.5px)', 
        backgroundSize: '20px 20px'
    };

    // --- 4. ESTILO "GLASSMORPHISM" ---
    const glassStyle = {
        backgroundColor: 'rgba(255, 255, 255, 0.45)', 
        backdropFilter: 'blur(16px) saturate(180%)',  
        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        border: '1px solid rgba(255, 255, 255, 0.3)', 
        boxShadow: '0 8px 15px 0 rgba(48, 37, 9, 0.6)', 
        transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)', // Rebote suave
    };

    const handleGlassHover = (e, lift) => {
        e.currentTarget.style.transform = lift ? 'translateY(-8px)' : 'translateY(0)';
        e.currentTarget.style.boxShadow = lift 
            ? '0 15px 40px 0 rgba(31, 38, 135, 0.25)' 
            : glassStyle.boxShadow;
    };

    return (
        <Box style={{ overflowX: 'hidden', width: '100%', fontFamily: 'system-ui, sans-serif', ...bgPattern }}>
            
            {/* =========================================
                SECCIÓN 1: HERO
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
                <Box pos="absolute" inset={0} style={{ zIndex: 1, background: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.5) 60%, rgba(10,20,35,0.9) 100%)' }} />

                <Container size="xl" h="100%" pos="relative" style={{ zIndex: 2 }}>
                    <Center h="100%" pb={isMobile ? 20 : 80}> 
                        <FadeInSection>
                            <Stack align="center" gap={isMobile ? 'xs' : 'lg'} pt={isMobile? -20 : 40}>
                                <Box style={{ filter: 'drop-shadow(0 0 25px rgba(255,255,255,0.3))' }}>
                                    <Image src="/logo.png" alt="DADICA Logo" w={isMobile ? 180 : 300} fit="contain" />
                                </Box>
                                <Badge size={isMobile ? 'sm' : 'xl'} variant="gradient" gradient={{ from: 'blue', to: 'cyan', deg: 90 }} style={{ boxShadow: '0 0 20px rgba(34, 139, 230, 0.5)', letterSpacing: '2px' }}>LOGÍSTICA INDUSTRIAL</Badge>
                                <Title order={1} c="white" ta="center" fz={{ base: 26, sm: 36, md: 46 }} fw={900} lh={1.1} maw={900} style={{ textShadow: '0 4px 25px rgba(0,0,0,0.7)', letterSpacing: '-1px' }}>
                                    Potencia en movimiento, <br /> <Text span c="blue.4" inherit>precisión en cada entrega.</Text>
                                </Title>
                                <Group mt={isMobile ? 'sm' : 'lg'}>
                                    <Button size={isMobile ? 'md' : 'xl'} color="green" radius="xl" component="a" href="https://wa.me/584120756457" target="_blank" rightSection={<IconArrowRight size={20} />} leftSection={<IconBrandWhatsapp size={24} />} style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.4)', transition: 'transform 0.2s' }} className='hover:scale-105'>Cotizar</Button>
                                    <Button size={isMobile ? 'md' : 'xl'} variant="white" color="dark" radius="xl" component="a" href="tel:+584120756457" leftSection={<IconPhone size={24} />} style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.4)' }}>Llamar</Button>
                                </Group>
                            </Stack>
                        </FadeInSection>
                    </Center>
                </Container>
            </Box>

            {/* =========================================
                SECCIÓN 2: STATS (Glassmorphism)
               ========================================= */}
            <Container size="xl" mt={isMobile ? 20 : 30} pos="relative" style={{ zIndex: 10 }}>
                <FadeInSection delay={0.2}>
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
                                style={{ ...glassStyle }}
                                onMouseEnter={(e) => handleGlassHover(e, true)}
                                onMouseLeave={(e) => handleGlassHover(e, false)}
                            >
                                <Group align="flex-start" wrap="nowrap">
                                    <ThemeIcon 
                                        size={54} 
                                        radius="md" 
                                        variant="gradient" 
                                        gradient={{ from: stat.color, to: `${stat.color}.3`, deg: 135 }}
                                        style={{ boxShadow: `0 8px 20px var(--mantine-color-${stat.color}-2)` }}
                                    >
                                        <stat.icon size={28} stroke={1.5} />
                                    </ThemeIcon>
                                    <div>
                                        <Text fw={800} size="lg" c="dark.9" mb={4}>{stat.title}</Text>
                                        <Text size="sm" c="dimmed" lh={1.4}>{stat.text}</Text>
                                    </div>
                                </Group>
                            </Paper>
                        ))}
                    </SimpleGrid>
                </FadeInSection>
            </Container>

            {/* =========================================
                SECCIÓN 3: SOBRE NOSOTROS (Diagonal invertida)
               ========================================= */}
            <Container size="xl" py={isMobile ? 80 : 120}>
                <SimpleGrid cols={{ base: 1, md: 2 }} spacing={80} verticalSpacing={40}>
                    <FadeInSection>
                        <Stack justify="center" gap="lg">
                            <Group gap="xs">
                                <Box w={50} h={5} bg="blue" style={{ borderRadius: 10 }} />
                                <Text tt="uppercase" c="blue" fw={800} lts={1.5}>Nuestra Trayectoria</Text>
                            </Group>
                            <Title order={2} c="dark.9" fz={{ base: 28, md: 46 }} lh={1.1}>Más de 15 años impulsando la industria venezolana.</Title>
                            <Text size="lg" c="dimmed" lh={1.7}>
                                Fundada en 2008, <Text span fw={800} c="dark">Transporte DADICA</Text> es su socio estratégico en logística pesada. Hemos ejecutado proyectos críticos para gigantes como Schlumberger, Chevron y PDVSA, demostrando que la seguridad y la eficiencia son nuestro ADN.
                            </Text>
                        </Stack>
                    </FadeInSection>
                    
                    <Stack gap="lg">
                        <FadeInSection delay={0.2}>
                            <Card padding="xl" radius="lg" style={{ ...glassStyle }}>
                                <Group align="start" wrap="nowrap">
                                    <ThemeIcon variant="light" color="blue" size="xl" radius="md"><IconTruck size={28}/></ThemeIcon>
                                    <div>
                                        <Text fw={800} size="xl" mb={5}>Misión</Text>
                                        <Text size="md" c="dimmed">Soluciones logísticas seguras y eficientes, salvaguardando la integridad de nuestro equipo y el medio ambiente.</Text>
                                    </div>
                                </Group>
                            </Card>
                        </FadeInSection>

                        <FadeInSection delay={0.4}>
                            <Card padding="xl" radius="lg" style={{ ...glassStyle }}>
                                <Group align="start" wrap="nowrap">
                                    <ThemeIcon variant="light" color="orange" size="xl" radius="md"><IconMapPin size={28}/></ThemeIcon>
                                    <div>
                                        <Text fw={800} size="xl" mb={5}>Visión</Text>
                                        <Text size="md" c="dimmed">Ser el referente indiscutible en transporte de carga extrapesada y gestión ambiental en el Occidente.</Text>
                                    </div>
                                </Group>
                            </Card>
                        </FadeInSection>
                    </Stack>
                </SimpleGrid>
            </Container>

            {/* =========================================
                SECCIÓN 4: SERVICIOS (Diagonal Blanca)
               ========================================= */}
            {/* Aquí aplicamos el corte DIAGONAL (clipPath) para romper la horizontalidad */}
            <Box py={isMobile ? 100 : 150} style={{ clipPath: diagonalClip, background: 'linear-gradient(135deg, #ffffff 0%, #f1f3f5 100%)' }}>
                <Container size="xl">
                    <FadeInSection>
                        <Stack align="center" mb={80}>
                            <Title order={2} ta="center" fz={{ base: 32, md: 48 }} style={{ letterSpacing: '-1px' }}>Soluciones Integrales</Title>
                            <Text c="dimmed" ta="center" maw={600} size="lg">
                                Estrategias logísticas personalizadas para optimizar tiempos y recursos con precisión milimétrica.
                            </Text>
                        </Stack>
                    </FadeInSection>

                    <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="xl">
                        {servicios.map((item, index) => (
                            <FadeInSection key={index} delay={index * 0.1}>
                                <Card 
                                    padding="none" 
                                    radius="lg" 
                                    style={{ ...glassStyle, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.6)' }}
                                    onMouseEnter={(e) => {
                                        handleGlassHover(e, true);
                                        e.currentTarget.querySelector('img').style.transform = 'scale(1.1)';
                                    }} 
                                    onMouseLeave={(e) => {
                                        handleGlassHover(e, false);
                                        e.currentTarget.querySelector('img').style.transform = 'scale(1)';
                                    }}
                                >
                                    <Card.Section>
                                        <Image src={item.img} height={220} alt={item.title} fallbackSrc="https://placehold.co/600x400/e0e0e0/888?text=Servicio" style={{ transition: 'transform 0.6s ease' }} />
                                    </Card.Section>
                                    <Stack p="xl" gap="sm" h={100}>
                                        <Title order={4} size="h3">{item.title}</Title>
                                        <Text size="sm" c="dimmed" lh={1.6}>{item.desc}</Text>
                                    </Stack>
                                </Card>
                            </FadeInSection>
                        ))}
                    </SimpleGrid>
                </Container>
            </Box>

            {/* =========================================
                SECCIÓN 5: FLOTA (Diagonal Oscura)
               ========================================= */}
            {/* El marginTop negativo (-80px) hace que este bloque oscuro suba y llene el hueco dejado por la diagonal blanca anterior, creando el encaje perfecto */}
            <Box bg="#1A1B1E" py={150} c="white" mt={-80} style={{ clipPath: diagonalClipTop, position: 'relative', zIndex: 0 }}>
                <Container size="xl">
                    <Grid align="center" gutter={60}>
                        <Grid.Col span={{ base: 12, md: 5 }}>
                            <FadeInSection>
                                <Badge variant="filled" color="yellow" size="xl" mb="lg" c="dark">INFRAESTRUCTURA</Badge>
                                <Title order={2} mb="md" c="white" fz={48}>Poder para Mover</Title>
                                <Text c="gray.5" mb="xl" size="xl" lh={1.6}>
                                    Equipos modernos, certificados y sometidos a rigurosos planes de mantenimiento preventivo.
                                </Text>
                                
                                <Title order={4} c="white" mb="md" mt="xl">Inventario Destacado:</Title>
                                <Group gap="sm">
                                    {flota.map((item, index) => (
                                        <Badge key={index} size="lg" radius="sm" variant="outline" color="gray" style={{ color: '#ced4da', borderColor: '#495057' }}>{item}</Badge>
                                    ))}
                                </Group>
                            </FadeInSection>
                        </Grid.Col>
                        <Grid.Col span={{ base: 12, md: 7 }}>
                            <FadeInSection delay={0.2}>
                                <Box style={{ position: 'relative', borderRadius: 20, overflow: 'hidden', border: '1px solid #333', boxShadow: '0 30px 60px rgba(0,0,0,0.6)' }}>
                                    <Image src="/flota.jpg" alt="Flota" fallbackSrc="https://placehold.co/800x500/333/666?text=Flota+Moderna" />
                                    <Overlay color="#000" opacity={0.3} />
                                </Box>
                            </FadeInSection>
                        </Grid.Col>
                    </Grid>
                </Container>
            </Box>

            {/* =========================================
                SECCIÓN 6: SEGURIDAD
               ========================================= */}
            <Container size="xl" py={120}>
                <Grid gutter={80}>
                    <Grid.Col span={{ base: 12, md: 7 }}>
                        <FadeInSection>
                            <Title order={2} mb="lg" fz={42} c="dark.9">Seguridad y Permisología</Title>
                            <Text size="xl" c="dimmed" mb="xl">En la industria petrolera, el cumplimiento normativo es vital. Nosotros nos encargamos de la burocracia operativa.</Text>
                            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xl" verticalSpacing="xl">
                                <Group align="start"><ThemeIcon color="green" radius="xl" size="lg" variant="light"><IconCheck size={24} /></ThemeIcon><div><Text fw={700} size="lg">RACDA / DAEX</Text><Text size="sm" c="dimmed">Manejo de sustancias</Text></div></Group>
                                <Group align="start"><ThemeIcon color="green" radius="xl" size="lg" variant="light"><IconCheck size={24} /></ThemeIcon><div><Text fw={700} size="lg">GPS Satelital</Text><Text size="sm" c="dimmed">Monitoreo 24/7</Text></div></Group>
                                <Group align="start"><ThemeIcon color="green" radius="xl" size="lg" variant="light"><IconCheck size={24} /></ThemeIcon><div><Text fw={700} size="lg">RNC Vigente</Text><Text size="sm" c="dimmed">Contrataciones públicas</Text></div></Group>
                                <Group align="start"><ThemeIcon color="green" radius="xl" size="lg" variant="light"><IconCheck size={24} /></ThemeIcon><div><Text fw={700} size="lg">Bolipuertos</Text><Text size="sm" c="dimmed">Acceso portuario</Text></div></Group>
                            </SimpleGrid>
                        </FadeInSection>
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 5 }}>
                        <FadeInSection delay={0.2}>
                            <Card shadow="xl" radius="lg" p={50} bg="blue.6" style={{ backgroundImage: 'linear-gradient(135deg, #228be6 0%, #1098ad 100%)', boxShadow: '0 25px 50px rgba(34, 139, 230, 0.4)' }}>
                                <Stack align="center" gap="md">
                                    <ThemeIcon size={100} radius="100%" color="white" variant="white" style={{ color: '#228be6' }}><IconCertificate size={50} /></ThemeIcon>
                                    <Title order={3} ta="center" c="white" fz={28}>Compromiso RSE</Title>
                                    <Text ta="center" size="md" c="white" style={{ opacity: 0.9 }}>Operamos bajo estrictos protocolos ambientales y de seguridad industrial.</Text>
                                </Stack>
                                <Divider my="xl" color="white" style={{ opacity: 0.3 }} />
                                <List spacing="md" size="md" center icon={<ThemeIcon color="white" variant="transparent"><IconRecycle size={22} /></ThemeIcon>}>
                                    <List.Item style={{color:'white'}}>Gestión de desechos peligrosos</List.Item>
                                    <List.Item style={{color:'white'}}>Reducción de huella de carbono</List.Item>
                                    <List.Item style={{color:'white'}}>Capacitación en seguridad vial</List.Item>
                                </List>
                            </Card>
                        </FadeInSection>
                    </Grid.Col>
                </Grid>
            </Container>

            {/* =========================================
                SECCIÓN 7: CTA (Diagonal Final)
               ========================================= */}
            <Box py={150} style={{ clipPath: 'polygon(0 10%, 100% 0, 100% 100%, 0% 100%)', background: '#081c36', position: 'relative' }}>
                 <Box pos="absolute" top={-100} right={-100} w={600} h={600} style={{ borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,139,230,0.1) 0%, rgba(0,0,0,0) 70%)' }} />
                 <Container size="md" pos="relative" style={{ zIndex: 2 }}>
                    <FadeInSection>
                        <Stack align="center" gap="xl">
                            <Title order={2} c="white" ta="center" fz={{ base: 36, md: 56 }}>¿Listo para movilizar su carga?</Title>
                            <Text size="xl" c="blue.1" ta="center" maw={700}>Obtenga una cotización rápida y transparente. Nuestro equipo de operaciones está listo.</Text>
                            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg" w="100%" mt="xl">
                                <Button fullWidth size="xl" variant="white" color="dark" component="a" href="mailto:transportedadica@gmail.com" leftSection={<IconMail />} style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>Enviar Correo</Button>
                                <Button fullWidth size="xl" color="green" component="a" href="https://wa.me/584120756457" target="_blank" leftSection={<IconBrandWhatsapp />} style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>WhatsApp</Button>
                            </SimpleGrid>
                        </Stack>
                    </FadeInSection>
                </Container>
            </Box>

            {/* =========================================
                SECCIÓN 8: FOOTER
               ========================================= */}
             <Box bg="#050505" c="dimmed" py={60} style={{ borderTop: '1px solid #222' }}>
                <Container size="lg">
                    <Flex direction={isMobile ? 'column' : 'row'} justify="space-between" align="center" gap="xl">
                        <Stack gap={5} align={isMobile ? 'center' : 'flex-start'}>
                            <Image src="/logo.png" w={140} alt="Dadica" style={{ filter: 'grayscale(100%) brightness(150%)' }} />
                            <Text size="sm">Rif: J-29599557-0</Text>
                        </Stack>
                        <Group gap="xl">
                            <Anchor c="dimmed" size="sm" href="#">Inicio</Anchor>
                            <Anchor c="dimmed" size="sm" href="#">Servicios</Anchor>
                            <Anchor c="dimmed" size="sm" href="#">Flota</Anchor>
                        </Group>
                        <Text size="sm">© {new Date().getFullYear()} Transporte DADICA C.A.</Text>
                    </Flex>
                </Container>
            </Box>
        </Box>
    );
}