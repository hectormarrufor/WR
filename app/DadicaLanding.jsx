import {
    Container,
    Title,
    Text,
    Grid,
    Card,
    Image,
    Divider,
    Stack,
    Box,
    Group,
    Badge,
    List,
    ThemeIcon,
} from '@mantine/core';
import { IconTruck, IconRecycle, IconShieldCheck, IconUsersGroup } from '@tabler/icons-react';

export default function DadicaLanding({isMobile}) {
    return (
        <Box bg="#f5f5f5" py="xl">
            <Container size="lg">
                {/* Encabezado */}
                <Card withBorder radius="md" p="xl" mb="xl" bg="white">
                    {!isMobile ? <Grid>
                        <Grid.Col span={6}>
                            <Image src="/logo.jpg" alt="Logo DADICA" radius="md" />
                        </Grid.Col>
                        <Grid.Col span={6}>
                            <Stack justify="center" h="100%">
                                <Title order={1} tt="uppercase" c="dark">Transporte DADICA C.A.</Title>
                                <Text size="md" c="dimmed">Fundada en 2008 | RIF: J-29553660-7</Text>
                            </Stack>
                        </Grid.Col>
                    </Grid>:
                    <Stack align="center" spacing="md">
                        <Image src="/logo.jpg" alt="Logo DADICA" radius="md" />
                        <Title order={1} tt="uppercase" c="dark">Transporte DADICA C.A.</Title>
                        <Text size="md" c="dimmed">Fundada en 2008 | RIF: J-29553660-7</Text>
                    </Stack>
                }
                </Card>

                {/* Historia */}
                <Card withBorder radius="md" p="xl" mb="xl" bg="white">
                    <Title order={2} align="center" tt="uppercase">Quienes Somos</Title>
                    <Divider my="sm" />
                    <Text size="lg" align="center" mt="md">
                        Empresa venezolana fundada en 2008, especializada en transporte de carga pesada con cobertura nacional. Ofrece soluciones logísticas seguras y eficientes, respaldadas por un equipo profesional altamente calificado.
                    </Text>
                    <Text size="lg" align="center" mt="md">
                        En Transporte DADICA, C.A nos dedicamos a ofrecer soluciones integrales de transporte y maquinaria pesada para la industria petrolera y de construcción. Con una flota moderna y un equipo altamente capacitado, garantizamos eficiencia, seguridad y cumplimiento en cada proyecto.
                    </Text>
                </Card>

                {/* Misión y Visión */}
                {!isMobile ? <Grid mb="xl">
                    <Grid.Col span={6}>
                        <Card withBorder radius="md" p="xl" bg="white">
                            <Title order={3} tt="uppercase">Misión</Title>
                            <Divider my="sm" />
                            <Text>
                                Garantizar un servicio seguro y eficiente, cuidando al trabajador y al medio ambiente, con enfoque en industrias clave.
                            </Text>
                        </Card>
                    </Grid.Col>
                    <Grid.Col span={6}>
                        <Card withBorder radius="md" p="xl" bg="white">
                            <Title order={3} tt="uppercase">Visión</Title>
                            <Divider my="sm" />
                            <Text>
                                Consolidarse como empresa líder en transporte de cargas especiales, siendo referente en la región.
                            </Text>
                        </Card>
                    </Grid.Col>
                </Grid>:
                <Stack mb="xl" spacing="xl">
                    <Card withBorder radius="md" p="xl" bg="white">
                        <Title order={3} tt="uppercase">Misión</Title>
                        <Divider my="sm" />
                        <Text>
                            Garantizar un servicio seguro y eficiente, cuidando al trabajador y al medio ambiente, con enfoque en industrias clave.
                        </Text>
                    </Card>
                    <Card withBorder radius="md" p="xl" bg="white">
                        <Title order={3} tt="uppercase">Visión</Title>
                        <Divider my="sm" />
                        <Text>
                            Consolidarse como empresa líder en transporte de cargas especiales, siendo referente en la región.
                        </Text>
                    </Card>
                </Stack>
            }

                {/* Servicios */}
                <Card withBorder radius="md" p="xl" mb="xl" bg="white">
                    <Title order={2} tt="uppercase">Servicios Ofrecidos</Title>
                    <Divider my="sm" />
                    <List
                        spacing="xs"
                        icon={<ThemeIcon color="blue" radius="xl"><IconTruck size={16} /></ThemeIcon>}
                    >
                        <List.Item>Gestión de carga</List.Item>
                        <List.Item>Preparación y mantenimiento de locaciones</List.Item>
                        <List.Item>Recolección y transporte de residuos</List.Item>
                        <List.Item>Transporte de equipos pesados</List.Item>
                    </List>
                </Card>

                {/* Flota */}
                <Card withBorder radius="md" p="xl" mb="xl" bg="white">
                    <Title order={2} tt="uppercase">Flota y Equipamiento</Title>
                    <Divider my="sm" />
                    <Group gap="xs" wrap="wrap">
                        <Badge>16 Chutos</Badge>
                        <Badge>5 Volteos / 1 Volqueta</Badge>
                        <Badge>3 Lowboys</Badge>
                        <Badge>8 Bateas</Badge>
                        <Badge>Montacargas</Badge>
                        <Badge>Vacuum / Fénix Trailers</Badge>
                    </Group>
                </Card>

                {/* Seguridad */}
                <Card withBorder radius="md" p="xl" mb="xl" bg="white">
                    <Title order={2} tt="uppercase">Seguridad y Permisología</Title>
                    <Divider my="sm" />
                    <Text>
                        Cumplimos con todos los permisos: RACDA, Bolipuerto, DAEX, ROT, Low-Boy, GPS y monitoreo vial. Inscritos en el Registro Nacional de Contratistas.
                    </Text>
                </Card>

                {/* Sostenibilidad y RSE */}
                <Grid mb="xl">
                    <Grid.Col span={6}>
                        <Card withBorder radius="md" p="xl" bg="white">
                            <Group>
                                <IconRecycle size={32} />
                                <Title order={3} tt="uppercase">Sostenibilidad</Title>
                            </Group>
                            <Divider my="sm" />
                            <Text>
                                Protocolos de mantenimiento, capacitación en conducción segura, reducción de emisiones y gestión de residuos.
                            </Text>
                        </Card>
                    </Grid.Col>
                    <Grid.Col span={6}>
                        <Card withBorder radius="md" p="xl" bg="white">
                            <Group>
                                <IconUsersGroup size={32} />
                                <Title order={3} tt="uppercase">Responsabilidad Social</Title>
                            </Group>
                            <Divider my="sm" />
                            <Text>
                                Educación vial, sensibilización ambiental y participación comunitaria. Compromiso con la transparencia y el desarrollo sostenible.
                            </Text>
                        </Card>
                    </Grid.Col>
                </Grid>

                {/* Experiencia */}
                <Card withBorder radius="md" p="xl" mb="xl" bg="white">
                    <Title order={2} tt="uppercase">Experiencia en la Industria</Title>
                    <Divider my="sm" />
                    <Text>
                        Proyectos con Schlumberger, Chevron, PDVSA, SIZUCA y más. Logística especializada en zonas de difícil acceso y cargas sobredimensionadas.
                    </Text>
                </Card>

                {/* Beneficios */}
                <Card withBorder radius="md" p="xl" mb="xl" bg="white">
                    <Title order={2} tt="uppercase">Beneficios</Title>
                    <Divider my="sm" />
                    <List
                        spacing="xs"
                        icon={<ThemeIcon color="green" radius="xl"><IconShieldCheck size={16} /></ThemeIcon>}
                    >
                        <List.Item>Seguridad operacional garantizada</List.Item>
                        <List.Item>Eficiencia y puntualidad</List.Item>
                        <List.Item>Responsabilidad ambiental</List.Item>
                        <List.Item>Capacitación continua</List.Item>
                    </List>
                </Card>

                {/* Footer */}
                <Stack align="center" spacing="xs" mt="xl">
                    <Text size="sm">Somos su socio estratégico en logística y transporte pesado.</Text>
                    <Text size="sm">📞 +58 4120756457 | 📧 transportedadica@gmail.com</Text>
                </Stack>
            </Container>
        </Box>
    );
}