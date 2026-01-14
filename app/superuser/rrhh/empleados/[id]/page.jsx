"use client"

import React, { useEffect, useState } from "react"
import {
    Container, Paper, Grid, Title, Text, Group, Button,
    Center, Loader, Stack, Badge, ScrollArea, Table,
    Modal, Flex, SimpleGrid, Box, Card, Avatar, Divider,
    ThemeIcon, Tabs, ActionIcon, Tooltip
} from "@mantine/core"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link";
import { 
    IconEdit, IconPhone, IconId, IconCake, IconCalendar, 
    IconCurrencyDollar, IconBuildingBank, IconDeviceMobile, 
    IconClock, IconBriefcase 
} from "@tabler/icons-react";
import { useAuth } from "@/hooks/useAuth";
import calcularEdad from "@/app/helpers/calcularEdad";
import { actualizarSueldos } from "@/app/helpers/calcularSueldo";

// Modales
import ModalCrearHora from "./ModalCrearHora";
import ModalCuentaBancaria from "./ModalCuentaBancaria";
import ModalPagoMovil from "./ModalPagoMovil";

export default function Page({ params }) {
    const { id } = useParams(params);
    const router = useRouter();
    
    // Estados de Datos
    const [empleado, setEmpleado] = useState(null)
    const [bcvPrecio, setBcvPrecio] = useState(0);
    const [cargando, setCargando] = useState(true);
    
    // Estados Calculados
    const [horasEstaSemana, setHorasEstaSemana] = useState(0);
    const [horasExtraEstaSemana, setHorasExtraEstaSemana] = useState(0);
    
    // Estados de UI
    const { rol } = useAuth();
    const [activeTab, setActiveTab] = useState('banco');
    
    // Modales
    const [modalCrearHora, setModalCrearHora] = useState(false);
    const [modalCuenta, setModalCuenta] = useState(false);
    const [modalPagoMovil, setModalPagoMovil] = useState(false);

    useEffect(() => {
        let mounted = true
        async function cargar() {
            try {
                const res = fetch(`/api/rrhh/empleados/${id}`).then(r => r.json())
                const bcv = fetch(`/api/bcv?force=true`).then(r => r.json())

                const [empleadofetched, bcvres] = await Promise.all([res, bcv]);
                
                if (!mounted) return;

                setBcvPrecio(bcvres.precio);

                // Cálculos de horas
                const horasTotal = empleadofetched.HorasTrabajadas?.reduce((total, hora) => total + hora.horas, 0) || 0;
                setHorasEstaSemana(horasTotal);

                const horasExtra = empleadofetched.HorasTrabajadas?.reduce((total, hora) => {
                    return hora.horas > 8 ? total + (hora.horas - 8) : total;
                }, 0) || 0;
                setHorasExtraEstaSemana(horasExtra);

                setEmpleado({ 
                    ...empleadofetched, 
                    edad: calcularEdad(empleadofetched.fechaNacimiento), 
                    horario: actualizarSueldos("mensual", empleadofetched.sueldo).horario 
                });

            } catch (err) {
                console.error(err);
                if (mounted) {
                    // Manejo de error básico o redirección
                    setEmpleado(null); 
                }
            } finally {
                if (mounted) setCargando(false)
            }
        }
        cargar()
        return () => (mounted = false)
    }, [id]);

    if (cargando) {
        return (
            <Center h="80vh">
                <Stack align="center">
                    <Loader size="lg" />
                    <Text c="dimmed">Cargando perfil del empleado...</Text>
                </Stack>
            </Center>
        )
    }

    if (!empleado) return <Text align="center" mt="xl">Empleado no encontrado</Text>;

    const StatCard = ({ title, value, subtext, color = "blue", icon: Icon }) => (
        <Paper withBorder p="md" radius="md" shadow="xs">
            <Group justify="space-between">
                <div>
                    <Text c="dimmed" tt="uppercase" fw={700} size="xs">{title}</Text>
                    <Text fw={700} size="xl">{value}</Text>
                    {subtext && <Text c="dimmed" size="xs">{subtext}</Text>}
                </div>
                <ThemeIcon variant="light" color={color} size="lg" radius="md">
                    <Icon size="1.5rem" />
                </ThemeIcon>
            </Group>
        </Paper>
    );

    const horasNormales = horasEstaSemana - horasExtraEstaSemana;
    const pagoHorasNormalesBs = (horasNormales * empleado.horario * bcvPrecio).toFixed(2);
    const pagoHorasExtraBs = (horasExtraEstaSemana * empleado.horario * bcvPrecio).toFixed(2);
    const totalPagarBs = ((horasEstaSemana * empleado.horario) * bcvPrecio).toFixed(2);
    const totalPagarUsd = (horasEstaSemana * empleado.horario).toFixed(2);

    return (
        <Paper size="xl" py="xl">
            {/* --- CABECERA MÓVIL (Solo título) --- */}
            <Group justify="space-between" mb="lg">
                <div>
                   <Title order={2}>Perfil de Empleado</Title>
                   <Text c="dimmed" size="sm">Gestión de RRHH y Nómina</Text>
                </div>
                 <Button leftSection={<IconEdit size={18} />} variant="outline" onClick={() => router.push(`/superuser/rrhh/empleados/${empleado.id}/editar`)}>
                    Editar Perfil
                </Button>
            </Group>

            <Grid gutter="lg">
                {/* --- COLUMNA IZQUIERDA: PERFIL --- */}
                <Grid.Col span={{ base: 12, md: 4, lg: 3 }}>
                    <Card withBorder padding="xl" radius="md" shadow="sm">
                        <Card.Section inheritPadding py="md" bg="gray.0">
                             <Stack align="center" gap="xs">
                                <Avatar 
                                    src={empleado.imagen ? `${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/${empleado.imagen}` : null} 
                                    size={120} 
                                    radius={120} 
                                    color="blue"
                                    style={{ border: '4px solid white', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}
                                >
                                    {(!empleado.imagen) && empleado.nombre?.charAt(0)}
                                </Avatar>
                                <div style={{ textAlign: 'center' }}>
                                    <Title order={3}>{empleado.nombre}</Title>
                                    <Title order={3} c="dimmed" style={{ lineHeight: 1 }}>{empleado.apellido}</Title>
                                </div>
                                <Group gap={5} justify="center" mt={5}>
                                     {empleado.puestos?.map((p, i) => (
                                        <Badge key={i} variant="dot" size="md">{p.nombre}</Badge>
                                     ))}
                                </Group>
                             </Stack>
                        </Card.Section>

                        <Stack mt="md" gap="md">
                            <Group wrap="nowrap">
                                <IconId size={20} color="gray" style={{ minWidth: 20 }}/>
                                <div>
                                    <Text size="xs" c="dimmed">Cédula</Text>
                                    <Text size="sm" fw={500}>{empleado.cedula}</Text>
                                </div>
                            </Group>
                            <Group wrap="nowrap">
                                <IconPhone size={20} color="gray" style={{ minWidth: 20 }}/>
                                <div>
                                    <Text size="xs" c="dimmed">Teléfono</Text>
                                    <Text size="sm" fw={500}>{empleado.telefono}</Text>
                                </div>
                            </Group>
                            <Group wrap="nowrap">
                                <IconCake size={20} color="gray" style={{ minWidth: 20 }}/>
                                <div>
                                    <Text size="xs" c="dimmed">Edad / Nacimiento</Text>
                                    <Text size="sm" fw={500}>{empleado.edad} años ({new Date(empleado.fechaNacimiento).toLocaleDateString()})</Text>
                                </div>
                            </Group>
                             <Group wrap="nowrap">
                                <IconBriefcase size={20} color="gray" style={{ minWidth: 20 }}/>
                                <div>
                                    <Text size="xs" c="dimmed">Fecha Ingreso</Text>
                                    <Text size="sm" fw={500}>{new Date(empleado.fechaIngreso).toLocaleDateString()}</Text>
                                </div>
                            </Group>

                            {(rol.includes("Presidente") || rol.includes("admin")) && (
                                <>
                                    <Divider my="sm" />
                                    <Group justify="space-between">
                                        <Text size="sm" c="dimmed">Sueldo Base:</Text>
                                        <Badge size="lg" color="green" variant="light">${empleado.sueldo}</Badge>
                                    </Group>
                                     <Group justify="space-between">
                                        <Text size="sm" c="dimmed">Valor Hora:</Text>
                                        <Text fw={700}>${empleado.horario}</Text>
                                    </Group>
                                </>
                            )}
                        </Stack>
                    </Card>
                </Grid.Col>

                {/* --- COLUMNA DERECHA: DASHBOARD --- */}
                <Grid.Col span={{ base: 12, md: 8, lg: 9 }}>
                    <Stack gap="lg">
                        
                        {/* 1. SECCIÓN DE ESTADÍSTICAS */}
                        <div>
                             <Group justify="space-between" mb="xs">
                                <Title order={4}>Resumen de la Semana</Title>
                                {(rol.includes("Presidente") || rol.includes("admin")) && 
                                    <Badge variant="outline" color="gray">Tasa BCV: {bcvPrecio} Bs</Badge>
                                }
                            </Group>
                            
                            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
                                <StatCard 
                                    title="Horas Trabajadas" 
                                    value={`${horasEstaSemana} hrs`} 
                                    subtext={`${horasExtraEstaSemana} horas extra`}
                                    icon={IconClock}
                                    color="blue"
                                />
                                {(rol.includes("Presidente") || rol.includes("admin")) && (
                                    <>
                                        <StatCard 
                                            title="Estimado a Pagar (Bs)" 
                                            value={`Bs. ${totalPagarBs}`} 
                                            subtext={`Equivalente a $${totalPagarUsd}`}
                                            icon={IconCurrencyDollar}
                                            color="green"
                                        />
                                        <StatCard 
                                            title="Desglose Pago" 
                                            value={`Bs. ${pagoHorasNormalesBs}`} 
                                            subtext={`+ Bs. ${pagoHorasExtraBs} (Extras)`}
                                            icon={IconCalendar}
                                            color="orange"
                                        />
                                    </>
                                )}
                            </SimpleGrid>
                        </div>

                        {/* 2. SECCIÓN DE DATOS BANCARIOS (TABS) */}
                        <Paper withBorder radius="md" p="md">
                             <Tabs value={activeTab} onChange={setActiveTab}>
                                <Tabs.List>
                                    <Tabs.Tab value="banco" leftSection={<IconBuildingBank size={16}/>}>Cuentas Bancarias</Tabs.Tab>
                                    <Tabs.Tab value="pagoMovil" leftSection={<IconDeviceMobile size={16}/>}>Pago Móvil</Tabs.Tab>
                                </Tabs.List>

                                <Tabs.Panel value="banco" pt="md">
                                    {empleado.cuentasBancarias?.length > 0 ? (
                                        <SimpleGrid cols={{ base: 1, sm: 2 }}>
                                            {empleado.cuentasBancarias.map(cuenta => (
                                                <Card key={cuenta.id} withBorder shadow="xs" padding="sm" radius="md">
                                                    <Group justify="space-between" mb="xs">
                                                        <Text fw={700}>{cuenta.nombreBanco}</Text>
                                                        <Badge variant="light">{cuenta.tipoCuenta}</Badge>
                                                    </Group>
                                                    <Text size="sm"><Text span c="dimmed">Titular:</Text> {cuenta.titularCuenta}</Text>
                                                    <Text size="sm"><Text span c="dimmed">CI:</Text> {cuenta.cedulaTitular}</Text>
                                                    <Text size="sm" mt="xs" ff="monospace" bg="gray.1" p={4} style={{borderRadius: 4}}>{cuenta.numeroCuenta}</Text>
                                                </Card>
                                            ))}
                                        </SimpleGrid>
                                    ) : <Text c="dimmed" fs="italic">No hay cuentas bancarias registradas</Text>}
                                    <Button mt="md" variant="light" size="xs" onClick={() => setModalCuenta(true)}>+ Añadir Cuenta</Button>
                                </Tabs.Panel>

                                <Tabs.Panel value="pagoMovil" pt="md">
                                    {empleado.pagosMoviles?.length > 0 ? (
                                        <SimpleGrid cols={{ base: 1, sm: 2 }}>
                                            {empleado.pagosMoviles.map(pm => (
                                                <Card key={pm.id} withBorder shadow="xs" padding="sm" radius="md">
                                                     <Group justify="space-between" mb="xs">
                                                        <Text fw={700}>{pm.nombreBanco}</Text>
                                                        <IconDeviceMobile size={18} color="gray"/>
                                                    </Group>
                                                    <Text size="sm"><Text span c="dimmed">Titular:</Text> {pm.titularCuenta}</Text>
                                                    <Text size="sm"><Text span c="dimmed">CI:</Text> {pm.cedulaCuenta}</Text>
                                                    <Text size="xl" fw={700} mt="xs" c="blue">{pm.numeroPagoMovil}</Text>
                                                </Card>
                                            ))}
                                        </SimpleGrid>
                                    ) : <Text c="dimmed" fs="italic">No hay pago móvil registrado</Text>}
                                     <Button mt="md" variant="light" size="xs" onClick={() => setModalPagoMovil(true)}>+ Añadir Pago Móvil</Button>
                                </Tabs.Panel>
                            </Tabs>
                        </Paper>

                        {/* 3. SECCIÓN HISTORIAL DE HORAS */}
                        <Paper withBorder radius="md" p="md">
                            <Group justify="space-between" mb="md">
                                <Title order={4}>Historial de Horas</Title>
                                <Button size="sm" onClick={() => setModalCrearHora(true)}>Registrar Horas</Button>
                            </Group>

                            {empleado.HorasTrabajadas?.length === 0 ? (
                                <Center p="xl" bg="gray.0" style={{ borderRadius: 8 }}>
                                    <Text c="dimmed">No hay registros de horas trabajadas.</Text>
                                </Center>
                            ) : (
                                <ScrollArea h={300} type="auto">
                                    <Table striped highlightOnHover verticalSpacing="xs">
                                        <Table.Thead>
                                            <Table.Tr>
                                                <Table.Th>Fecha</Table.Th>
                                                <Table.Th>Horas</Table.Th>
                                                <Table.Th>Origen</Table.Th>
                                                <Table.Th>Observaciones</Table.Th>
                                            </Table.Tr>
                                        </Table.Thead>
                                        <Table.Tbody>
                                            {empleado.HorasTrabajadas.map((h) => (
                                                <Table.Tr key={h.id}>
                                                    <Table.Td style={{ whiteSpace: 'nowrap' }}>
                                                        {new Date(h.fecha).toLocaleDateString()}
                                                    </Table.Td>
                                                    <Table.Td>
                                                        <Badge color={h.horas > 8 ? 'orange' : 'blue'} variant="light">
                                                            {h.horas} hrs
                                                        </Badge>
                                                    </Table.Td>
                                                    <Table.Td>
                                                        {h.origen === "odt" ? (
                                                             <Link href={`/superuser/odt/${h.odtId}`} style={{ textDecoration: 'none', color: '#228be6' }}>
                                                                {h.observaciones.match(/ODT\s+#(\d+)/)?.[0] || 'ODT'}
                                                             </Link>
                                                        ) : (
                                                            <Badge variant="outline" color="gray">{h.origen}</Badge>
                                                        )}
                                                    </Table.Td>
                                                    <Table.Td style={{ minWidth: 200 }}>
                                                        <Text size="sm" lineClamp={2}>{h.observaciones}</Text>
                                                    </Table.Td>
                                                </Table.Tr>
                                            ))}
                                        </Table.Tbody>
                                    </Table>
                                </ScrollArea>
                            )}
                        </Paper>

                    </Stack>
                </Grid.Col>
            </Grid>

            {/* --- MODALES --- */}
            <ModalCrearHora
                opened={modalCrearHora}
                onClose={() => setModalCrearHora(false)}
                empleadoId={id}
                onCreated={() => router.refresh()}
            />
            <ModalCuentaBancaria
                opened={modalCuenta}
                onClose={() => setModalCuenta(false)}
                tipoEntidad="empleado"
                entidadId={id}
                onCreated={() => router.refresh()}
            />
            <ModalPagoMovil
                opened={modalPagoMovil}
                onClose={() => setModalPagoMovil(false)}
                tipoEntidad="empleado"
                entidadId={id}
                onCreated={() => router.refresh()}
            />
        </Paper>
    )
}