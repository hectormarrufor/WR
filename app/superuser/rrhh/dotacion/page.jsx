"use client";

import { useEffect, useState } from "react";
import { 
    Container, Title, SimpleGrid, Paper, Text, Table, Badge, Stack, Group, Center, 
    Button, Modal, Avatar, ActionIcon, ScrollArea, Tooltip
} from "@mantine/core";
import { IconShirt, IconShoe, IconAffiliate, IconExternalLink, IconAlertCircle } from "@tabler/icons-react";
import Link from "next/link";

export default function DotacionReportPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    // Estados para el Modal
    const [modalOpen, setModalOpen] = useState(false);
    const [modalLoading, setModalLoading] = useState(false);
    const [empleadosSinTalla, setEmpleadosSinTalla] = useState([]);
    const [campoSeleccionado, setCampoSeleccionado] = useState("");
    const [tituloModal, setTituloModal] = useState("");

    useEffect(() => {
        fetch("/api/rrhh/reporte-tallas")
            .then(res => res.json())
            .then(data => {
                setData(data);
                setLoading(false);
            });
    }, []);

    // Función para abrir el modal y cargar datos
    const handleVerSinTalla = async (campo, tituloLegible) => {
        setCampoSeleccionado(campo);
        setTituloModal(tituloLegible);
        setModalOpen(true);
        setModalLoading(true);

        try {
            const res = await fetch(`/api/rrhh/empleados-sin-talla?campo=${campo}`);
            const data = await res.json();
            setEmpleadosSinTalla(data);
        } catch (error) {
            console.error("Error cargando empleados", error);
        } finally {
            setModalLoading(false);
        }
    };

    if (loading) return <Center h="50vh"><Text>Cargando reporte...</Text></Center>;
    if (!data) return <Center h="50vh"><Text>No hay datos disponibles</Text></Center>;

    return (
        <Container size="xl" py="xl">
            <Title order={2} mb="xl">Necesidades de Dotación (Personal Activo)</Title>

            <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
                <TallaCard
                    titulo="Calzado de Seguridad"
                    icon={<IconShoe size={24} />}
                    color="blue"
                    items={data.calzado} // Asegúrate que tu API devuelve 'zapatos' o 'calzado'
                    keyName="tallaCalzado" // Debe coincidir con el modelo DB
                    onVerSinTalla={() => handleVerSinTalla("tallaCalzado", "Calzado")}
                />

                <TallaCard
                    titulo="Camisas / Uniformes"
                    icon={<IconShirt size={24} />}
                    color="orange"
                    items={data.camisas}
                    keyName="tallaCamisa"
                    onVerSinTalla={() => handleVerSinTalla("tallaCamisa", "Camisas")}
                />

                <TallaCard
                    titulo="Pantalones"
                    icon={<IconAffiliate size={24} />}
                    color="teal"
                    items={data.pantalones}
                    keyName="tallaPantalon"
                    onVerSinTalla={() => handleVerSinTalla("tallaPantalon", "Pantalones")}
                />

                <TallaCard
                    titulo="Bragas / Overoles"
                    icon={<IconAffiliate size={24} />}
                    color="grape"
                    items={data.bragas} // Asegúrate que tu API devuelve esto si lo agregaste
                    keyName="tallaBraga"
                    onVerSinTalla={() => handleVerSinTalla("tallaBraga", "Bragas")}
                />
            </SimpleGrid>

            {/* MODAL DE EMPLEADOS SIN TALLA */}
            <Modal 
                opened={modalOpen} 
                onClose={() => setModalOpen(false)} 
                title={<Group><IconAlertCircle color="orange"/><Text fw={700}>Empleados sin talla de {tituloModal}</Text></Group>}
                size="lg"
            >
                {modalLoading ? (
                    <Center p="xl"><Text c="dimmed">Cargando lista...</Text></Center>
                ) : empleadosSinTalla.length === 0 ? (
                    <Text c="dimmed" ta="center" p="xl">¡Todo el personal tiene su talla asignada!</Text>
                ) : (
                    <ScrollArea h={400}>
                        <Table striped highlightOnHover>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Empleado</Table.Th>
                                    <Table.Th>Cédula</Table.Th>
                                    <Table.Th style={{textAlign: 'right'}}>Acción</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {empleadosSinTalla.map(emp => (
                                    <Table.Tr key={emp.id}>
                                        <Table.Td>
                                            <Group gap="sm">
                                                <Avatar src={emp.imagen ? `${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/${emp.imagen}` : null} radius="xl" size="sm" />
                                                <Text size="sm" fw={500}>{emp.nombre} {emp.apellido}</Text>
                                            </Group>
                                        </Table.Td>
                                        <Table.Td><Text size="sm">{emp.cedula}</Text></Table.Td>
                                        <Table.Td style={{textAlign: 'right'}}>
                                            <Button 
                                                component={Link} 
                                                href={`/superuser/rrhh/empleados/${emp.id}/editar`}
                                                variant="light" 
                                                size="xs"
                                                rightSection={<IconExternalLink size={14}/>}
                                            >
                                                Asignar
                                            </Button>
                                        </Table.Td>
                                    </Table.Tr>
                                ))}
                            </Table.Tbody>
                        </Table>
                    </ScrollArea>
                )}
            </Modal>
        </Container>
    );
}

function TallaCard({ titulo, icon, color, items, keyName, onVerSinTalla }) {
    // Calcular totales para mostrar si falta data o no
    const totalItems = items?.reduce((acc, curr) => acc + parseInt(curr.total), 0) || 0;

    return (
        <Paper shadow="sm" p="md" withBorder radius="md" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Group mb="md" justify="space-between">
                <Group>
                    <Badge size="xl" circle color={color} variant="light">{icon}</Badge>
                    <Text fw={700} size="lg">{titulo}</Text>
                </Group>
                <Badge variant="outline" color={color}>{totalItems} Total</Badge>
            </Group>

            <ScrollArea h={250} type="auto">
                <Table verticalSpacing="xs">
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>Talla</Table.Th>
                            <Table.Th ta="right">Cant.</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {items?.map((item, index) => {
                            const isNull = !item[keyName] || item[keyName] === "null"; // Chequeo de nulidad
                            
                            return (
                                <Table.Tr key={index} bg={isNull ? 'red.0' : undefined}>
                                    <Table.Td>
                                        {isNull ? (
                                            <Button 
                                                variant="subtle" 
                                                color="red" 
                                                size="compact-xs" 
                                                onClick={onVerSinTalla}
                                                leftSection={<IconAlertCircle size={14}/>}
                                            >
                                                Sin Especificar (Ver)
                                            </Button>
                                        ) : (
                                            <Text fw={500}>{item[keyName]}</Text>
                                        )}
                                    </Table.Td>
                                    <Table.Td ta="right">
                                        <Badge variant={isNull ? "filled" : "outline"} color={isNull ? "red" : color}>
                                            {item.total}
                                        </Badge>
                                    </Table.Td>
                                </Table.Tr>
                            )
                        })}
                        {(!items || items.length === 0) && (
                            <Table.Tr>
                                <Table.Td colSpan={2} align="center"><Text c="dimmed" size="sm">No hay datos</Text></Table.Td>
                            </Table.Tr>
                        )}
                    </Table.Tbody>
                </Table>
            </ScrollArea>
        </Paper>
    );
}