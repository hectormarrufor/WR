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
import { useMediaQuery } from "@mantine/hooks"; 
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

    // Fechas del corte
    const rango = useMemo(() => getRangoPago(), []);

    // --- CARGAR DATOS ---
    const fetchData = async () => {
        setLoading(true);
        try {
            // AJUSTE AQUÍ: Incluimos 'pagos' para saber si ya se pagó
            // Nota: Ajusté 'pagosmoviles' a 'pagosMoviles' (camelCase es estándar en Sequelize, revisa tu alias)
            const [resEmpleados, resBcv] = await Promise.all([
                fetch("/api/rrhh/empleados?include=horasTrabajadas,cuentasBancarias,pagosMoviles,pagos&where=estado:Activo").then(r => r.json()),
                fetch("/api/bcv").then(r => r.json())
            ]);

            setTasas({
                bcv: resBcv.precio,
                eur: resBcv.eur,
                usdt: resBcv.usdt
            });

            const listaEmpleados = Array.isArray(resEmpleados) ? resEmpleados : resEmpleados.data || [];
            console.log("Empleados cargados para nómina:", listaEmpleados);
            setEmpleados(listaEmpleados.sort((a, b) => b.HorasTrabajadas.length - a.HorasTrabajadas.length));

        } catch (error) {
            console.error(error);
            notifications.show({ title: "Error", message: "No se pudo cargar la nómina", color: "red" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);


    // --- LÓGICA DE CÁLCULO DE NÓMINA ---
    const nominaCalculada = useMemo(() => {
        if (!empleados.length) return [];

        console.log("Calculando nómina para empleados:", empleados);

        return empleados.map(emp => {
            const tasaCambio = emp.tasaSueldo === "euro" ? tasas.eur
                : emp.tasaSueldo === "usdt" ? tasas.usdt
                    : tasas.bcv;

            const valoresSueldo = actualizarSueldos("mensual", emp.sueldo);

            // 1. Filtrar horas del rango
            const horasRango = emp.HorasTrabajadas?.filter(h => {
                const fechaHora = new Date(h.fecha);
                return fechaHora >= rango.inicio && fechaHora <= rango.fin;
            }) || [];

            // 2. VERIFICAR SI YA ESTÁ PAGADO
            // Buscamos en los pagos del empleado si hay alguno de tipo 'Nomina' 
            // cuya fecha coincida dentro del rango de pago actual (o el día de pago usual)
            // Esto asume que el gasto se registra con la fecha del momento del pago.
            const pagoSemana = emp.pagos?.find(g => {
                if (g.tipoOrigen !== 'Nomina') return false;
                const fechaGasto = new Date(g.fechaGasto);
                // Si el gasto se hizo después del inicio del corte y antes de hoy+futuro
                // O simplificado: si existe un gasto de nómina creado en los últimos 7 días
                // Para mayor precisión, podrías guardar el rango en el gasto, pero por fecha funciona bien:
                return fechaGasto >= rango.inicio; 
            });

            const yaPagado = !!pagoSemana; // Convertir a booleano

            // Calcular Horas
            const totalHoras = horasRango.reduce((acc, curr) => acc + curr.horas, 0);
            const horasExtra = horasRango.reduce((acc, curr) => {
                return curr.horas > 8 ? acc + (curr.horas - 8) : acc;
            }, 0);
            const horasNormales = emp.id === 6 || emp.id === 3 ? totalHoras - horasExtra + 16 : totalHoras - horasExtra; // Ajuste especial para IDs 6 y 3
            

            // Calcular Montos
            const pagoNormalUsd = horasNormales * valoresSueldo.horario;
            const pagoExtraUsd = horasExtra * valoresSueldo.horario;
            const totalPagarUsd = pagoNormalUsd + pagoExtraUsd;

            const pagoNormalBs = pagoNormalUsd * tasaCambio;
            const pagoExtraBs = pagoExtraUsd * tasaCambio;
            const totalPagarBs = totalPagarUsd * tasaCambio;

            return {
                ...emp,
                yaPagado, // <--- Nueva propiedad clave
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
        // En lugar de manipular el estado local 'pagados',
        // Recargamos los datos para que venga el GastoVariable actualizado del backend
        fetchData(); 
    };

    if (loading && empleados.length === 0) return (
        <Center h="80vh"><Stack align="center"><Loader /><Text>Calculando nómina...</Text></Stack></Center>
    );

    // --- COMPONENTE: CARD MÓVIL ---
    const MobilePaymentCard = ({ emp }) => {
        // Usamos la propiedad calculada
        const yaPagado = emp.yaPagado; 
        const tieneHoras = emp.calculos.totalHoras > 0;
        const c = emp.calculos;

        return (
            <Card withBorder radius="md" mb="md" style={{ opacity: yaPagado ? 0.7 : 1, backgroundColor: yaPagado ? '#f8f9fa' : 'white' }}>
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
                        <Badge color="green" variant="filled" size="lg" leftSection={<IconCheck size={12}/>}>Pagado</Badge>
                    ) : (
                        <Button size="xs" color="blue" disabled={!tieneHoras} onClick={() => handlePagar(emp)}>
                            Pagar
                        </Button>
                    )}
                </Group>

                <Divider my="sm" />

                {tieneHoras ? (
                    <Stack gap="xs">
                         <SimpleGrid cols={3} spacing="xs">
                            <Text size="xs" c="dimmed" ta="center">Concepto</Text>
                            <Text size="xs" c="dimmed" ta="center">Horas</Text>
                            <Text size="xs" c="dimmed" ta="right">USD</Text>
                        </SimpleGrid>
                        <SimpleGrid cols={3} spacing="xs">
                            <Text size="sm">Normal</Text>
                            <Badge variant="outline" color="gray" fullWidth>{c.horasNormales}h</Badge>
                            <Text size="sm" ta="right">${c.pagoNormalUsd.toFixed(2)}</Text>
                        </SimpleGrid>
                        {c.horasExtra > 0 && (
                            <SimpleGrid cols={3} spacing="xs">
                                <Text size="sm" c="orange">Extra</Text>
                                <Badge variant="filled" color="orange" fullWidth>+{c.horasExtra}h</Badge>
                                <Text size="sm" ta="right" c="orange">${c.pagoExtraUsd.toFixed(2)}</Text>
                            </SimpleGrid>
                        )}
                        <Divider variant="dashed" />
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
            <Stack mb="xl">
                <Group justify="space-between">
                    <div>
                        <Title order={2}>Gestión de Pagos</Title>
                        <Text c="dimmed" size="sm">{rango.inicioStr} - {rango.finStr}</Text>
                    </div>
                     <Button variant="light" onClick={fetchData} loading={loading}>Actualizar</Button>
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
                        <Text size="sm" fw={900}>Bs. {tasas.bcv} / USD</Text>
                        <Text size="sm" fw={900}>Bs. {tasas.eur} / EUR</Text>
                        <Text size="sm" fw={900}>Bs. {tasas.usdt} / USDT</Text>
                    </Paper>
                </SimpleGrid>
            </Stack>

            {isMobile ? (
                <Box>
                    {nominaCalculada.map(emp => (
                        <MobilePaymentCard key={emp.id} emp={emp} />
                    ))}
                    {nominaCalculada.length === 0 && <Text ta="center" c="dimmed">No hay empleados</Text>}
                </Box>
            ) : (
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
                                    <Table.Th style={{ textAlign: 'center', fontSize: 11, color: 'gray' }}>Normal</Table.Th>
                                    <Table.Th style={{ textAlign: 'center', fontSize: 11, color: 'orange' }}>Extra</Table.Th>
                                    <Table.Th style={{ textAlign: 'center', fontSize: 11, fontWeight: 700 }}>Total</Table.Th>
                                    <Table.Th style={{ textAlign: 'right', fontSize: 11, color: 'gray' }}>Normal</Table.Th>
                                    <Table.Th style={{ textAlign: 'right', fontSize: 11, color: 'orange' }}>Extra</Table.Th>
                                    <Table.Th style={{ textAlign: 'right', fontSize: 11, fontWeight: 700 }}>Total $</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {nominaCalculada.map((emp) => {
                                    // USAMOS LA PROPIEDAD CALCULADA
                                    const yaPagado = emp.yaPagado;
                                    const tieneHoras = emp.calculos.totalHoras > 0;
                                    const c = emp.calculos;

                                    return (
                                        <Table.Tr key={emp.id} style={{ opacity: yaPagado ? 0.6 : 1, backgroundColor: yaPagado ? '#f8f9fa' : undefined }}>
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

                                            <Table.Td align="center"><Text size="sm">{c.horasNormales}</Text></Table.Td>
                                            <Table.Td align="center"><Text size="sm" c="orange">{c.horasExtra > 0 ? c.horasExtra : '-'}</Text></Table.Td>
                                            <Table.Td align="center"><Badge variant="light" color="gray" size="sm">{c.totalHoras}</Badge></Table.Td>

                                            <Table.Td align="right"><Text size="sm">${c.pagoNormalUsd.toFixed(2)}</Text></Table.Td>
                                            <Table.Td align="right"><Text size="sm" c="orange">{c.horasExtra > 0 ? `$${c.pagoExtraUsd.toFixed(2)}` : '-'}</Text></Table.Td>
                                            <Table.Td align="right"><Text size="sm" fw={700} c="green">${c.totalPagarUsd.toFixed(2)}</Text></Table.Td>

                                            <Table.Td align="right">
                                                <Text fw={700} size="sm">Bs. {c.totalPagarBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</Text>
                                            </Table.Td>

                                            <Table.Td align="center">
                                                {yaPagado ? (
                                                     <Badge color="green" variant="filled" size="lg" leftSection={<IconCheck size={12}/>}>Pagado</Badge>
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

            {empleadoSeleccionado && (
                <ModalConfirmarPago
                    opened={modalPagoOpen}
                    onClose={() => {
                        setModalPagoOpen(false);
                        setEmpleadoSeleccionado(null);
                    }}
                    empleado={empleadoSeleccionado}
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