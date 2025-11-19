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

/**
 * Página adaptada a Mantine: /superuser/rrhh/empleados/[id]/page.jsx
 * - Usa componentes Mantine para la maquetación y estilos.
 * - Mantiene la lógica original de fetch + mock y preview local de imagen.
 */

export default function Page({ params }) {
    const { id } = params || {}
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
                if (!mounted) return
                setEmpleado(data)
                console.log(data)
                if (data.imageUrl) setPreview(data.imageUrl)
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
                    imageUrl: null,
                })
            } finally {
                if (mounted) setCargando(false)
            }
        }
        cargar()
        return () => (mounted = false)
    }, [id])

    function handleImageFile(file) {
        if (!file) return
        const url = URL.createObjectURL(file)
        setPreview(url)
        // TODO: subir el archivo a tu API (fetch POST con FormData) y guardar la URL en la base de datos
    }

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
                                    width={200}
                                    height={200}
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

                            <FileButton accept="image/*" onChange={handleImageFile}>
                                {(props) => (
                                    <Button {...props} mt="sm" variant="filled">
                                        Subir imagen
                                    </Button>
                                )}
                            </FileButton>

                            <Text size="xs" color="dimmed" align="center">
                                Puedes subir una foto del empleado (no se guarda automáticamente).
                            </Text>
                        </Stack>
                    </Grid.Col>

                    <Grid.Col span={12} md={8}>
                        <Group position="apart" align="flex-start" mb="sm">
                            <Title order={3}>{empleado?.nombre}</Title>
                            <Badge color="gray" variant="light">
                                ID: {empleado?.id}
                            </Badge>
                        </Group>

                        <Stack spacing="xs">
                            <Text>
                                <strong>Puesto:</strong> {empleado?.puestos.map(puesto => puesto.nombre).join(",")}
                            </Text>
                            <Text>
                                <strong>Departamento:</strong> {empleado?.departamento}
                            </Text>
                            <Text>
                                <strong>Email:</strong> {empleado?.email}
                            </Text>
                            <Text>
                                <strong>Teléfono:</strong> {empleado?.telefono}
                            </Text>
                            <Text>
                                <strong>Fecha de ingreso:</strong> {empleado?.fechaIngreso}
                            </Text>
                        </Stack>

                        <Group mt="lg">
                            <Button variant="filled">Editar</Button>
                            <Button variant="outline">Ver historial</Button>
                        </Group>
                    </Grid.Col>
                </Grid>
            </Paper>
        </Container>
    )
}