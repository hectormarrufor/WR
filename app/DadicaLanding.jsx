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
    Flex,
    Center,
} from '@mantine/core';
import { IconTruck, IconRecycle, IconShieldCheck, IconUsersGroup } from '@tabler/icons-react';

export default function DadicaLanding({ isMobile }) {
    return (
        <Box m={0} p={0} style={{ position: 'relative', top: '-180px' }}>


            <Card pt={180} radius={0} mb="sm" >
                {isMobile ?
                    <Stack spacing="md" justify="center" align="center">
                        <Center flex={1}>
                            <Image
                                src="/logo.png"
                                alt="Logo de la empresa"
                                width="100vw"
                                height={75}
                                mb="md"
                            />
                        </Center>
                        <Box mx={isMobile ? 20 : "xl"} mb={40} flex={1}>
                            <Title order={6} style={{ textAlign: 'justify' }}>
                                Empresa venezolana fundada en 2008, especializada en transporte de carga pesada con cobertura nacional. Ofrece soluciones logísticas seguras y eficientes, respaldadas por un equipo profesional altamente calificado.
                            </Title>
                            <Title order={6} mt="md" style={{ textAlign: 'justify' }}>
                                En Transporte DADICA, C.A nos dedicamos a ofrecer soluciones integrales de transporte y maquinaria pesada para la industria petrolera y de construcción. Con una flota moderna y un equipo altamente capacitado, garantizamos eficiencia, seguridad y cumplimiento en cada proyecto.
                            </Title>
                        </Box>

                    </Stack> :
                    <Flex justify="center" mx="xl" px="xl">
                        <Box mx="xl" p={30} flex={1}>
                            <Title order={6} style={{ textAlign: 'justify' }}>
                                Empresa venezolana fundada en 2008, especializada en transporte de carga pesada con cobertura nacional. Ofrece soluciones logísticas seguras y eficientes, respaldadas por un equipo profesional altamente calificado.
                            </Title>
                            <Title order={6} mt="md" style={{ textAlign: 'justify' }}>
                                En Transporte DADICA, C.A nos dedicamos a ofrecer soluciones integrales de transporte y maquinaria pesada para la industria petrolera y de construcción. Con una flota moderna y un equipo altamente capacitado, garantizamos eficiencia, seguridad y cumplimiento en cada proyecto.
                            </Title>
                        </Box>
                        <Center flex={1}>

                            <Image
                                src="/logo.png"
                                alt="Logo de la empresa"
                                width={600}
                                height={150}
                                mb="md"
                            />
                        </Center>

                    </Flex>}

            </Card>

            {/* Misión y Visión */}
            {!isMobile ? <Grid mb="sm">
                <Grid.Col span={6}>
                    <Card radius={0} p="xl" >
                        <Title order={3} tt="uppercase">Misión</Title>
                        <Divider my="sm" />
                        <Title order={6}>
                            Garantizar un servicio seguro y eficiente, cuidando al trabajador y al medio ambiente, con enfoque en industrias clave.
                        </Title>
                    </Card>
                </Grid.Col>
                <Grid.Col span={6}>
                    <Card radius={0} p="xl" >
                        <Title order={3} tt="uppercase">Visión</Title>
                        <Divider my="sm" />
                        <Title order={6}>
                            Consolidarse como empresa líder en transporte de cargas especiales, siendo referente en la región.
                        </Title>
                    </Card>
                </Grid.Col>
            </Grid> :
                <Stack mb="sm" spacing="xl">
                    <Card radius={0} p="xl" >
                        <Title order={3} tt="uppercase">Misión</Title>
                        <Divider my="sm" />
                        <Title order={6}>
                            Garantizar un servicio seguro y eficiente, cuidando al trabajador y al medio ambiente, con enfoque en industrias clave.
                        </Title>
                    </Card>
                    <Card radius={0} p="xl" >
                        <Title order={3} tt="uppercase">Visión</Title>
                        <Divider my="sm" />
                        <Title order={6}>
                            Consolidarse como empresa líder en transporte de cargas especiales, siendo referente en la región.
                        </Title>
                    </Card>
                </Stack>
            }


            <Card radius={0} p="xl" mb="sm" >
                <Title order={2} tt="uppercase">Servicios Ofrecidos</Title>
                <Divider my="sm" />
                <Grid>
                    <Grid.Col span={isMobile ? 12 : 3}>
                        <Card radius="md" p="sm" withBorder>
                            <Center>
                                <Image src="/plataforma.jpg" alt="Gestión de carga" width={160} height={200} fit="cover" />
                            </Center>
                            <Title order={6} mt="sm" style={{ textAlign: 'center' }}>Gestión de carga</Title>
                        </Card>
                    </Grid.Col>

                    <Grid.Col span={isMobile ? 12 : 3}>
                        <Card radius="md" p="sm" withBorder>
                            <Center>
                                <Image src="/retro.jpg" alt="Preparación y mantenimiento de locaciones" width={160} height={200} fit="cover" />
                            </Center>
                            <Title order={6} mt="sm" style={{ textAlign: 'center' }}>Preparación y mantenimiento de locaciones</Title>
                        </Card>
                    </Grid.Col>

                    <Grid.Col span={isMobile ? 12 : 3}>
                        <Card radius="md" p="sm" withBorder>
                            <Center>
                                <Image src="/vaccum.jpg" alt="Recolección y transporte de residuos" width={160} height={200} fit="cover" />
                            </Center>
                            <Title order={6} mt="sm" style={{ textAlign: 'center' }}>Recolección y transporte de residuos</Title>
                        </Card>
                    </Grid.Col>

                    <Grid.Col span={isMobile ? 12 : 3}>
                        <Card radius="md" p="sm" withBorder>
                            <Center>
                                <Image src="/lowboy.jpg" alt="Transporte de equipos pesados" width={160} height={200} fit="cover" />
                            </Center>
                            <Title order={6} mt="sm" style={{ textAlign: 'center' }}>Transporte de equipos pesados</Title>
                        </Card>
                    </Grid.Col>
                </Grid>
            </Card>
            <Card radius={0} p="xl" mb="sm" >
                <Title order={2} tt="uppercase">Flota y Equipamiento</Title>
                <Divider my="sm" />
                <Box pos="relative" h={300} w="100%" >
                    <Box
                        pos="absolute"
                        top={0}
                        left={0}
                        w="100%"
                        h="100%"
                        bg="rgba(255, 255, 255, 0.6)"
                        style={{ borderRadius: 'var(--mantine-radius-md)' }}
                    />

                    <Image src="/flota.jpg" height={300} width="100%" fit="cover" radius="md" />

                    <Center
                        pos="absolute"
                        top={0}
                        left={0}
                        w="100%"
                        h="100%"
                        style={{ pointerEvents: 'none' }} // evita que interfiera con clics si es decorativo
                    >
                        <Group gap="xl" wrap="wrap" justify="center">
                            <Badge><Title order={5}>16 Chutos</Title></Badge>
                            <Badge><Title order={5}>5 Volteos / 1 Volqueta</Title></Badge>
                            <Badge><Title order={5}>3 Lowboys</Title></Badge>
                            <Badge><Title order={5}>8 Bateas</Title></Badge>
                            <Badge><Title order={5}>Montacargas</Title></Badge>
                            <Badge><Title order={5}>Vacuum / Fénix Trailers</Title></Badge>
                        </Group>
                    </Center>
                </Box>

            </Card>

            {/* Seguridad */}
            <Card radius={0} p="xl" mb="sm" >
                <Title order={2} tt="uppercase">Seguridad y Permisología</Title>
                <Divider my="sm" />
                <Title order={6}>
                    Cumplimos con todos los permisos: RACDA, Bolipuerto, DAEX, ROT, Low-Boy, GPS y monitoreo vial. Inscritos en el Registro Nacional de Contratistas.
                </Title>
            </Card>

            {/* Sostenibilidad y RSE */}
            {!isMobile ? <Grid mb="sm">
                <Grid.Col span={6}>
                    <Card radius={0} p="xl" >
                        <Group>
                            <IconRecycle size={32} />
                            <Title order={3} tt="uppercase">Sostenibilidad</Title>
                        </Group>
                        <Divider my="sm" />
                        <Title order={6}>
                            Protocolos de mantenimiento, capacitación en conducción segura, reducción de emisiones y gestión de residuos.
                        </Title>
                    </Card>
                </Grid.Col>
                <Grid.Col span={6}>
                    <Card radius={0} p="xl" >
                        <Group>
                            <IconUsersGroup size={32} />
                            <Title order={3} tt="uppercase">Responsabilidad Social</Title>
                        </Group>
                        <Divider my="sm" />
                        <Title order={6}>
                            Educación vial, sensibilización ambiental y participación comunitaria. Compromiso con la transparencia y el desarrollo sostenible.
                        </Title>
                    </Card>
                </Grid.Col>
            </Grid>
                :
                <Stack mb="sm" spacing="xl">
                    <Card radius={0} p="xl" >
                        <Group>
                            <IconRecycle size={32} />
                            <Title order={3} tt="uppercase">Sostenibilidad</Title>
                        </Group>
                        <Divider my="sm" />
                        <Title order={6}>
                            Protocolos de mantenimiento, capacitación en conducción segura, reducción de emisiones y gestión de residuos.
                        </Title>
                    </Card>
                    <Card radius={0} p="xl" >
                        <Group>
                            <IconUsersGroup size={32} />
                            <Title order={3} tt="uppercase">Responsabilidad Social</Title>
                        </Group>
                        <Divider my="sm" />
                        <Title order={6}>
                            Educación vial, sensibilización ambiental y participación comunitaria. Compromiso con la transparencia y el desarrollo sostenible.
                        </Title>
                    </Card>
                </Stack>
            }

            {/* Experiencia */}
            <Card radius={0} p="xl" mb="sm" >
                <Title order={2} tt="uppercase">Experiencia en la Industria</Title>
                <Divider my="sm" />
                <Title order={6}>
                    Proyectos con Schlumberger, Chevron, PDVSA, SIZUCA y más. Logística especializada en zonas de difícil acceso y cargas sobredimensionadas.
                </Title>
            </Card>

            {/* Beneficios */}
            <Card radius={0} p="xl" mb="sm" >
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


        </Box>
    );
}