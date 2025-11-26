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
} from "@mantine/core"
import { useParams, useRouter } from "next/navigation"
import calcularEdad from "@/app/helpers/calcularEdad";

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

    useEffect(() => {
        let mounted = true
        async function cargar() {
            try {
                const res = await fetch(`/api/rrhh/empleados/${id}`)
                if (!res.ok) throw new Error("No hay datos")
                const data = await res.json()
            console.log(data)
                if (!mounted) return
                setEmpleado({...data, edad: calcularEdad(data.fechaNacimiento)})
                if (data.imagen) setPreview(`${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/${data.imagen}`)
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

    useEffect(() => {
      console.log(preview)
    }, [preview])
    


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
                                {empleado?.puestos.map(puesto => puesto.nombre).join(",")}
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
                            <Button variant="outline">Ver historial</Button>
                        </Group>
                    </Grid.Col>
                </Grid>
            </Paper>
        </Container>
    )
}