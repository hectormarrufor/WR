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
} from '@mantine/core';

import { Carousel } from '@mantine/carousel';
import '@mantine/carousel/styles.css';
import { useMediaQuery } from '@mantine/hooks';
import { useRef } from 'react';
import Autoplay from 'embla-carousel-autoplay';
import { useRouter } from 'next/navigation';
import DadicaLanding from './DadicaLanding';
import { IconMail } from '@tabler/icons-react';

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
        <Container size="xl" mx={isMobile && 0} px={isMobile ? 0 : 'xl'} py="xl" mt={isMobile ? 40 : 0}>
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

            <DadicaLanding />


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
    );
}