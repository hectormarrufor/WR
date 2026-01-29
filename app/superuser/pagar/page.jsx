"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
    Paper, Title, Text, Group, Button, Loader, Table,
    Badge, ScrollArea, Card, Avatar, Stack, ActionIcon,
    Center, Divider, Container, Box, SimpleGrid
} from "@mantine/core";
import {
    IconCheck, IconChevronLeft, IconChevronRight
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useRouter } from "next/navigation";
import { useMediaQuery } from "@mantine/hooks";
import { actualizarSueldos } from "@/app/helpers/calcularSueldo";
import ModalConfirmarPago from "./components/ModalConfirmarPago";

// --- HELPERS ---

// Normaliza fecha para comparar solo año-mes-día y evitar problemas de hora
const normalizeDate = (dateStr) => {
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    return d;
};

// Calcula rango Viernes - Jueves
const getRangoSemanal = (fechaBase) => {
    const fecha = new Date(fechaBase);
    const day = fecha.getDay(); 
    // (day + 2) % 7 -> Truco matemático para calcular offset al Viernes anterior
    const diffToFriday = (day + 2) % 7;
    
    const inicio = new Date(fecha);
    inicio.setDate(fecha.getDate() - diffToFriday);
    inicio.setHours(0, 0, 0, 0); // Viernes 00:00:00

    const fin = new Date(inicio);
    fin.setDate(inicio.getDate() + 6); // Jueves siguiente
    fin.setHours(23, 59, 59, 999); // Jueves 23:59:59

    return { inicio, fin };
};

export default function PagosPage() {
    const router = useRouter();
    const isMobile = useMediaQuery('(max-width: 768px)');
    const [fechaReferencia, setFechaReferencia] = useState(new Date());

    const [empleados, setEmpleados] = useState([]);
    const [tasas, setTasas] = useState({ bcv: 0, eur: 0, usdt: 0 });
    const [loading, setLoading] = useState(true);
    const [modalPagoOpen, setModalPagoOpen] = useState(false);
    const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState(null);

    const rango = useMemo(() => {
        const r = getRangoSemanal(fechaReferencia);
        return {
            inicio: r.inicio,
            fin: r.fin,
            inicioStr: r.inicio.toLocaleDateString('es-VE'),
            finStr: r.fin.toLocaleDateString('es-VE')
        };
    }, [fechaReferencia]);

    const fetchData = async () => {
        setLoading(true);
        try {
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
            console.log("Datos cargados:", listaEmpleados);
            setEmpleados(listaEmpleados.sort((a, b) => b.HorasTrabajadas.length - a.HorasTrabajadas.length));

        } catch (error) {
            console.error(error);
            notifications.show({ title: "Error", message: "Error cargando datos", color: "red" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const irSemanaAnterior = () => {
        const nuevaFecha = new Date(fechaReferencia);
        nuevaFecha.setDate(nuevaFecha.getDate() - 7);
        setFechaReferencia(nuevaFecha);
    };

    const irSemanaSiguiente = () => {
        const nuevaFecha = new Date(fechaReferencia);
        nuevaFecha.setDate(nuevaFecha.getDate() + 7);
        setFechaReferencia(nuevaFecha);
    };

    const irSemanaActual = () => {
        setFechaReferencia(new Date());
    };

    // --- CÁLCULO DE NÓMINA ---
    const nominaCalculada = useMemo(() => {
        if (!empleados.length) return [];

        return empleados.map(emp => {
            const tasaCambio = emp.tasaSueldo === "euro" ? tasas.eur
                : emp.tasaSueldo === "usdt" ? tasas.usdt
                    : tasas.bcv;

            const valoresSueldo = actualizarSueldos("mensual", emp.sueldo);

            // 1. Filtrar horas (CORREGIDO PARA INCLUIR VIERNES)
            const horasRango = emp.HorasTrabajadas?.filter(h => {
                // Truco: Si viene solo fecha "2025-01-23", le agregamos hora mediodía "T12:00:00"
                // Esto fuerza a que caiga en el día correcto sin importar el timezone UTC-4
                const fechaString = typeof h.fecha === 'string' && h.fecha.length === 10 
                    ? h.fecha + 'T12:00:00' 
                    : h.fecha;
                
                const fechaHora = new Date(fechaString);
                
                return fechaHora >= rango.inicio && fechaHora <= rango.fin;
            }) || [];

            // 2. VALIDACIÓN DE PAGO (Regla: Pago debe ser posterior al Jueves de cierre)
            const pagoSemana = emp.pagos?.find(g => {
                if (g.tipoOrigen !== 'Nomina') return false;
                
                const fechaPago = normalizeDate(g.fechaGasto);
                const fechaCierreSemana = normalizeDate(rango.fin); 
                
                // Diferencia en días entre el pago y el Jueves de cierre
                const diffTime = fechaPago - fechaCierreSemana;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

                // Aceptamos pagos desde el día siguiente al cierre (Viernes) hasta 8 días después
                return diffDays >= 1 && diffDays <= 8; 
            });

            const yaPagado = !!pagoSemana;

            // Cálculos
            const totalHoras = horasRango.reduce((acc, curr) => acc + curr.horas, 0);
            const horasExtra = horasRango.reduce((acc, curr) => {
                return curr.horas > 8 ? acc + (curr.horas - 8) : acc;
            }, 0);
            const horasNormales = emp.id === 6 || emp.id === 3 ? totalHoras - horasExtra + 16 : totalHoras - horasExtra;

            const pagoNormalUsd = horasNormales * valoresSueldo.horario;
            const pagoExtraUsd = horasExtra * valoresSueldo.horario;
            const totalPagarUsd = pagoNormalUsd + pagoExtraUsd;

            const pagoNormalBs = pagoNormalUsd * tasaCambio;
            const pagoExtraBs = pagoExtraUsd * tasaCambio;
            const totalPagarBs = totalPagarUsd * tasaCambio;

            return {
                ...emp,
                yaPagado,
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

    // Totales
    const totalNominaBs = nominaCalculada.reduce((acc, curr) => !curr.yaPagado ? acc + curr.calculos.totalPagarBs : acc, 0);
    const totalNominaUsd = nominaCalculada.reduce((acc, curr) => !curr.yaPagado ? acc + curr.calculos.totalPagarUsd : acc, 0);

    const handlePagar = async (emp) => {
        setEmpleadoSeleccionado(emp);
        setModalPagoOpen(true);
    };

    const onPagoSuccess = () => {
        fetchData();
    };

    if (loading && empleados.length === 0) return (
        <Center h="80vh"><Stack align="center"><Loader /><Text>Cargando nómina...</Text></Stack></Center>
    );

    // Renderizados (Iguales que antes)
    const MobilePaymentCard = ({ emp }) => {
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
                            <Badge variant="dot" size="xs" color={c.moneda === 'bcv' ? 'blue' : 'yellow'}>{c.moneda.toUpperCase()}</Badge>
                        </div>
                    </Group>
                    {yaPagado ? (
                        <Badge color="green" variant="filled" size="lg" leftSection={<IconCheck size={12} />}>Pagado</Badge>
                    ) : (
                        <Button size="xs" color="blue" disabled={!tieneHoras} onClick={() => handlePagar(emp)}>Pagar</Button>
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
                    <Text c="dimmed" fs="italic" ta="center" size="sm">Sin horas registradas</Text>
                )}
            </Card>
        );
    };

    return (
        <Container size="xl" p="md">
            <Stack mb="xl">
                <Group justify="space-between" align="center">
                    <div>
                        <Title order={2}>Gestión de Pagos</Title>
                        <Group gap="xs" mt={5}>
                            <ActionIcon variant="default" onClick={irSemanaAnterior}><IconChevronLeft size={16} /></ActionIcon>
                            <Text fw={600} size="lg">{rango.inicioStr} - {rango.finStr}</Text>
                            <ActionIcon variant="default" onClick={irSemanaSiguiente}><IconChevronRight size={16} /></ActionIcon>
                            <Button variant="subtle" size="xs" onClick={irSemanaActual}>Hoy</Button>
                        </Group>
                    </div>
                    <Button variant="light" onClick={fetchData} loading={loading}>Actualizar</Button>
                </Group>

                <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                    <Paper withBorder p="md" radius="md">
                        <Text size="xs" c="dimmed" fw={700} tt="uppercase">Pendiente (Bs)</Text>
                        <Text size="xl" fw={900} c="blue">Bs. {totalNominaBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</Text>
                    </Paper>
                    <Paper withBorder p="md" radius="md">
                        <Text size="xs" c="dimmed" fw={700} tt="uppercase">Pendiente (USD)</Text>
                        <Text size="xl" fw={900} c="green">${totalNominaUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
                    </Paper>
                     <Paper withBorder p="md" radius="md">
                        <Text size="xs" c="dimmed" fw={700} tt="uppercase">Tasas Ref</Text>
                        <Group justify="space-between">
                             <Text size="xs" fw={700}>BCV: {tasas.bcv}</Text>
                             <Text size="xs" fw={700}>EUR: {tasas.eur}</Text>
                        </Group>
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
                                    <Table.Th colSpan={3} style={{ textAlign: 'center', borderBottom: '1px solid #dee2e6' }}>Horas</Table.Th>
                                    <Table.Th colSpan={3} style={{ textAlign: 'center', borderBottom: '1px solid #dee2e6' }}>Pago (USD)</Table.Th>
                                    <Table.Th rowSpan={2} style={{ textAlign: 'right' }}>Total Bs</Table.Th>
                                    <Table.Th rowSpan={2} style={{ textAlign: 'center' }}>Acción</Table.Th>
                                </Table.Tr>
                                <Table.Tr>
                                    <Table.Th style={{ textAlign: 'center', fontSize: 11 }}>Normal</Table.Th>
                                    <Table.Th style={{ textAlign: 'center', fontSize: 11 }}>Extra</Table.Th>
                                    <Table.Th style={{ textAlign: 'center', fontSize: 11, fontWeight: 700 }}>Total</Table.Th>
                                    <Table.Th style={{ textAlign: 'right', fontSize: 11 }}>Normal</Table.Th>
                                    <Table.Th style={{ textAlign: 'right', fontSize: 11 }}>Extra</Table.Th>
                                    <Table.Th style={{ textAlign: 'right', fontSize: 11, fontWeight: 700 }}>Total</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {nominaCalculada.map((emp) => {
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
                                                        <Badge size="xs" variant="dot" color={c.moneda === 'bcv' ? 'blue' : 'yellow'}>{c.moneda.toUpperCase()}</Badge>
                                                    </div>
                                                </Group>
                                            </Table.Td>
                                            <Table.Td align="center"><Text size="sm">{c.horasNormales}</Text></Table.Td>
                                            <Table.Td align="center"><Text size="sm" c="orange">{c.horasExtra > 0 ? c.horasExtra : '-'}</Text></Table.Td>
                                            <Table.Td align="center"><Badge variant="light" color="gray" size="sm">{c.totalHoras}</Badge></Table.Td>
                                            <Table.Td align="right"><Text size="sm">${c.pagoNormalUsd.toFixed(2)}</Text></Table.Td>
                                            <Table.Td align="right"><Text size="sm" c="orange">{c.horasExtra > 0 ? `$${c.pagoExtraUsd.toFixed(2)}` : '-'}</Text></Table.Td>
                                            <Table.Td align="right"><Text size="sm" fw={700} c="green">${c.totalPagarUsd.toFixed(2)}</Text></Table.Td>
                                            <Table.Td align="right"><Text fw={700} size="sm">Bs. {c.totalPagarBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</Text></Table.Td>
                                            <Table.Td align="center">
                                                {yaPagado ? (
                                                    <Badge color="green" variant="filled" size="lg" leftSection={<IconCheck size={12} />}>Pagado</Badge>
                                                ) : (
                                                    <Button size="compact-xs" color="blue" disabled={!tieneHoras} onClick={() => handlePagar(emp)}>Pagar</Button>
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
                    onClose={() => { setModalPagoOpen(false); setEmpleadoSeleccionado(null); }}
                    empleado={empleadoSeleccionado}
                    totalPagar={empleadoSeleccionado.tasaSueldo === 'bcv' || empleadoSeleccionado.tasaSueldo === "euro" ? empleadoSeleccionado.calculos.totalPagarBs : empleadoSeleccionado.calculos.totalPagarUsd}
                    moneda={empleadoSeleccionado.calculos.moneda}
                    onPagoSuccess={onPagoSuccess}
                />
            )}
        </Container>
    );
}