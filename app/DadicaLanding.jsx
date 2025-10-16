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

            {/* Servicios */}
            <Card radius={0} p="xl" mb="sm" >
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
            <Card radius={0} p="xl" mb="sm" >
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