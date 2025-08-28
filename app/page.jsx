'use client';

import {
    Title,
    Text,
    Image,
    Button,
    Grid,
    Flex,
    Card,
    Container,
    TextInput,
    ScrollArea,
    useMantineTheme,
    Paper,
    Box,
    SimpleGrid,
    Stack,
    Divider,
    Anchor,
    Group,
} from '@mantine/core';

import { Carousel } from '@mantine/carousel';
import '@mantine/carousel/styles.css';
import { useMediaQuery } from '@mantine/hooks';
import { useRef } from 'react';
import Autoplay from 'embla-carousel-autoplay';
import { useRouter } from 'next/navigation';
import DadicaLanding from './DadicaLanding';
import { IconMail, IconPhone, IconWorld } from '@tabler/icons-react';

export default function LandingPage() {
    const router = useRouter();
    const theme = useMantineTheme();
    const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);
    const autoplay = useRef(Autoplay({ delay: 4000 }));

    const handleMailto = () => {
        const subject = encodeURIComponent('Solicitud de servicios');
        const body = encodeURIComponent('Hola, estoy interesado en sus servicios. Por favor contáctenme.');
        window.location.href = `mailto:transportedadica@gmail.com?subject=${subject}&body=${body}`;
    };


    return (
        <>
            <Container size="xl" mx={isMobile && 0} px={isMobile ? 0 : 'xl'} py={0} mt={isMobile ? 0 : 20}>
                {/* 🖼 Carrusel inicial */}
                <Carousel
                    loop
                    withIndicators
                    plugins={[autoplay.current]}
                    onMouseEnter={autoplay.current.stop}
                    onMouseLeave={autoplay.current.reset}
                    slideSize="100%"
                    mx={isMobile && 0}
                    style={{
                        borderRadius: isMobile ? 0 : theme.radius.md,
                        overflow: 'hidden',
                        marginBottom: '2rem',
                    }}
                >
                    <Carousel.Slide>
                        <Image
                            src="/carrusel1.jpg"
                            alt="carrusel 1"
                            radius={isMobile ? 0 : theme.radius.md}
                            fit="cover"
                            height={isMobile ? 220 : 500}
                        />
                    </Carousel.Slide>
                    <Carousel.Slide>
                        <Image
                            src="/carrusel2.jpg"
                            alt="carrusel 2"
                            radius={isMobile ? 0 : theme.radius.md}
                            fit="cover"
                            height={isMobile ? 220 : 500}
                        />
                    </Carousel.Slide>
                    <Carousel.Slide>
                        <Image
                            src="/carrusel3.jpg"
                            alt="carrusel 3"
                            radius={isMobile ? 0 : theme.radius.md}
                            fit="cover"
                            height={isMobile ? 220 : 500}
                        />
                    </Carousel.Slide>
                </Carousel>
                <DadicaLanding isMobile={isMobile} />
                {/* 📬 Contacto */}
                <Paper
                    radius={isMobile ? 0 : theme.radius.lg}
                    px={isMobile ? 24 : 80}
                    py={60}
                    mt={60}
                    shadow="lg"
                    bg="white"
                    withBorder
                >
                    <Stack align="center" spacing="md">
                        <Title order={3} tt="uppercase" c="dark">
                            ¿Interesado en nuestros servicios?
                        </Title>
                        <Text size="md" ta="center" c="dimmed" maw={500}>
                            Escríbenos y te contactaremos en breve. Estamos listos para ayudarte con soluciones logísticas confiables y eficientes.
                        </Text>
                        <Button
                            leftSection={<IconMail size={18} />}
                            onClick={handleMailto}
                            variant="gradient"
                            gradient={{ from: 'blue', to: 'cyan' }}
                            size="md"
                        >
                            Enviar correo
                        </Button>
                    </Stack>
                </Paper>
            </Container>
            <Box bg="#383838ff" p={0} py={15} m={0} mt={60}>
                <Container size="lg">
                    <Stack align="center" spacing="xs">
                        <Text size="sm" tt="uppercase" fw={700} c="lightgray">
                            Transporte DADICA C.A.
                        </Text>
                        <Text size="sm" c="lightgray">Somos su socio estratégico en logística y transporte pesado.</Text>
                        <Group gap="xs">
                            <IconPhone size={16} color="lightgray"/>
                            <Text size="sm" c="lightgray">+58 412 075 6457</Text>
                        </Group>
                        <Group gap="xs">
                            <IconMail size={16} color="lightgray"/>
                            <Anchor href="mailto:transportedadica@gmail.com" size="sm">
                                transportedadica@gmail.com
                            </Anchor>
                        </Group>
                        
                        <Text size="xs" mt="sm" c="lightgray">
                            © {new Date().getFullYear()} Transporte DADICA C.A. | RIF: J-29553660-7
                        </Text>
                    </Stack>
                </Container>
            </Box>
        </>

    );
}