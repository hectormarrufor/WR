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
} from '@mantine/core';

import { Carousel } from '@mantine/carousel';
import '@mantine/carousel/styles.css';
import { useMediaQuery } from '@mantine/hooks';
import { useRef } from 'react';
import Autoplay from 'embla-carousel-autoplay';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
    const router = useRouter();
    const theme = useMantineTheme();
    const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);
    const autoplay = useRef(Autoplay({ delay: 4000 }));

    return (
        <Container size="xl" mx={isMobile && 0 } px={isMobile ? 0 : 'xl'} py="xl" mt={isMobile ? 40 : 70}>
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
                        src="https://redmine.valoraanalitik.com/wp-content/uploads/2021/01/INDEPENDENCE_26.jpg"
                        alt="pozo 1"
                        radius={isMobile ? 0 : theme.radius.md}
                        fit="cover"
                        height={isMobile ? 220 : 400}
                    />
                </Carousel.Slide>
                <Carousel.Slide>
                    <Image
                        src="https://campetrol.org/wp-content/uploads/2023/02/Taladros-y-Produccion.jpg"
                        alt="pozo 2"
                        radius={isMobile ? 0 : theme.radius.md}
                        fit="cover"
                        height={isMobile ? 220 : 400}
                    />
                </Carousel.Slide>
                <Carousel.Slide>
                    <Image
                        src="https://www.cambioin.com/assets/iblog/post/9449.jpg"
                        alt="pozo 3"
                        radius={isMobile ? 0 : theme.radius.md}
                        fit="cover"
                        height={isMobile ? 220 : 400}
                    />
                </Carousel.Slide>
            </Carousel>

            {/* 🛠 Sección de servicios */}
            <Paper radius={isMobile ? 0 : theme.radius.md} px={isMobile? 20 : 100} py={50} my={isMobile && 20}>
                <Grid gutter="xl" align="center">
                    <Grid.Col span={isMobile ? 12 : 8}>
                        <Flex direction="column" gap="md" align="center">
                            <Title order={2} size={isMobile ? 'h4' : 'h2'} align="center">
                                Servicios de explotación de pozos petroleros
                            </Title>
                            <Text size="lg" align="center">
                                En WR Well Services nos dedicamos a la explotación y mantenimiento integral de pozos petroleros, garantizando eficiencia y seguridad en cada operación. Contamos con maquinaria de vanguardia para cubrir cualquier requerimiento.
                            </Text>
                            <Button variant="outline" size="md" onClick={() => router.push('/servicios')}>
                                Ver servicios
                            </Button>
                            <Button color='red'size="md" onClick={() => router.push('/superuser')}>
                                Ingresar a la Administracion
                            </Button>
                        </Flex>
                    </Grid.Col>
                    <Grid.Col span={isMobile ? 12 : 4}>
                        <Image
                            src="https://live.staticflickr.com/68/198563915_6fe213d84f_z.jpg"
                            alt="maquinaria"
                            radius="md"
                            fit="cover"
                        />
                    </Grid.Col>
                </Grid>
            </Paper>


            {/* 📬 Contacto */}
            <Paper radius={isMobile ? 0 : theme.radius.md} px={isMobile? 20 : 100} py={50} my={isMobile && 20} mt={50}>
                <SimpleGrid cols={isMobile ? 1 : 2}>
                    <Flex direction="column" align="start" justify="space-around">
                        <Title order={3}>¿Interesado en nuestros servicios?</Title>
                        <Text mb="md">Escríbenos y te contactaremos en breve</Text>
                        {!isMobile && <Button mt="md" onClick={() => alert('Mensaje enviado')}>
                            Enviar mensaje
                        </Button>}
                    </Flex>
                    <Box >
                        <TextInput label="Nombre" placeholder="Tu nombre" required mb="sm" />
                        <TextInput label="Correo" placeholder="tucorreo@ejemplo.com" required mb="sm" />
                        <TextInput label="Mensaje" placeholder="Cuéntanos qué necesitas" required multiline mb="sm" />
                        {isMobile && <Button mt="md" onClick={() => alert('Mensaje enviado')}>
                            Enviar mensaje
                        </Button>}
                    </Box>
                </SimpleGrid>
            </Paper>
        </Container>
    );
}