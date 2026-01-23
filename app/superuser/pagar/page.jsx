"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
    Paper, Title, Text, Group, Button, Loader, Table,
    Badge, ScrollArea, Card, Avatar, Stack, Grid, ActionIcon,
    Tooltip, Center, Divider, Container, ThemeIcon,
    UnstyledButton, Box, SimpleGrid
} from "@mantine/core";
import {
    IconCurrencyDollar, IconCheck, IconCalendarTime,
    IconAlertCircle, IconClock
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useRouter } from "next/navigation";
import { useMediaQuery } from "@mantine/hooks"; // Importante para responsive
import { actualizarSueldos } from "@/app/helpers/calcularSueldo";
import { getRangoPago } from "@/app/helpers/getRangoPago";
import ModalConfirmarPago from "./components/ModalConfirmarPago";

export default function PagosPage() {
    const router = useRouter();
    const isMobile = useMediaQuery('(max-width: 768px)');

    // Estados de datos
    const [empleados, setEmpleados] = useState([]);
    const [tasas, setTasas] = useState({ bcv: 0, eur: 0, usdt: 0 });
    const [loading, setLoading] = useState(true);

    const [modalPagoOpen, setModalPagoOpen] = useState(false);
    const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState(null);

    // Estado para controlar a quién ya se le dio click en "Pagar" visualmente
    const [pagados, setPagados] = useState({});

    // Fechas del corte
    const rango = useMemo(() => getRangoPago(), []);

    // --- CARGAR DATOS ---
    useEffect(() => {
        async function fetchData() {
            try {
                // Usamos tu endpoint corregido
                const [resEmpleados, resBcv] = await Promise.all([
                    fetch("/api/rrhh/empleados?include=horasTrabajadas&where=estado:Activo").then(r => r.json()),
                    fetch("/api/bcv").then(r => r.json())
                ]);

                setTasas({
                    bcv: resBcv.precio,
                    eur: resBcv.eur,
                    usdt: resBcv.usdt
                });

                // Si tu API ya filtra por activo en el backend, usamos la respuesta directa
                const listaEmpleados = Array.isArray(resEmpleados) ? resEmpleados : resEmpleados.data || [];
                setEmpleados(listaEmpleados);

            } catch (error) {
                console.error(error);
                notifications.show({ title: "Error", message: "No se pudo cargar la nómina", color: "red" });
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);


    // --- LÓGICA DE CÁLCULO DE NÓMINA (DESGLOSADA) ---
    const nominaCalculada = useMemo(() => {
        if (!empleados.length) return [];

        return empleados.map(emp => {
            const tasaCambio = emp.tasaSueldo === "euro" ? tasas.eur
                : emp.tasaSueldo === "usdt" ? tasas.usdt
                    : tasas.bcv;

            const valoresSueldo = actualizarSueldos("mensual", emp.sueldo);

            // Filtrar horas del rango
            const horasRango = emp.HorasTrabajadas?.filter(h => {
                const fechaHora = new Date(h.fecha);
                return fechaHora >= rango.inicio && fechaHora <= rango.fin;
            }) || [];

            // Calcular Horas
            const totalHoras = horasRango.reduce((acc, curr) => acc + curr.horas, 0);

            // Lógica de extras (excedente de 8h diarias)
            const horasExtra = horasRango.reduce((acc, curr) => {
                return curr.horas > 8 ? acc + (curr.horas - 8) : acc;
            }, 0);

            const horasNormales = totalHoras - horasExtra;

            // Calcular Montos USD
            // Nota: Aquí asumo que la hora extra se paga al mismo precio base. 
            // Si pagan 1.5x, cambia a: (horasExtra * valoresSueldo.horario * 1.5)
            const pagoNormalUsd = horasNormales * valoresSueldo.horario;
            const pagoExtraUsd = horasExtra * valoresSueldo.horario;
            const totalPagarUsd = pagoNormalUsd + pagoExtraUsd;

            // Calcular Montos BS
            const pagoNormalBs = pagoNormalUsd * tasaCambio;
            const pagoExtraBs = pagoExtraUsd * tasaCambio;
            const totalPagarBs = totalPagarUsd * tasaCambio;

            return {
                ...emp,
                calculos: {
                    horasNormales,
                    horasExtra,
                    totalHoras,
                    pagoNormalUsd,
                    pagoExtraUsd,
                    totalPagarUsd,
                    pagoNormalBs,
                    pagoExtraBs,
                    totalPagarBs,
                    tasaUtilizada: tasaCambio,
                    moneda: emp.tasaSueldo || 'bcv'
                }
            };
        });
    }, [empleados, tasas, rango]);

    // --- TOTALES GLOBALES ---
    const totalNominaBs = nominaCalculada.reduce((acc, curr) => acc + curr.calculos.totalPagarBs, 0);
    const totalNominaUsd = nominaCalculada.reduce((acc, curr) => acc + curr.calculos.totalPagarUsd, 0);

    const handlePagar = async (emp) => {
        setEmpleadoSeleccionado(emp);
        setModalPagoOpen(true);
    };

    // Callback cuando el modal termina con éxito
    const onPagoSuccess = (empleadoId) => {
        // Marcamos visualmente como pagado
        setPagados(prev => ({ ...prev, [empleadoId]: true }));
        // Opcional: Recargar data para actualizar el backend
        // fetchData(); 
    };

    if (loading) return (
        <Center h="80vh"><Stack align="center"><Loader /><Text>Calculando nómina...</Text></Stack></Center>
    );

    // --- COMPONENTE: CARD MÓVIL ---
    const MobilePaymentCard = ({ emp }) => {
        const yaPagado = pagados[emp.id];
        const tieneHoras = emp.calculos.totalHoras > 0;
        const c = emp.calculos;

        return (
            <Card withBorder radius="md" mb="md" style={{ opacity: yaPagado ? 0.6 : 1 }}>
                <Group justify="space-between" mb="xs">
                    <Group gap="sm">
                        <Avatar src={emp.imagen ? `${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/${emp.imagen}` : null} radius="xl" />
                        <div>
                            <Text fw={700} size="sm" lineClamp={1}>{emp.nombre} {emp.apellido}</Text>
                            <Badge variant="dot" size="xs" color={c.moneda === 'bcv' ? 'blue' : 'yellow'}>
                                Tasa: {c.moneda.toUpperCase()}
                            </Badge>
                        </div>
                    </Group>
                    {yaPagado ? (
                        <Badge color="green" variant="filled">Pagado</Badge>
                    ) : (
                        <Button size="xs" color="blue" disabled={!tieneHoras} onClick={() => handlePagar(emp)}>
                            Pagar
                        </Button>
                    )}
                </Group>

                <Divider my="sm" />

                {tieneHoras ? (
                    <Stack gap="xs">
                        {/* Fila de Encabezados */}
                        <SimpleGrid cols={3} spacing="xs">
                            <Text size="xs" c="dimmed" ta="center">Concepto</Text>
                            <Text size="xs" c="dimmed" ta="center">Horas</Text>
                            <Text size="xs" c="dimmed" ta="right">USD</Text>
                        </SimpleGrid>

                        {/* Normales */}
                        <SimpleGrid cols={3} spacing="xs">
                            <Text size="sm">Normal</Text>
                            <Badge variant="outline" color="gray" fullWidth>{c.horasNormales}h</Badge>
                            <Text size="sm" ta="right">${c.pagoNormalUsd.toFixed(2)}</Text>
                        </SimpleGrid>

                        {/* Extras */}
                        {c.horasExtra > 0 && (
                            <SimpleGrid cols={3} spacing="xs">
                                <Text size="sm" c="orange">Extra</Text>
                                <Badge variant="filled" color="orange" fullWidth>+{c.horasExtra}h</Badge>
                                <Text size="sm" ta="right" c="orange">${c.pagoExtraUsd.toFixed(2)}</Text>
                            </SimpleGrid>
                        )}

                        <Divider variant="dashed" />

                        {/* Total */}
                        <Group justify="space-between" bg="gray.0" p="xs" style={{ borderRadius: 8 }}>
                            <Group gap={5}>
                                <Text size="sm" fw={700}>Total a Pagar</Text>
                                <Badge color="green" size="sm">USD {c.totalPagarUsd.toFixed(2)}</Badge>
                            </Group>
                            <Text size="lg" fw={900} c="blue">Bs. {c.totalPagarBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</Text>
                        </Group>
                    </Stack>
                ) : (
                    <Text c="dimmed" fs="italic" ta="center" size="sm">Sin horas registradas esta semana</Text>
                )}
            </Card>
        );
    };

    return (
        <Container size="xl" p="md">
            {/* CABECERA (IGUAL QUE ANTES) */}
            <Stack mb="xl">
                <Group justify="space-between">
                    <div>
                        <Title order={2}>Gestión de Pagos</Title>
                        <Text c="dimmed" size="sm">{rango.inicioStr} - {rango.finStr}</Text>
                    </div>
                </Group>

                <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                    <Paper withBorder p="md" radius="md">
                        <Text size="xs" c="dimmed" fw={700} tt="uppercase">Total Nómina (Bs)</Text>
                        <Text size="xl" fw={900} c="blue">Bs. {totalNominaBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</Text>
                    </Paper>
                    <Paper withBorder p="md" radius="md">
                        <Text size="xs" c="dimmed" fw={700} tt="uppercase">Total Nómina (USD)</Text>
                        <Text size="xl" fw={900} c="green">${totalNominaUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
                    </Paper>
                    <Paper withBorder p="md" radius="md">
                        <Text size="xs" c="dimmed" fw={700} tt="uppercase">Tasa Referencia</Text>
                        <Text size="xl" fw={900}>Bs. {tasas.bcv}</Text>
                    </Paper>
                </SimpleGrid>
            </Stack>

            {/* CONTENIDO PRINCIPAL */}
            {isMobile ? (
                // --- VISTA MÓVIL (TARJETAS) ---
                <Box>
                    {nominaCalculada.map(emp => (
                        <MobilePaymentCard key={emp.id} emp={emp} />
                    ))}
                    {nominaCalculada.length === 0 && <Text ta="center" c="dimmed">No hay empleados</Text>}
                </Box>
            ) : (
                // --- VISTA DESKTOP (TABLA DESGLOSADA) ---
                <Paper withBorder shadow="sm" radius="md" overflow="hidden">
                    <ScrollArea>
                        <Table striped highlightOnHover verticalSpacing="sm" withTableBorder>
                            <Table.Thead bg="gray.1">
                                <Table.Tr>
                                    <Table.Th rowSpan={2}>Empleado</Table.Th>
                                    <Table.Th colSpan={3} style={{ textAlign: 'center', borderBottom: '1px solid #dee2e6' }}>Desglose de Horas</Table.Th>
                                    <Table.Th colSpan={3} style={{ textAlign: 'center', borderBottom: '1px solid #dee2e6' }}>Desglose Pago (USD)</Table.Th>
                                    <Table.Th rowSpan={2} style={{ textAlign: 'right' }}>Total Bs</Table.Th>
                                    <Table.Th rowSpan={2} style={{ textAlign: 'center' }}>Acción</Table.Th>
                                </Table.Tr>
                                <Table.Tr>
                                    {/* Subcolumnas Horas */}
                                    <Table.Th style={{ textAlign: 'center', fontSize: 11, color: 'gray' }}>Normal</Table.Th>
                                    <Table.Th style={{ textAlign: 'center', fontSize: 11, color: 'orange' }}>Extra</Table.Th>
                                    <Table.Th style={{ textAlign: 'center', fontSize: 11, fontWeight: 700 }}>Total</Table.Th>

                                    {/* Subcolumnas USD */}
                                    <Table.Th style={{ textAlign: 'right', fontSize: 11, color: 'gray' }}>Normal</Table.Th>
                                    <Table.Th style={{ textAlign: 'right', fontSize: 11, color: 'orange' }}>Extra</Table.Th>
                                    <Table.Th style={{ textAlign: 'right', fontSize: 11, fontWeight: 700 }}>Total $</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {nominaCalculada.map((emp) => {
                                    const yaPagado = pagados[emp.id];
                                    const tieneHoras = emp.calculos.totalHoras > 0;
                                    const c = emp.calculos;

                                    return (
                                        <Table.Tr key={emp.id} style={{ opacity: yaPagado ? 0.5 : 1 }}>
                                            <Table.Td>
                                                <Group gap="sm">
                                                    <Avatar src={emp.imagen ? `${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/${emp.imagen}` : null} radius="xl" size="sm" />
                                                    <div>
                                                        <Text size="sm" fw={500}>{emp.nombre} {emp.apellido}</Text>
                                                        <Badge size="xs" variant="dot" color={c.moneda === 'bcv' ? 'blue' : 'yellow'}>
                                                            {c.moneda.toUpperCase()}
                                                        </Badge>
                                                    </div>
                                                </Group>
                                            </Table.Td>

                                            {/* Desglose Horas */}
                                            <Table.Td align="center"><Text size="sm">{c.horasNormales}</Text></Table.Td>
                                            <Table.Td align="center"><Text size="sm" c="orange">{c.horasExtra > 0 ? c.horasExtra : '-'}</Text></Table.Td>
                                            <Table.Td align="center"><Badge variant="light" color="gray" size="sm">{c.totalHoras}</Badge></Table.Td>

                                            {/* Desglose USD */}
                                            <Table.Td align="right"><Text size="sm">${c.pagoNormalUsd.toFixed(2)}</Text></Table.Td>
                                            <Table.Td align="right"><Text size="sm" c="orange">{c.horasExtra > 0 ? `$${c.pagoExtraUsd.toFixed(2)}` : '-'}</Text></Table.Td>
                                            <Table.Td align="right"><Text size="sm" fw={700} c="green">${c.totalPagarUsd.toFixed(2)}</Text></Table.Td>

                                            {/* Total BS */}
                                            <Table.Td align="right">
                                                <Text fw={700} size="sm">Bs. {c.totalPagarBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</Text>
                                            </Table.Td>

                                            <Table.Td align="center">
                                                {yaPagado ? (
                                                    <Button leftSection={<IconCheck size={14} />} color="green" variant="light" size="compact-xs" disabled>
                                                        Pagado
                                                    </Button>
                                                ) : (
                                                    <Button size="compact-xs" color="blue" disabled={!tieneHoras} onClick={() => handlePagar(emp)}>
                                                        Pagar
                                                    </Button>
                                                )}
                                            </Table.Td>
                                        </Table.Tr>
                                    );
                                })}
                            </Table.Tbody>
                        </Table>
                    </ScrollArea>
                </Paper>
            )}
            {/* AGREGAR EL MODAL AL FINAL DEL RETURN */}
            {empleadoSeleccionado && (
                console.log('Renderizando ModalConfirmarPago para empleado:', empleadoSeleccionado),
                <ModalConfirmarPago
                    opened={modalPagoOpen}
                    onClose={() => {
                        setModalPagoOpen(false);
                        setEmpleadoSeleccionado(null);
                    }}
                    empleado={empleadoSeleccionado}
                    // Pasamos los montos calculados
                    totalPagar={empleadoSeleccionado.tasaSueldo === 'bcv' || empleadoSeleccionado.tasaSueldo === "euro"
                        ? empleadoSeleccionado.calculos.totalPagarBs
                        : empleadoSeleccionado.calculos.totalPagarUsd
                    }
                    moneda={empleadoSeleccionado.calculos.moneda}
                    onPagoSuccess={onPagoSuccess}
                />
            )}
        </Container>
    );
}