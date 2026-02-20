"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
    TextInput, NumberInput, Button, Paper, Title, Center,
    SimpleGrid, Box, Divider, Grid, Text, Loader, Group, Badge, Select, Tooltip, Alert, Slider
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { IconMapPin, IconCalculator, IconCoin, IconTruck, IconRoute, IconInfoCircle } from "@tabler/icons-react";
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
            cantidadPeajes: 0,
            tonelaje: 0,
            calidadRepuestos: 50, 
            tipoCarga: "general",
        },
        validate: {
            clienteId: (val) => (val ? null : "Seleccione un cliente"),
            fechaSalida: (val) => (val ? null : "Fecha requerida"),
            choferId: (val) => (val ? null : "Debe asignar un chofer"),
            activoPrincipalId: (val) => (val ? null : "Debe asignar un vehículo principal"),
            distanciaKm: (val) => (val > 0 ? null : "Debe trazar una ruta en el mapa (Mínimo 1 parada)"),
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
            form.values.tonelaje,
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

            const response = await fetch('/api/fletes/estimar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tipoCotizacion: 'flete',
                    activoPrincipalId: form.values.activoPrincipalId,
                    remolqueId: form.values.remolqueId,
                    distanciaKm: rutaData.distanciaTotal,
                    tonelaje: form.values.tonelaje,
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
    }, []);

    const handleSubmit = async (values) => {
        setSubmitting(true);
        try {
            const payload = {
                ...values,
                waypoints: JSON.stringify(values.waypoints),
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

                        <Divider label="Recursos Humanos (Influye en Costo de Nómina)" labelPosition="center" />
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

                        <Divider label="Equipos (Influye en Combustible y Mantenimiento)" labelPosition="center" />
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

                        <Divider label="Detalles de Carga (Influye en Rendimiento del Gasoil)" labelPosition="center" />
                        <Group grow align="flex-start">
                            <NumberInput
                                label="Tonelaje Total (ton)"
                                description="A mayor peso, mayor consumo de gasoil"
                                min={0} step={0.5}
                                {...form.getInputProps("tonelaje")}
                            />
                            <Select
                                label="Clasificación de la Carga"
                                description="Impacta normativas o sobretasas"
                                data={[{ value: "general", label: "General / No peligrosa" }, { value: "petrolera", label: "Hidrocarburos" }, { value: "peligrosa", label: "Químicos" }]}
                                {...form.getInputProps("tipoCarga")}
                            />
                        </Group>
                        
                        <Divider label="Estrategia Comercial" labelPosition="center" mt="sm" />
                        <Box px="sm" pb="md">
                            <Group justify="space-between" mb="xs">
                                <Text size="sm" fw={500}>Calidad de Repuestos a Presupuestar</Text>
                                <Badge color={form.values.calidadRepuestos < 40 ? 'red' : form.values.calidadRepuestos < 80 ? 'blue' : 'green'}>
                                    {form.values.calidadRepuestos}%
                                </Badge>
                            </Group>
                            <Slider
                                value={form.values.calidadRepuestos}
                                onChange={(val) => form.setFieldValue("calidadRepuestos", val)}
                                step={10}
                                marks={[
                                    { value: 0, label: 'Económico' },
                                    { value: 50, label: 'Estándar' },
                                    { value: 100, label: 'Original (OEM)' },
                                ]}
                                mb="xl"
                            />
                            <Text size="xs" c="dimmed" mt="md">
                                Ajusta el presupuesto dinámicamente. 0% utiliza precios mínimos de matriz, 100% utiliza precios máximos.
                            </Text>
                        </Box>
                    </SimpleGrid>
                </Grid.Col>

                <Grid.Col span={{ base: 12, md: 6 }}>
                    <Paper withBorder p="sm" radius="md" mb="md" bg="gray.0">
                        <Group mb="xs" justify="space-between">
                            <Group>
                                <IconRoute size={20} />
                                <Text fw={700}>Trazar Ruta (Múltiples Paradas)</Text>
                            </Group>
                        </Group>
                        <Alert variant="light" color="blue" mb="sm" icon={<IconInfoCircle size={16} />}>
                            Haz clic en el mapa para agregar los puntos de entrega. El sistema cerrará el circuito de regreso a la Base automáticamente.
                        </Alert>
                        <Box h={{ base: 350, sm: 400 }} style={{ borderRadius: "8px", overflow: 'hidden' }}>
                            <GoogleRouteMap onRouteCalculated={handleRouteCalculated} />
                        </Box>
                    </Paper>

                    <Paper withBorder p="md" mb="md">
                        <Group mb="xs">
                            <IconCoin size={20} color="orange" />
                            <Text fw={700}>Gastos de Peaje</Text>
                        </Group>
                        <SimpleGrid cols={2}>
                            <NumberInput label="Nro. de Peajes a cruzar" description="Cuenta ida y vuelta" min={0} {...form.getInputProps("cantidadPeajes")} />
                            <TextInput label="Valor BCV del Día" description={`El peaje cuesta ${configPrecios.peaje} Bs`} value={bcv ? `1 USD = ${bcv} Bs` : "Cargando..."} readOnly />
                        </SimpleGrid>
                    </Paper>

                    <Paper withBorder p="md" bg="blue.0" radius="md">
                        <Group mb="md" justify="space-between">
                            <Group>
                                <IconCalculator size={24} color="#1c7ed6" />
                                <Title order={4}>Presupuesto Inteligente</Title>
                            </Group>
                            {estimacion && (
                                <Tooltip label="Tiempo de conducción estimado proyectado a jornadas laborales de 12 horas">
                                    <Badge color="gray" variant="light" size="sm" style={{ cursor: 'help' }}>
                                        {Math.ceil(parseFloat(rutaData?.tiempoEstimado?.split('h')[0] || 0) / 12)} Día(s) de viaje
                                    </Badge>
                                </Tooltip>
                            )}
                        </Group>

                        {calcLoading ? <Center py="xl"><Loader /></Center> : estimacion ? (
                            <Grid gutter="sm" align="center">
                                <Grid.Col span={8}>
                                    <Tooltip label={`Fórmula: Distancia dividida entre el rendimiento (Lts/Km) del camión según su base de datos, multiplicado por el costo del diésel ($${configPrecios.gasoil}).`} position="top-start" withArrow multiline w={300}>
                                        <Text size="sm" style={{ cursor: 'help', borderBottom: '1px dashed #ccc', display: 'inline-block' }}>Combustible (Gasoil):</Text>
                                    </Tooltip>
                                    <Text size="xs" c="dimmed">Proyectado para mover {form.values.tonelaje} Toneladas</Text>
                                </Grid.Col>
                                <Grid.Col span={4}>
                                    <Group justify="flex-end" gap="xs">
                                        <Badge size="xs" color="gray" variant="outline">{(estimacion.breakdown.litros || 0).toFixed(0)} Lts</Badge>
                                        <Text size="sm" ta="right" fw={500}>${estimacion.breakdown.combustible.toFixed(2)}</Text>
                                    </Group>
                                </Grid.Col>

                                <Grid.Col span={8}>
                                    <Tooltip label={`Nómina: Se calculó la tarifa por hora (Sueldo Mensual / 672 hrs) x horas de viaje.\nViáticos: $25 por día de viaje por persona.`} position="top-start" withArrow multiline w={300}>
                                        <Text size="sm" style={{ cursor: 'help', borderBottom: '1px dashed #ccc', display: 'inline-block' }}>Nómina de Operadores + Viáticos:</Text>
                                    </Tooltip>
                                    <Text size="xs" c="dimmed">Incluye {form.values.ayudanteId ? "Chofer y Ayudante" : "Solo Chofer"}</Text>
                                </Grid.Col>
                                <Grid.Col span={4}><Text size="sm" ta="right" fw={500}>${(estimacion.breakdown.nomina + estimacion.breakdown.viaticos).toFixed(2)}</Text></Grid.Col>

                                <Grid.Col span={8}>
                                    <Tooltip label={`Fórmula: (${form.values.cantidadPeajes || 0} peajes x ${configPrecios.peaje} Bs) ÷ ${bcv} Tasa BCV`} position="top-start" withArrow multiline w={300}>
                                        <Text size="sm" style={{ cursor: 'help', borderBottom: '1px dashed #ccc', display: 'inline-block' }}>Peajes (Conversión Bs a USD):</Text>
                                    </Tooltip>
                                </Grid.Col>
                                <Grid.Col span={4}><Text size="sm" ta="right" fw={500}>${estimacion.breakdown.peajes.toFixed(2)}</Text></Grid.Col>

                                <Grid.Col span={8}>
                                    <Tooltip label={`Mantenimiento: Km recorridos x Tarifa teórica de desgaste ($/Km).\nPosesión: Depreciación y Seguros prorrateados por hora de viaje.`} position="top-start" withArrow multiline w={300}>
                                        <Text size="sm" style={{ cursor: 'help', borderBottom: '1px dashed #ccc', display: 'inline-block' }}>Desgaste y Posesión de Activos:</Text>
                                    </Tooltip>
                                    <Text size="xs" c="dimmed">Cauchos, aceite, filtros, depreciación chuto{form.values.remolqueId ? " y batea" : ""}</Text>
                                </Grid.Col>
                                <Grid.Col span={4}><Text size="sm" ta="right" fw={500}>${(estimacion.breakdown.mantenimiento + estimacion.breakdown.posesion).toFixed(2)}</Text></Grid.Col>

                                <Grid.Col span={12}><Divider my="xs" /></Grid.Col>

                                <Grid.Col span={7}><Text fw={700}>Costo Operativo Base (Sin Ganancia):</Text></Grid.Col>
                                <Grid.Col span={5}><Text fw={700} ta="right" c="red.9">${estimacion.costoTotal.toFixed(2)}</Text></Grid.Col>

                                <Grid.Col span={7}>
                                    <Tooltip label={`Fórmula comercial: Costo Operativo ÷ (1 - 0.30 Margen de Ganancia). Esto garantiza un 30% de rentabilidad neta sobre la venta.`} position="top-start" withArrow color="green.9" multiline w={300}>
                                        <Text size="xl" fw={900} c="green.9" style={{ cursor: 'help', borderBottom: '2px dotted #2b8a3e', display: 'inline-block' }}>TARIFA A COTIZAR:</Text>
                                    </Tooltip>
                                </Grid.Col>
                                <Grid.Col span={5}><Text size="xl" fw={900} ta="right" c="green.9">${estimacion.precioSugerido.toFixed(2)}</Text></Grid.Col>
                            </Grid>
                        ) : (
                            <Box py="xl">
                                <Text c="dimmed" ta="center">El presupuesto se calculará automáticamente al:</Text>
                                <Text c="dimmed" ta="center" size="sm">1. Seleccionar el vehículo.</Text>
                                <Text c="dimmed" ta="center" size="sm">2. Trazar la ruta en el mapa.</Text>
                            </Box>
                        )}
                    </Paper>

                    <Button fullWidth size="xl" mt="xl" type="submit" loading={submitting} leftSection={<IconTruck size={24} />}>
                        Guardar y Generar Flete
                    </Button>
                </Grid.Col>
            </Grid>
        </form>
    );
}