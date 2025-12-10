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
    Flex,
} from "@mantine/core"
import { useParams, useRouter } from "next/navigation"
import calcularEdad from "@/app/helpers/calcularEdad";
import Link from "next/link";
import ModalCrearHora from "./ModalCrearHora";
import { IconEdit } from "@tabler/icons-react";
import { useAuth } from "@/hooks/useAuth";
import { actualizarSueldos } from "@/app/helpers/calcularSueldo";
import ModalCuentaBancaria from "./ModalCuentaBancaria";

/**
 * Página adaptada a Mantine: /superuser/rrhh/empleados/[id]/page.jsx
 * - Usa componentes Mantine para la maquetación y estilos.
 * - Mantiene la lógica original de fetch + mock y preview local de imagen.
 */

export default function Page({ params }) {
    const { id } = useParams(params);
    const router = useRouter();
    const [empleado, setEmpleado] = useState(null)
    const [bcvPrecio, setBcvPrecio] = useState(0);
    const [cargando, setCargando] = useState(true);
    const [horasEstaSemana, setHorasEstaSemana] = useState(0);
    const [horasExtraEstaSemana, setHorasExtraEstaSemana] = useState(0);
    const [preview, setPreview] = useState(null)
    const [modalCrearHora, setModalCrearHora] = useState(false);
    const { rol, isAdmin } = useAuth();


    useEffect(() => {
        let mounted = true
        async function cargar() {
            try {
                const res = fetch(`/api/rrhh/empleados/${id}`).then(r => r.json())
                const bcv = fetch(`/api/bcv`).then(r => r.json())

                const [empleadofetched, bcvres] = await Promise.all([res, bcv]);
                setBcvPrecio(bcvres.precio);
                console.log(empleadofetched);
                console.log(bcvres);

                // setHorasEstaSemana(data.HorasTrabajadas.reduce((total, hora) => {
                //     const fechaHora = new Date(hora.fecha);
                //     const ahora = new Date();
                //     const primerDiaSemana = new Date(ahora.setDate(ahora.getDate() - ahora.getDay()));
                //     if (fechaHora >= primerDiaSemana) {
                //         return total + hora.horas;
                //     }
                //     return total;
                // }, 0));

                setHorasEstaSemana(empleadofetched.HorasTrabajadas.reduce((total, hora) => {
                    total += hora.horas;
                    return total;
                }, 0));

                setHorasExtraEstaSemana(empleadofetched.HorasTrabajadas.reduce((total, hora) => {
                    if (hora.horas > 8) {
                        total += (hora.horas - 8);
                    }
                    return total;
                }, 0));

                if (!mounted) return
                setEmpleado({ ...empleadofetched, edad: calcularEdad(empleadofetched.fechaNacimiento), horario: actualizarSueldos("mensual", empleadofetched.sueldo).horario });
                if (empleadofetched.imagen) setPreview(`${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/${empleadofetched.imagen}?${Date.now()}`)
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

            <Center centered style={{ padding: 24 }}>
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
                    <Grid.Col span={4} md={4}>
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
                                <strong>Fecha de Nacimiento:</strong> {empleado?.fechaNacimiento?.substring(0, 10).split("-").reverse().join("-")}
                            </Text>
                            <Text>
                                <strong>Fecha de ingreso:</strong> {empleado?.fechaIngreso?.substring(0, 10).split("-").reverse().join("-")}
                            </Text>
                            {rol.includes("Presidente") || rol.includes("admin") && <Text>
                                <strong>Sueldo Mensual:</strong> {empleado?.sueldo}$
                            </Text>}
                            <Button variant="filled" onClick={() => router.push(`/superuser/rrhh/empleados/${empleado.id}/editar`)}><IconEdit /> Editar Empleado</Button>
                            {empleado?.cuentasBancarias?.length > 0 ?
                                <>
                                    <Title order={4}>Cuentas bancarias asociadas:</Title>
                                    {empleado.cuentasBancarias.map((cuenta) => (
                                        <Stack key={cuenta.id} align="center">
                                            <Title order={5}>Cuenta ban asociado: </Title>
                                            <Text>Banco: {empleado.nombreBanco}</Text>
                                            <Text>Titular: {empleado.titularCuenta}</Text>
                                            <Text>cedula del titular: {empleado.cedulaTitular}</Text>
                                            <Text>numero de cuenta: {empleado.numeroCuenta}</Text>
                                            <Text>tipo de cuenta: {empleado.tipoCuenta}</Text>

                                        </Stack>))}
                                </>
                                : <Title order={6}>No hay cuentas bancarias asociadas</Title>}
                            <Button variant="filled" onClick={() => setModalCuenta(true)}><IconEdit /> Añadir cuenta bancaria</Button>

                            {empleado?.pagosMovil?.length > 0 ?
                                empleado.pagosMovil.map((pagoMovil) => (
                                <Stack align="center">
                                    <Title order={5}>Pago Móvil asociado: </Title>
                                    <Text>Banco: {empleado.pagoMovil.nombreBanco}</Text>
                                    <Text>Titular: {empleado.pagoMovil.titularCuenta}</Text>
                                    <Text>Numero pago movil: {empleado.pagoMovil.numeroPagoMovil} </Text>
                                    <Text>Cedula: {empleado.pagoMovil.cedulaCuenta} </Text>
                                </Stack> ))
                                :
                                <Title order={6}>No hay Pago Móvil asociado</Title>
                            }
                            <Button variant="filled" onClick={() => setModalPagoMovil(true)}><IconEdit /> Añadir Pago Móvil</Button>
                        </Stack>
                    </Grid.Col>

                    <Grid.Col span={8} md={8} justify="center" align="center">
                        <Stack>

                            {rol.includes("Presidente") || rol.includes("admin") && <Title order={5}>Tasa BCV hoy: {bcvPrecio}</Title>}
                            <Title order={4}>Horas trabajadas esta semana: {horasEstaSemana} horas</Title>
                            <Title order={4}>Horas extra esta semana: {horasExtraEstaSemana} horas</Title>
                            {rol.includes("Presidente") || rol.includes("admin") &&
                                <>
                                    <Title order={6}>Sueldo del empleado por hora: {empleado.horario}$</Title>
                                    <Title order={3}>Calculo estimado esta semana: {((horasEstaSemana * empleado.horario) * bcvPrecio).toFixed(2)}Bs ({(horasEstaSemana * empleado.horario).toFixed(2)}$) </Title>
                                    <Title order={4}>Desglose:</Title>
                                    <Title order={5}>
                                        Sueldo por horas normales ({horasEstaSemana - horasExtraEstaSemana} horas): {((horasEstaSemana - horasExtraEstaSemana) * empleado.horario * bcvPrecio).toFixed(2)}Bs ({((horasEstaSemana - horasExtraEstaSemana) * empleado.horario).toFixed(2)}$)
                                    </Title>
                                    <Title order={5}>
                                        Sueldo por horas extra:  {(horasExtraEstaSemana * empleado.horario * bcvPrecio).toFixed(2)}Bs ({(horasExtraEstaSemana * empleado.horario).toFixed(2)})$
                                    </Title>
                                </>
                            }

                        </Stack>
                    </Grid.Col>
                </Grid>
            </Paper>
            <Paper shadow="sm" radius="md" p="md" mt="lg" withBorder>
                <Flex justify="space-between" align="center" mb="md">
                    <Title order={3} mb="md">
                        Horas trabajadas recientes
                    </Title>
                    <Button onClick={() => setModalCrearHora(true)}>Añadir horas en la base</Button>
                </Flex>
                {empleado.HorasTrabajadas?.length === 0 ? (
                    <Text c="dimmed">No hay registros de horas trabajadas en este período.</Text>
                ) : (
                    <ScrollArea>
                        <Paper>
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
                                    {empleado?.HorasTrabajadas?.map((h) => (
                                        <Table.Tr key={h.id}>
                                            <Table.Td>{h?.fecha.substring(0, 10).split("-").reverse().join("-")}</Table.Td>
                                            <Table.Td>{h.horas}</Table.Td>
                                            <Table.Td>{h.origen === "odt" ? <Link href={`/superuser/odt/${h.odtId}`}>{h.observaciones.match(/ODT\s+#(\d+)/)[0]}</Link> : h.origen}</Table.Td>
                                            <Table.Td style={{ whiteSpace: 'normal' }}>{h.observaciones}</Table.Td>
                                        </Table.Tr>
                                    ))}
                                </Table.Tbody>
                            </Table>
                        </Paper>
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
            <ModalCuentaBancaria
                opened={modalCuenta}
                onClose={() => setModalCuenta(false)}
                tipoEntidad="empleado"
                entidadId={id}
                onCreated={() => {
                    // Recargar la página para ver las nuevas horas
                    router.refresh();
                }}
            />

        </Container >
    )
}