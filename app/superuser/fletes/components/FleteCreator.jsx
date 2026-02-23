"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
    TextInput, NumberInput, Button, Paper, Title, Center,
    SimpleGrid, Box, Divider, Grid, Text, Loader, Group, Badge, Select, Tooltip, Alert, Slider,
    Accordion,
    Table,
    Timeline
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { IconCalculator, IconCoin, IconTruck, IconRoute, IconInfoCircle, IconMapPin } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";

import GoogleRouteMap from "./GoogleRouteMap";
import ODTSelectableGrid from "../../odt/ODTSelectableGrid";
import { SelectClienteConCreacion } from "../../contratos/SelectClienteConCreacion";

export default function FleteCreator() {
    const router = useRouter();
    const { userId } = useAuth();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [empleados, setEmpleados] = useState([]);
    const [activos, setActivos] = useState([]);
    const [configPrecios, setConfigPrecios] = useState({ peaje: 1900, gasoil: 0.5 });
    const [bcv, setBcv] = useState(null);
    const [rutaData, setRutaData] = useState(null);

    const form = useForm({
        initialValues: {
            clienteId: "",
            fechaSalida: new Date(),
            nroFlete: "",
            choferId: null,
            ayudanteId: null,
            activoPrincipalId: null,
            remolqueId: null,
            origen: "Base DADICA - Tía Juana",
            destino: "Circuito Logístico",
            distanciaKm: 0,
            waypoints: [],
            tramos: [], // Arreglo de segmentos de ruta
            cantidadPeajes: 0,
            calidadRepuestos: 50,
            tipoCarga: "general",
        },
        validate: {
            clienteId: (val) => (val ? null : "Seleccione un cliente"),
            fechaSalida: (val) => (val ? null : "Fecha requerida"),
            choferId: (val) => (val ? null : "Debe asignar un chofer"),
            activoPrincipalId: (val) => (val ? null : "Debe asignar un vehículo principal"),
            distanciaKm: (val) => (val > 0 ? null : "Debe trazar una ruta en el mapa"),
        },
    });

    useEffect(() => {
        const cargarDatos = async () => {
            try {
                const [resEmp, resAct, resPrecios, resBcv] = await Promise.all([
                    fetch(`/api/rrhh/empleados`).then((r) => r.json()),
                    fetch(`/api/gestionMantenimiento/activos`).then((r) => r.json()),
                    fetch(`/api/configuracion/precios`).then((r) => r.json()),
                    fetch(`/api/bcv`).then((r) => r.json()),
                ]);

                setEmpleados(resEmp || []);
                setActivos(resAct.success ? resAct.data : []);
                setBcv(parseFloat(resBcv?.precio || 1));

                if (resPrecios) {
                    setConfigPrecios({
                        peaje: parseFloat(resPrecios.peaje5ejes || 1900),
                        gasoil: parseFloat(resPrecios.gasoil || 0.5),
                    });
                }
                setLoading(false);
            } catch (error) {
                notifications.show({ title: "Error", message: "No se pudieron cargar los datos", color: "red" });
                setLoading(false);
            }
        };
        cargarDatos();
    }, []);

    const activosMapeados = useMemo(() => {
        return activos.map((v) => {
            let nombreDisplay = v.codigoInterno;
            let placa = v.vehiculoInstancia?.placa || v.remolqueInstancia?.placa || "";
            return {
                id: v.id,
                nombre: `${nombreDisplay} (${placa})`,
                subtitulo: `Rendimiento BD: ${v.consumoCombustibleLPorKm || 0.35} L/Km`,
                imagen: v.imagen,
                tipo: v.tipoActivo,
            };
        });
    }, [activos]);

    const { data: estimacion, isLoading: calcLoading } = useQuery({
        queryKey: [
            "calcular-flete-puro",
            form.values.activoPrincipalId,
            form.values.remolqueId,
            rutaData?.distanciaTotal,
            JSON.stringify(form.values.tramos), // Detecta cambios en el slider de cualquier tramo
            form.values.cantidadPeajes,
            form.values.choferId,
            form.values.ayudanteId,
            form.values.calidadRepuestos
        ],
        queryFn: async () => {
            if (!form.values.activoPrincipalId || !rutaData?.distanciaTotal) return null;

            const choferObj = empleados.find(e => e.id === form.values.choferId);
            const ayudanteObj = empleados.find(e => e.id === form.values.ayudanteId);
            const sueldoChofer = parseFloat(choferObj?.sueldoBase || choferObj?.salarioMensual || 0);
            const sueldoAyudante = parseFloat(ayudanteObj?.sueldoBase || ayudanteObj?.salarioMensual || 0);

            // Calculamos un tonelaje promedio para enviarlo por si tu API antigua lo requiere como fallback
            const tonelajePromedio = form.values.tramos.length > 0
                ? form.values.tramos.reduce((acc, t) => acc + t.tonelaje, 0) / form.values.tramos.length
                : 0;

            const response = await fetch('/api/fletes/estimar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tipoCotizacion: 'flete',
                    activoPrincipalId: form.values.activoPrincipalId,
                    remolqueId: form.values.remolqueId,
                    distanciaKm: rutaData.distanciaTotal,
                    tonelaje: tonelajePromedio,
                    tramos: form.values.tramos, // El nuevo arreglo detallado
                    cantidadPeajes: form.values.cantidadPeajes,
                    precioPeajeBs: configPrecios.peaje,
                    bcv: bcv || 1,
                    precioGasoilUsd: configPrecios.gasoil,
                    sueldoChoferMensual: sueldoChofer,
                    sueldoAyudanteMensual: sueldoAyudante,
                    tieneAyudante: !!form.values.ayudanteId,
                    calidadRepuestos: form.values.calidadRepuestos,
                    porcentajeGanancia: 0.30,
                }),
            });

            if (!response.ok) throw new Error('Error calculando la estimación');
            return response.json();
        },
        enabled: !!form.values.activoPrincipalId && !!rutaData?.distanciaTotal,
    });

    const handleRouteCalculated = useCallback((data) => {
        setRutaData(data);
        form.setFieldValue("distanciaKm", parseFloat(data.distanciaTotal));
        form.setFieldValue("waypoints", data.waypoints);
        form.setFieldValue("destino", data.direccionDestino || "Circuito con varias paradas");
        form.setFieldValue("tramos", data.tramos || []);
    }, []);

    const handleSubmit = async (values) => {
        setSubmitting(true);
        try {
            const payload = {
                ...values,
                waypoints: JSON.stringify(values.waypoints),
                tramos: JSON.stringify(values.tramos),
                costoPeajesTotal: estimacion?.breakdown?.peajes || 0,
                montoFleteTotal: estimacion?.precioSugerido || 0,
                costoEstimado: estimacion?.costoTotal || 0,
                precioSugerido: estimacion?.precioSugerido || 0,
                breakdown: estimacion?.breakdown ? JSON.stringify(estimacion.breakdown) : null,
                creadoPor: userId,
            };

            const response = await fetch("/api/fletes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!response.ok) throw new Error("Error al guardar el flete");

            notifications.show({ title: "Éxito", message: "Flete programado", color: "green" });
            router.push("/superuser/fletes");
        } catch (error) {
            notifications.show({ title: "Error", message: error.message, color: "red" });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <Center h="80vh"><Loader size="xl" /></Center>;

    // Variables derivadas de la telemetría
    const capacidadMaxDynamic = estimacion?.breakdown?.auditoriaPesos?.capacidad?.valor || 40;
    const taraChutoCalc = estimacion?.breakdown?.auditoriaPesos?.chuto?.valor || 0;
    const taraRemolqueCalc = estimacion?.breakdown?.auditoriaPesos?.remolque?.valor || 0;
    const taraBase = taraChutoCalc + taraRemolqueCalc; // Puro Hierro

    return (
        <form onSubmit={form.onSubmit(handleSubmit)}>
            <Grid gutter="lg">
                <Grid.Col span={{ base: 12, md: 6 }}>
                    <SimpleGrid cols={1} spacing="md">
                        <SelectClienteConCreacion form={form} fieldName="clienteId" label="Cliente" />

                        <Group grow>
                            <DateInput label="Fecha de Salida" valueFormat="DD/MM/YYYY" {...form.getInputProps("fechaSalida")} />
                            <TextInput label="Nro Control Interno" placeholder="FL-XXXX (Opcional)" {...form.getInputProps("nroFlete")} />
                        </Group>

                        <Divider label="Recursos Humanos" labelPosition="center" />
                        <ODTSelectableGrid
                            label="Chofer Principal"
                            data={empleados.filter((e) => e.puestos?.some((p) => p.nombre.toLowerCase().includes("chofer"))).map((e) => ({ id: e.id, nombre: `${e.nombre} ${e.apellido}`, imagen: e.imagen }))}
                            onChange={(val) => form.setFieldValue("choferId", val)}
                            value={form.values.choferId}
                        />
                        <ODTSelectableGrid
                            label="Ayudante (Opcional)"
                            data={empleados.filter((e) => e.puestos?.some((p) => p.nombre.toLowerCase().includes("ayudante"))).map((e) => ({ id: e.id, nombre: `${e.nombre} ${e.apellido}`, imagen: e.imagen }))}
                            onChange={(val) => form.setFieldValue("ayudanteId", val)}
                            value={form.values.ayudanteId}
                        />

                        <Divider label="Equipos (Influye en Telemetría)" labelPosition="center" />
                        <ODTSelectableGrid
                            label="Vehículo Principal (Chuto/Camión)"
                            data={activosMapeados.filter((a) => a.tipo === "Vehiculo")}
                            onChange={(val) => form.setFieldValue("activoPrincipalId", val)}
                            value={form.values.activoPrincipalId}
                        />
                        <ODTSelectableGrid
                            label="Remolque / Batea"
                            data={activosMapeados.filter((a) => a.tipo === "Remolque")}
                            onChange={(val) => form.setFieldValue("remolqueId", val)}
                            value={form.values.remolqueId}
                        />

                        {/* PANEL DE TELEMETRÍA */}
                        {estimacion?.breakdown?.auditoriaPesos && (
                            <Paper withBorder p="sm" radius="md" mt="sm" bg="gray.0">
                                <Group mb="xs">
                                    <IconInfoCircle size={18} color="teal" />
                                    <Text size="sm" fw={700} c="dimmed">Ficha Técnica Detectada</Text>
                                </Group>
                                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
                                    <Group justify="space-between">
                                        <Text size="xs" fw={600}>Rendimiento:</Text>
                                        <Group gap={5}>
                                            <Text size="xs" fw={700}>{estimacion.breakdown.auditoriaPesos.rendimiento.vacio}V / {estimacion.breakdown.auditoriaPesos.rendimiento.lleno}LL</Text>
                                            <Badge color={estimacion.breakdown.auditoriaPesos.rendimiento.fuente.includes('Real') ? 'green' : 'blue'} variant="light" size="xs" style={{ textTransform: 'none' }}>
                                                {estimacion.breakdown.auditoriaPesos.rendimiento.fuente.split(' ')[0]}
                                            </Badge>
                                        </Group>
                                    </Group>

                                    <Group justify="space-between">
                                        <Text size="xs" fw={600}>Tara Total (Vacío):</Text>
                                        <Group gap={5}>
                                            <Text size="xs" fw={700} c="blue.9">{taraBase.toFixed(1)}t</Text>
                                            <Badge color="blue" variant="light" size="xs" style={{ textTransform: 'none' }}>Hierro</Badge>
                                        </Group>
                                    </Group>

                                    <Group justify="space-between">
                                        <Text size="xs" fw={600}>Max Arrastre:</Text>
                                        <Text size="xs" fw={700}>{capacidadMaxDynamic}t</Text>
                                    </Group>
                                </SimpleGrid>
                            </Paper>
                        )}

                        <Divider label="Distribución de Carga por Tramos" labelPosition="center" mt="md" />

                        {/* TIMELINE DE TRAMOS MULTI-DROP */}
                        {form.values.tramos.length > 0 ? (
                            <Box px="sm" pb="xs">
                                <Timeline active={form.values.tramos.length} bulletSize={28} lineWidth={2} color="blue">
                                    {form.values.tramos.map((tramo, index) => (
                                        <Timeline.Item
                                            key={index}
                                            bullet={<IconMapPin size={16} />}
                                            title={<Text fw={700} size="sm">{tramo.origen.split(',')[0]} ➔ {tramo.destino.split(',')[0]}</Text>}
                                        >
                                            <Group gap="xs" mt={4} mb="xs">
                                                <Badge size="xs" color="gray" variant="light">{tramo.distanciaKm} Km</Badge>
                                                {tramo.desnivelMetros > 0 && <Badge size="xs" color="violet" variant="light">⛰️ +{tramo.desnivelMetros}m subida</Badge>}
                                            </Group>

                                            <Paper withBorder p="xs" radius="md" bg="gray.0">
                                                <Group justify="space-between" mb={5}>
                                                    <Group gap={5}>
                                                        <Text size="xs" fw={500} component="span">Peso Neto:</Text>
                                                        <Badge color={tramo.tonelaje === 0 ? 'gray' : tramo.tonelaje > (capacidadMaxDynamic * 0.8) ? 'red' : 'blue'} variant="filled" size="sm">
                                                            {tramo.tonelaje}t
                                                        </Badge>
                                                    </Group>
                                                    <Text size="xs" fw={500} component="div">
                                                        Peso Bruto a mover: <Text span c="blue.9" fw={800}>{(taraBase + tramo.tonelaje).toFixed(1)}t</Text>
                                                    </Text>
                                                </Group>
                                                <Slider
                                                    value={tramo.tonelaje}
                                                    onChange={(val) => form.setFieldValue(`tramos.${index}.tonelaje`, val)}
                                                    step={0.5}
                                                    min={0}
                                                    max={capacidadMaxDynamic}
                                                    marks={[
                                                        { value: 0, label: 'Vacío' },
                                                        { value: Math.round(capacidadMaxDynamic / 2), label: 'Mitad' },
                                                        { value: Math.round(capacidadMaxDynamic), label: 'Full' },
                                                    ]}
                                                    mb="sm"
                                                    color={tramo.tonelaje > (capacidadMaxDynamic * 0.8) ? 'red' : 'blue'}
                                                />
                                            </Paper>
                                        </Timeline.Item>
                                    ))}
                                </Timeline>
                            </Box>
                        ) : (
                            <Alert color="gray" variant="light" ta="center">
                                Traza la ruta en el mapa para asignar la carga a cada tramo del viaje.
                            </Alert>
                        )}

                        <Group grow align="flex-start" mt="md">
                            <Select
                                label="Clasificación de la Carga"
                                data={[{ value: "general", label: "General / No peligrosa" }, { value: "petrolera", label: "Hidrocarburos" }, { value: "peligrosa", label: "Químicos" }]}
                                {...form.getInputProps("tipoCarga")}
                            />
                        </Group>
                    </SimpleGrid>
                </Grid.Col>

                {/* COLUMNA DERECHA */}
                <Grid.Col span={{ base: 12, md: 6 }}>
                    <Paper withBorder p="sm" radius="md" mb="md" bg="gray.0">
                        <Group mb="xs" justify="space-between">
                            <Group>
                                <IconRoute size={20} />
                                <Text fw={700}>Ruta Multi-Paradas con Altimetría</Text>
                            </Group>
                        </Group>
                        <Alert variant="light" color="blue" mb="sm" icon={<IconInfoCircle size={16} />}>
                            Haz clic en el mapa. El sistema trazará el circuito calculando kilómetros y montañas por ti.
                        </Alert>
                      
                            <GoogleRouteMap onRouteCalculated={handleRouteCalculated} />
                      
                    </Paper>

                    <Paper withBorder p="md" mb="md">
                        <Group mb="xs">
                            <IconCoin size={20} color="orange" />
                            <Text fw={700}>Gastos de Peaje</Text>
                        </Group>
                        <SimpleGrid cols={2}>
                            <NumberInput label="Nro. de Peajes a cruzar" min={0} {...form.getInputProps("cantidadPeajes")} />
                            <TextInput label="Valor BCV del Día" value={bcv ? `1 USD = ${bcv} Bs` : "Cargando..."} readOnly />
                        </SimpleGrid>
                    </Paper>

                    <Paper withBorder p="md" bg="blue.0" radius="md">
                        <Group mb="md" justify="space-between">
                            <Group>
                                <IconCalculator size={24} color="#1c7ed6" />
                                <Title order={4}>Presupuesto Inteligente</Title>
                            </Group>

                            {/* EL ACORDEON RESTAURADO */}
                            {estimacion?.breakdown?.itemsDetallados && (
                                <Accordion variant="separated" radius="md" mt="xl" defaultValue="detalles">
                                    <Accordion.Item value="detalles">
                                        <Accordion.Control icon={<IconInfoCircle size={20} color="teal" />}>
                                            <Text fw={700} c="dimmed">Ver Desglose Analítico</Text>
                                        </Accordion.Control>
                                        <Accordion.Panel>
                                            <Box style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                                <Table striped highlightOnHover verticalSpacing="xs">
                                                    <Table.Thead>
                                                        <Table.Tr>
                                                            <Table.Th>Concepto</Table.Th>
                                                            <Table.Th>Tipo</Table.Th>
                                                            <Table.Th style={{ textAlign: 'right' }}>Costo</Table.Th>
                                                        </Table.Tr>
                                                    </Table.Thead>
                                                    <Table.Tbody>
                                                        <Table.Tr bg="blue.0">
                                                            <Table.Td fw={700} colSpan={2}>GASTOS DIRECTOS</Table.Td>
                                                            <Table.Td></Table.Td>
                                                        </Table.Tr>
                                                        <Table.Tr>
                                                            <Table.Td>⛽ Gasoil ({estimacion.breakdown.litros.toFixed(0)} Lts)</Table.Td>
                                                            <Table.Td><Badge color="blue" size="xs">Combustible</Badge></Table.Td>
                                                            <Table.Td fw={500} ta="right">${estimacion.breakdown.combustible.toFixed(2)}</Table.Td>
                                                        </Table.Tr>
                                                        <Table.Tr>
                                                            <Table.Td>👷 Nómina + Viáticos</Table.Td>
                                                            <Table.Td><Badge color="blue" size="xs">RRHH</Badge></Table.Td>
                                                            <Table.Td fw={500} ta="right">${(estimacion.breakdown.nomina + estimacion.breakdown.viaticos).toFixed(2)}</Table.Td>
                                                        </Table.Tr>
                                                        <Table.Tr>
                                                            <Table.Td>🚧 Peajes y Tasas</Table.Td>
                                                            <Table.Td><Badge color="blue" size="xs">Vialidad</Badge></Table.Td>
                                                            <Table.Td fw={500} ta="right">${estimacion.breakdown.peajes.toFixed(2)}</Table.Td>
                                                        </Table.Tr>

                                                        <Table.Tr bg="orange.0">
                                                            <Table.Td fw={700} colSpan={2}>RESERVA MANTENIMIENTO</Table.Td>
                                                            <Table.Td></Table.Td>
                                                        </Table.Tr>
                                                        {estimacion.breakdown.itemsDetallados.map((item, index) => (
                                                            <Table.Tr key={index}>
                                                                <Table.Td style={{ fontSize: '0.9rem' }}>{item.descripcion}</Table.Td>
                                                                <Table.Td>
                                                                    <Badge color={item.tipo === 'Rodamiento' ? 'orange' : 'gray'} variant="outline" size="xs">
                                                                        {item.tipo === 'Rodamiento' ? 'Por Km' : 'Por Hora'}
                                                                    </Badge>
                                                                </Table.Td>
                                                                <Table.Td ta="right" style={{ fontFamily: 'monospace' }}>
                                                                    ${item.monto.toFixed(2)}
                                                                </Table.Td>
                                                            </Table.Tr>
                                                        ))}

                                                        <Table.Tr bg="teal.0">
                                                            <Table.Td fw={700} colSpan={2}>DEPRECIACIÓN</Table.Td>
                                                            <Table.Td></Table.Td>
                                                        </Table.Tr>
                                                        <Table.Tr>
                                                            <Table.Td>📉 Activos</Table.Td>
                                                            <Table.Td><Badge color="teal" size="xs">Posesión</Badge></Table.Td>
                                                            <Table.Td fw={500} ta="right">${estimacion.breakdown.posesion.toFixed(2)}</Table.Td>
                                                        </Table.Tr>

                                                    </Table.Tbody>
                                                    <Table.Tfoot>
                                                        <Table.Tr>
                                                            <Table.Th colSpan={2} ta="right">COSTO OPERATIVO:</Table.Th>
                                                            <Table.Th ta="right" style={{ fontSize: '1.1rem' }}>${estimacion.costoTotal.toFixed(2)}</Table.Th>
                                                        </Table.Tr>
                                                    </Table.Tfoot>
                                                </Table>
                                            </Box>
                                        </Accordion.Panel>
                                    </Accordion.Item>
                                </Accordion>
                            )}
                        </Group>

                        {calcLoading ? <Center py="xl"><Loader /></Center> : estimacion ? (
                            <Grid gutter="sm" align="center">
                                <Grid.Col span={8}>
                                    <Tooltip label={`Calcula L/Km por cada tramo en base a su peso bruto y añade gasoil extra por altimetría.`} position="top-start" withArrow multiline w={300}>
                                        <Text size="sm" style={{ cursor: 'help', borderBottom: '1px dashed #ccc', display: 'inline-block' }}>Combustible (LTL + Topografía):</Text>
                                    </Tooltip>
                                    <Text size="xs" c="dimmed">Basado en {form.values.tramos.length} tramos</Text>
                                </Grid.Col>
                                <Grid.Col span={4}>
                                    <Group justify="flex-end" gap="xs">
                                        <Badge size="xs" color="gray" variant="outline">{(estimacion.breakdown.litros || 0).toFixed(0)} Lts</Badge>
                                        <Text size="sm" ta="right" fw={500}>${estimacion.breakdown.combustible.toFixed(2)}</Text>
                                    </Group>
                                </Grid.Col>

                                <Grid.Col span={8}>
                                    <Text size="sm">Nómina Operadores + Viáticos:</Text>
                                </Grid.Col>
                                <Grid.Col span={4}><Text size="sm" ta="right" fw={500}>${(estimacion.breakdown.nomina + estimacion.breakdown.viaticos).toFixed(2)}</Text></Grid.Col>

                                <Grid.Col span={8}>
                                    <Text size="sm">Peajes:</Text>
                                </Grid.Col>
                                <Grid.Col span={4}><Text size="sm" ta="right" fw={500}>${estimacion.breakdown.peajes.toFixed(2)}</Text></Grid.Col>

                                <Grid.Col span={8}>
                                    <Text size="sm">Desgaste y Posesión:</Text>
                                </Grid.Col>
                                <Grid.Col span={4}><Text size="sm" ta="right" fw={500}>${(estimacion.breakdown.mantenimiento + estimacion.breakdown.posesion).toFixed(2)}</Text></Grid.Col>

                                <Grid.Col span={12}><Divider my="xs" /></Grid.Col>

                                <Grid.Col span={7}><Text fw={700}>Costo Operativo Base:</Text></Grid.Col>
                                <Grid.Col span={5}><Text fw={700} ta="right" c="red.9">${estimacion.costoTotal.toFixed(2)}</Text></Grid.Col>

                                <Grid.Col span={7}>
                                    <Tooltip label={`Costo Operativo ÷ (1 - Margen de Ganancia).`} position="top-start" withArrow color="green.9">
                                        <Text size="xl" fw={900} c="green.9" style={{ cursor: 'help', borderBottom: '2px dotted #2b8a3e', display: 'inline-block' }}>TARIFA A COTIZAR:</Text>
                                    </Tooltip>
                                </Grid.Col>
                                <Grid.Col span={5}><Text size="xl" fw={900} ta="right" c="green.9">${estimacion.precioSugerido.toFixed(2)}</Text></Grid.Col>
                            </Grid>
                        ) : (
                            <Box py="xl"><Text c="dimmed" ta="center">Traza la ruta para calcular.</Text></Box>
                        )}
                    </Paper>

                    <Paper withBorder p="md">
                        <Group justify="space-between" mb="xs">
                            <Text size="sm" fw={500}>Calidad de Repuestos a Presupuestar</Text>
                            <Badge color={form.values.calidadRepuestos < 40 ? 'red' : form.values.calidadRepuestos < 80 ? 'blue' : 'green'}>
                                {form.values.calidadRepuestos}%
                            </Badge>
                        </Group>
                        <Divider mt="xs" mb="md" />
                        <Box px="sm" pb="md">
                            <Slider
                                value={form.values.calidadRepuestos}
                                onChange={(val) => form.setFieldValue("calidadRepuestos", val)}
                                step={10}
                                marks={[
                                    { value: 0, label: 'Económico' },
                                    { value: 50, label: 'Estándar' },
                                    { value: 100, label: 'Original' },
                                ]}
                                mb="xl"
                            />
                        </Box>
                    </Paper>

                    <Button fullWidth size="xl" mt="xl" type="submit" loading={submitting} leftSection={<IconTruck size={24} />}>
                        Guardar y Generar Flete
                    </Button>
                </Grid.Col>
            </Grid>
        </form>
    );
}