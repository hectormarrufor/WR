"use client"

import React, { useEffect, useState } from "react"
import {
    Container,
    Paper,
    Grid,
    Image,
    Title,
    Text,
    Group,
    Button,
    FileButton,
    Center,
    Loader,
    Stack,
    Badge,
    ScrollArea,
    Table,
    UnstyledButton,
    Modal,
} from "@mantine/core"
import { useParams, useRouter } from "next/navigation"
import calcularEdad from "@/app/helpers/calcularEdad";
import Link from "next/link";
import ModalCrearHora from "./ModalCrearHora";

/**
 * Página adaptada a Mantine: /superuser/rrhh/empleados/[id]/page.jsx
 * - Usa componentes Mantine para la maquetación y estilos.
 * - Mantiene la lógica original de fetch + mock y preview local de imagen.
 */

export default function Page({ params }) {
    const { id } = useParams(params);
    const router = useRouter();
    const [empleado, setEmpleado] = useState(null)
    const [cargando, setCargando] = useState(true)
    const [preview, setPreview] = useState(null)
    const [modalCrearHora, setModalCrearHora] = useState(false);
    

    useEffect(() => {
        let mounted = true
        async function cargar() {
            try {
                const res = await fetch(`/api/rrhh/empleados/${id}`)
                if (!res.ok) throw new Error("No hay datos")
                const data = await res.json()
                console.log(data)
                if (!mounted) return
                setEmpleado({ ...data, edad: calcularEdad(data.fechaNacimiento) })
                if (data.imagen) setPreview(`${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/${data.imagen}?${Date.now()}`)
            } catch (err) {
                if (!mounted) return
                setEmpleado({
                    id,
                    nombre: "Nombre Apellido",
                    puesto: "Puesto ejemplo",
                    departamento: "Departamento",
                    email: "empleado@ejemplo.com",
                    telefono: "+52 55 0000 0000",
                    fechaIngreso: "2024-01-01",
                    imagen: null,
                })
            } finally {
                if (mounted) setCargando(false)
            }
        }
        cargar()
        return () => (mounted = false)
    }, [id]);





    if (cargando) {
        return (
            <Center style={{ padding: 24 }}>
                <Paper withBorder shadow="sm" p="lg" radius="md">
                    <Group spacing="sm">
                        <Loader size="sm" />
                        <Text>Cargando empleado...</Text>
                    </Group>
                </Paper>
            </Center>
        )
    }

    return (
        <Container size="lg" py="xl">
            <Paper withBorder shadow="md" p="lg" radius="md">
                <Grid gutter="xl" align="center">
                    <Grid.Col span={12} md={4}>
                        <Stack align="center">
                            {preview ? (
                                <Image
                                    src={preview}
                                    alt={`Foto ${empleado?.nombre}`}
                                    w={200}
                                    radius="md"
                                    fit="cover"
                                />
                            ) : (
                                <Paper
                                    withBorder
                                    radius="md"
                                    p="xl"
                                    style={{
                                        width: 200,
                                        height: 200,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        backgroundColor: "#f3f4f6",
                                    }}
                                >
                                    <Text color="dimmed">Sin imagen</Text>
                                </Paper>
                            )}
                        </Stack>
                    </Grid.Col>

                    <Grid.Col span={12} md={8} justify="center" align="center">
                        <Stack>
                            <Title order={4}><strong>{empleado?.nombre} {empleado?.apellido}</strong></Title>
                            <Text>
                                {empleado?.puestos?.map(puesto => puesto.nombre).join(",")}
                            </Text>
                            <Text>
                                <strong>Teléfono:</strong> {empleado?.telefono}
                            </Text>
                            <Text>
                                <strong>Cedula:</strong> {empleado?.cedula}
                            </Text>
                            <Text>
                                <strong>Edad:</strong> {empleado?.edad}
                            </Text>
                            <Text>
                                <strong>Fecha de Nacimiento:</strong> {new Date(empleado?.fechaNacimiento).toLocaleDateString()}
                            </Text>
                            <Text>
                                <strong>Fecha de ingreso:</strong> {empleado?.fechaIngreso.substring(0, 10).split("-").reverse().join("-")}
                            </Text>
                        </Stack>

                        <Group mt="lg">
                            <Button variant="filled" onClick={() => router.push(`/superuser/rrhh/empleados/${empleado.id}/editar`)}>Editar</Button>
                            <Button variant="outline" onClick={() => setModalCrearHora(true)}>Añadir horas en la base</Button>
                        </Group>
                    </Grid.Col>
                </Grid>
            </Paper>
            <Paper shadow="sm" radius="md" p="md" mt="lg" withBorder>
                <Title order={3} mb="md">
                    Horas trabajadas recientes
                </Title>

                {empleado.HorasTrabajadas?.length === 0 ? (
                    <Text c="dimmed">No hay registros de horas trabajadas en este período.</Text>
                ) : (
                    <ScrollArea>
                        <Table striped highlightOnHover withTableBorder withColumnBorders>
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
                                        <Table.Td>{new Date(h.fecha).toLocaleDateString()}</Table.Td>
                                        <Table.Td>{h.horas}</Table.Td>
                                        <Table.Td>{h.origen === "odt" ? <Link href={`/superuser/odt/${h.odtId}`}>{h.observaciones.match(/ODT\s+#(\d+)/)[0]}</Link> : h.origen}</Table.Td>
                                        <Table.Td style={{ whiteSpace: 'normal' }}>{h.observaciones}</Table.Td>
                                    </Table.Tr>
                                ))}
                            </Table.Tbody>
                        </Table>
                    </ScrollArea>
                )}
            </Paper>
            <ModalCrearHora
                opened={modalCrearHora}
                onClose={() => setModalCrearHora(false)}
                empleadoId={id}
                onCreated={() => {
                    // Recargar la página para ver las nuevas horas
                    router.refresh();
                }}
            />

        </Container>
    )
}