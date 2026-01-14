'use client';

import React from 'react';
import {
    Container, Title, Text, Grid, Card, Image, Divider,
    Stack, Box, Group, Badge, List, ThemeIcon, Flex,
    Center, BackgroundImage, Overlay, Button, SimpleGrid,
    rem, Paper
} from '@mantine/core';
import { 
    IconTruck, IconRecycle, IconShieldCheck, IconUsersGroup, 
    IconCheck, IconMapPin, IconCertificate 
} from '@tabler/icons-react';
import { useMediaQuery } from '@mantine/hooks';

export default function DadicaLanding() {
    // Hooks responsivos de Mantine (Seguros para SSR)
    const isMobile = useMediaQuery('(max-width: 768px)');
    
    // Datos de Servicios para mapear limpiamente
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

    return (
        <Paper>
           

            <Container size="xl">
                {/* --- INTRODUCCIÓN --- */}
                <SimpleGrid cols={{ base: 1, md: 2 }} spacing={50} mb={80} mt={40}>
                    <Stack justify="center">
                        <Title order={2} tt="uppercase" c="blue.9">Sobre Nosotros</Title>
                        <Text size="lg" c="dimmed" style={{ textAlign: 'justify' }}>
                            Fundada en 2008, Transporte DADICA, C.A. se ha consolidado como líder en soluciones integrales de transporte para la industria petrolera y de construcción.
                        </Text>
                        <Text size="lg" style={{ textAlign: 'justify' }}>
                            Combinamos una flota moderna con un equipo profesional altamente calificado para garantizar operaciones seguras, eficientes y puntuales en cualquier parte del territorio nacional.
                        </Text>
                    </Stack>
                    <Grid gutter="md">
                        <Grid.Col span={6}>
                            <Paper withBorder p="xl" radius="md" h="100%" shadow="sm" style={{ borderTop: '4px solid #228be6' }}>
                                <IconTruck size={40} color="#228be6" stroke={1.5} />
                                <Title order={4} mt="md" mb="xs">Misión</Title>
                                <Text size="sm" c="dimmed">
                                    Servicio seguro y eficiente, cuidando al trabajador y al medio ambiente.
                                </Text>
                            </Paper>
                        </Grid.Col>
                        <Grid.Col span={6}>
                            <Paper withBorder p="xl" radius="md" h="100%" shadow="sm" style={{ borderTop: '4px solid #fd7e14' }}>
                                <IconMapPin size={40} color="#fd7e14" stroke={1.5} />
                                <Title order={4} mt="md" mb="xs">Visión</Title>
                                <Text size="sm" c="dimmed">
                                    Ser el referente indiscutible en transporte de cargas especiales en la región.
                                </Text>
                            </Paper>
                        </Grid.Col>
                    </Grid>
                </SimpleGrid>

                {/* --- SERVICIOS --- */}
                <Box mb={80}>
                    <Title order={2} ta="center" mb="lg" tt="uppercase">Nuestros Servicios</Title>
                    <Divider mb="xl" label={<IconTruck />} labelPosition="center" />
                    
                    <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg">
                        {servicios.map((item, index) => (
                            <Card 
                                key={index} 
                                shadow="sm" 
                                padding="lg" 
                                radius="md" 
                                withBorder
                                style={{ transition: 'transform 0.2s', cursor: 'default' }}
                            >
                                <Card.Section>
                                    <Image
                                        src={item.img}
                                        height={160}
                                        alt={item.title}
                                        fallbackSrc="https://placehold.co/600x400?text=Imagen+No+Disponible"
                                    />
                                </Card.Section>
                                <Title order={5} mt="md" mb={5}>{item.title}</Title>
                                <Text size="sm" c="dimmed">
                                    {item.desc}
                                </Text>
                            </Card>
                        ))}
                    </SimpleGrid>
                </Box>
            </Container>

            {/* --- SECCIÓN FLOTA (Full Width Dark) --- */}
            <Box bg="gray.9" py={80} c="white">
                <Container size="xl">
                    <Grid align="center" gutter={50}>
                        <Grid.Col span={{ base: 12, md: 6 }}>
                            <Title order={2} mb="md" c="white">FLOTA Y EQUIPAMIENTO</Title>
                            <Text c="gray.4" mb="xl" size="lg">
                                Contamos con maquinaria certificada y mantenida rigurosamente para enfrentar los desafíos logísticos más exigentes.
                            </Text>
                            <Group gap="sm">
                                {flota.map((item, index) => (
                                    <Badge 
                                        key={index} 
                                        size="lg" 
                                        radius="sm" 
                                        variant="outline" 
                                        color="gray"
                                        style={{ borderColor: 'rgba(255,255,255,0.3)', color: 'white' }}
                                    >
                                        {item}
                                    </Badge>
                                ))}
                            </Group>
                        </Grid.Col>
                        <Grid.Col span={{ base: 12, md: 6 }}>
                            {/* Imagen decorativa o collage */}
                            <Image 
                                src="/flota.jpg" 
                                radius="md" 
                                alt="Flota Dadica"
                                style={{ border: '2px solid rgba(255,255,255,0.1)' }}
                            />
                        </Grid.Col>
                    </Grid>
                </Container>
            </Box>

            <Container size="xl" py={80}>
                {/* --- SEGURIDAD Y PERMISOS --- */}
                <Grid gutter="xl">
                    <Grid.Col span={{ base: 12, md: 7 }}>
                        <Title order={2} mb="md" tt="uppercase">Seguridad y Permisología</Title>
                        <Text size="lg" mb="lg">
                            La seguridad no es negociable. Cumplimos con todos los estándares nacionales para garantizar la integridad de su carga.
                        </Text>
                        
                        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                            <Group>
                                <ThemeIcon color="green" radius="xl"><IconCheck size={18} /></ThemeIcon>
                                <Text fw={500}>RACDA / DAEX</Text>
                            </Group>
                            <Group>
                                <ThemeIcon color="green" radius="xl"><IconCheck size={18} /></ThemeIcon>
                                <Text fw={500}>Inscripción RNC</Text>
                            </Group>
                            <Group>
                                <ThemeIcon color="green" radius="xl"><IconCheck size={18} /></ThemeIcon>
                                <Text fw={500}>Permisos Bolipuerto</Text>
                            </Group>
                            <Group>
                                <ThemeIcon color="green" radius="xl"><IconCheck size={18} /></ThemeIcon>
                                <Text fw={500}>Monitoreo GPS 24/7</Text>
                            </Group>
                        </SimpleGrid>
                        
                        <Title order={4} mt="xl" mb="md">Experiencia Comprobada</Title>
                        <Text c="dimmed">
                            Proyectos ejecutados exitosamente con Schlumberger, Chevron, PDVSA, SIZUCA y más.
                        </Text>
                    </Grid.Col>
                    
                    <Grid.Col span={{ base: 12, md: 5 }}>
                        <Card shadow="md" radius="md" p="xl" bg="blue.0" style={{ border: '1px solid #a5d8ff' }}>
                            <Stack align="center" spacing="xs">
                                <IconCertificate size={48} color="#228be6" />
                                <Title order={3} ta="center" c="blue.9">Compromiso Total</Title>
                                <Text ta="center" size="sm" c="blue.8">
                                    Nuestra responsabilidad social y ambiental es parte de nuestro ADN corporativo.
                                </Text>
                            </Stack>
                            <Divider my="md" />
                            <List
                                spacing="sm"
                                size="sm"
                                center
                                icon={
                                    <ThemeIcon color="blue" size={20} radius="xl">
                                        <IconRecycle size={12} />
                                    </ThemeIcon>
                                }
                            >
                                <List.Item>Reducción de emisiones</List.Item>
                                <List.Item>Gestión responsable de residuos</List.Item>
                                <List.Item>Capacitación continua en seguridad vial</List.Item>
                                <List.Item>Participación comunitaria activa</List.Item>
                            </List>
                        </Card>
                    </Grid.Col>
                </Grid>
            </Container>

        </Paper>
    );
}