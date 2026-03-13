"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
    TextInput, NumberInput, Button, Paper, Title, Center,
    SimpleGrid, Box, Divider, Grid, Text, Loader, Group, Badge, Select, Tooltip, Alert, Slider,
    Accordion,
    Table,
    Timeline,
    Switch,
    Stack,
    ThemeIcon
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import {
    IconCalculator, IconCoin, IconTruck, IconRoute, IconInfoCircle,
    IconMapPin, IconChartLine, IconSettings, IconSteeringWheel, IconAlertTriangle, IconDashboard
} from "@tabler/icons-react";
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
    const [configGlobal, setConfigGlobal] = useState(null);
    const [rutaData, setRutaData] = useState(null);

    const [expandedSections, setExpandedSections] = useState({
        gasoil: false,
        nomina: false,
        viaticos: false,
        posesion: false,
        overhead: false,
        mantenimiento: false,
        riesgo: false,
    });

    const toggleSection = (section) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const form = useForm({
        initialValues: {
            clienteId: "",
            fechaSalida: new Date(),
            nroFlete: "", // Se llenará automáticamente en el useEffect
            jornadaMaxima: 12,
            viaticosManuales: 0,
            horaSalida: "06:00",
            comidaPrimerDia: false,
            choferId: null,
            ayudanteId: null,
            activoPrincipalId: null,
            remolqueId: null,
            origen: "Base DADICA - Tía Juana",
            destino: "Circuito Logístico",
            distanciaKm: 0,
            waypoints: [],
            tramos: [],
            cantidadPeajes: 0,
            calidadRepuestos: 50,
            tipoCarga: "general",
            margenGanancia: 30,
        },
        validate: {
            clienteId: (val) => (val ? null : "Seleccione un cliente"),
            fechaSalida: (val) => (val ? null : "Fecha requerida"),
            choferId: (val) => (val ? null : "Debe asignar un chofer"),
            activoPrincipalId: (val) => (val ? null : "Debe asignar un vehículo principal"),
            distanciaKm: (val) => (val > 0 ? null : "Debe trazar una ruta en el mapa"),
        },
    });

    const [valorVisualMargen, setValorVisualMargen] = useState(form.values.margenGanancia);
    const [valorVisualRepuestos, setValorVisualRepuestos] = useState(form.values.calidadRepuestos);

    useEffect(() => {
        const cargarDatos = async () => {
            try {
                // 🔥 NUEVO: Agregamos la consulta de fletes al Promise.all 🔥
                const [resEmp, resAct, resPrecios, resBcv, resConfig, resFletes] = await Promise.all([
                    fetch(`/api/rrhh/empleados`).then((r) => r.json()),
                    fetch(`/api/gestionMantenimiento/activos`).then((r) => r.json()),
                    fetch(`/api/configuracion/precios`).then((r) => r.json()),
                    fetch(`/api/bcv`).then((r) => r.json()),
                    fetch(`/api/configuracion/general`).then((r) => r.json()),
                    fetch(`/api/fletes`).then((r) => r.json()).catch(() => null), // Evita que un error aquí tumbe la página
                ]);

                setEmpleados(resEmp || []);
                setActivos(resAct.success ? resAct.data : []);
                setBcv(parseFloat(resBcv?.precio || 1));
                setConfigGlobal(resConfig);

                if (resConfig) {
                    setConfigPrecios({
                        peaje: parseFloat(resConfig.precioPeajePromedio || 20),
                        gasoil: parseFloat(resConfig.precioGasoil || 0.5),
                    });
                }

                // 🔥 AUTO-GENERADOR DE CORRELATIVO (FL-XXXX) 🔥
                if (resFletes) {
                    const fletesList = Array.isArray(resFletes) ? resFletes : (resFletes.data || []);
                    let maxNum = 0;
                    fletesList.forEach(f => {
                        if (f.nroFlete && f.nroFlete.toUpperCase().startsWith('FL-')) {
                            const num = parseInt(f.nroFlete.substring(3), 10);
                            if (!isNaN(num) && num > maxNum) maxNum = num;
                        }
                    });
                    const nextNum = String(maxNum + 1).padStart(4, '0');
                    form.setFieldValue("nroFlete", `FL-${nextNum}`);
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
                tara: v.tara || v.remolqueInstancia?.plantilla?.peso || v.vehiculoInstancia?.plantilla?.peso || null,
                capacidad: v.capacidadTonelajeMax || v.remolqueInstancia?.plantilla?.capacidadCarga || v.vehiculoInstancia?.plantilla?.capacidadArrastre || null,
                raw: v
            };
        });
    }, [activos]);

    const { data: estimacion, isLoading: calcLoading } = useQuery({
        queryKey: [
            "calcular-flete-puro",
            form.values.activoPrincipalId,
            form.values.remolqueId,
            rutaData?.distanciaTotal,
            JSON.stringify(form.values.tramos),
            form.values.cantidadPeajes,
            form.values.choferId,
            form.values.ayudanteId,
            form.values.calidadRepuestos,
            form.values.fechaSalida,
            form.values.jornadaMaxima,
            form.values.horaSalida,
            form.values.comidaPrimerDia,
            form.values.viaticosManuales,
            form.values.margenGanancia,
            form.values.tipoCarga
        ],
        queryFn: async () => {
            if (!form.values.activoPrincipalId || !rutaData?.distanciaTotal || !configGlobal) return null;

            const choferObj = empleados.find(e => e.id === form.values.choferId);
            const ayudanteObj = empleados.find(e => e.id === form.values.ayudanteId);

            const sueldoChofer = parseFloat(choferObj?.sueldoDiario || configGlobal.sueldoDiarioChofer || 25);
            const sueldoAyudante = parseFloat(ayudanteObj?.sueldoDiario || configGlobal.sueldoDiarioAyudante || 15);

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
                    fechaSalida: form.values.fechaSalida,
                    jornadaMaxima: parseInt(form.values.jornadaMaxima),
                    tonelaje: tonelajePromedio,
                    horaSalida: form.values.horaSalida,
                    comidaPrimerDia: form.values.comidaPrimerDia,
                    viaticosManuales: form.values.viaticosManuales,
                    tramos: form.values.tramos,
                    cantidadPeajes: form.values.cantidadPeajes,
                    precioPeajeBs: configPrecios.peaje,
                    bcv: bcv || 1,
                    precioGasoilUsd: configPrecios.gasoil,
                    tieneAyudante: !!form.values.ayudanteId,
                    calidadRepuestos: form.values.calidadRepuestos,
                    porcentajeGanancia: parseFloat(form.values.margenGanancia) / 100,

                    sueldoDiarioChofer: sueldoChofer,
                    sueldoDiarioAyudante: sueldoAyudante,
                    viaticoAlimentacionDia: parseFloat(configGlobal.viaticoAlimentacionDia || 15),
                    viaticoHotelNoche: parseFloat(configGlobal.viaticoHotelNoche || 20),

                    valorFlotaTotal: parseFloat(configGlobal.valorFlotaTotal || 1),
                    gastosFijosAnualesTotales: parseFloat(configGlobal.gastosFijosAnualesTotales || 0),
                    horasTotalesFlota: parseInt(configGlobal.horasTotalesFlota || 1),
                    costoAdministrativoPorHora: parseFloat(configGlobal.costoAdministrativoPorHora || 0),
                    tipoCarga: form.values.tipoCarga,
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

    if (loading) return <Center h="80vh"><Loader size="xl" color="yellow.6" /></Center>;

    // 🔥 1. SOLUCIÓN TARA TOTAL (Suma Inmediata) 🔥
    const chutoSeleccionado = activosMapeados.find(a => a.id === form.values.activoPrincipalId);
    const remolqueSeleccionado = activosMapeados.find(a => a.id === form.values.remolqueId);

    const taraChutoFija = chutoSeleccionado ? Number(chutoSeleccionado.tara) || 0 : 0;
    const taraRemolqueFija = remolqueSeleccionado ? Number(remolqueSeleccionado.tara) || 0 : 0;
    const taraBaseVisual = taraChutoFija + taraRemolqueFija; // Suma instantánea en UI

    const capacidadMaxDynamic = estimacion?.breakdown?.auditoriaPesos?.capacidad?.valor || (chutoSeleccionado?.capacidad || 40);

    // 🔥 2. CÁLCULO DE CONSUMO PROMEDIO (Litros Totales / Distancia) 🔥
    const distanciaViaje = rutaData?.distanciaTotal || 0;
    const litrosTotales = estimacion?.breakdown?.litros || 0;
    const consumoPromedioDinamico = distanciaViaje > 0 ? (litrosTotales / distanciaViaje).toFixed(2) : "0.00";


    return (
        <form onSubmit={form.onSubmit(handleSubmit)}>
            {/* 🔥 FONDO INDUSTRIAL Y FULL WIDTH (Adiós Padding Lateral) 🔥 */}
            <Box w="100%" p={0} m={0} bg="#e9ecef" style={{ minHeight: '100vh', paddingBottom: '40px' }}>
                <Stack gap="xl">

                    {/* ======================================================= */}
                    {/* SECCIÓN 1: CONFIGURACIÓN OPERATIVA (DESAHOGADA A 3 COLUMNAS) */}
                    {/* ======================================================= */}
                    <Paper shadow="sm" p="xl" radius={0} bg="white" style={{ borderBottom: '4px solid #fab005' }}>
                        <Group mb="lg" align="center">
                            <ThemeIcon size="xl" radius="md" variant="filled" color="dark.8">
                                <IconSettings size={28} color="#fab005" />
                            </ThemeIcon>
                            <Title order={2} c="dark.9" tt="uppercase" style={{ letterSpacing: '1px' }}>
                                Parámetros de la Misión
                            </Title>
                        </Group>

                        {/* División a 3 Columnas (Span 4 cada una) para que no esté apretado */}
                        <Grid gutter="xl">
                            {/* COLUMNA 1: Comerciales y Variables */}
                            <Grid.Col span={{ base: 12, lg: 4 }}>
                                <Stack gap="md">
                                    <Text fw={900} c="dark.5" size="sm" tt="uppercase" style={{ borderBottom: '2px solid #fab005', display: 'inline-block', paddingBottom: '4px' }}>Datos Comerciales</Text>

                                    <SelectClienteConCreacion form={form} fieldName="clienteId" label="Cliente" />

                                    <Group grow>
                                        <DateInput label="Fecha de Salida" valueFormat="DD/MM/YYYY" {...form.getInputProps("fechaSalida")} />
                                        <TextInput label="Nro Control" placeholder="FL-XXXX" {...form.getInputProps("nroFlete")} fw={800} c="blue.9" />
                                    </Group>

                                    <Select
                                        label="Clasificación de la Carga"
                                        description="Riesgo operativo y permisos."
                                        data={[
                                            { value: "general", label: "📦 General / No peligrosa (Limpia)" },
                                            { value: "salmuera", label: "💧 Salmuera (Fluidos de completación)" },
                                            { value: "hidrocarburos", label: "🛢️ Hidrocarburos (Crudo, gasoil)" },
                                            { value: "quimicos", label: "🧪 Químicos (Ácidos, reactivos)" },
                                            { value: "explosivos", label: "🧨 Materiales Explosivos" }
                                        ]}
                                        {...form.getInputProps("tipoCarga")}
                                    />

                                    <Paper withBorder p="sm" bg="gray.0" radius="sm" mt="xs">
                                        <SimpleGrid cols={2} spacing="md">
                                            <TextInput type="time" label="Hora Salida" {...form.getInputProps("horaSalida")} />
                                            <NumberInput label="Jornada (Hrs)" min={4} max={24} {...form.getInputProps("jornadaMaxima")} />
                                            <NumberInput label="Peajes (Cant)" min={0} leftSection={<IconMapPin size={16} />} {...form.getInputProps("cantidadPeajes")} />
                                            <NumberInput label="Viáticos ($)" min={0} leftSection={<IconCoin size={16} />} {...form.getInputProps("viaticosManuales")} />
                                        </SimpleGrid>
                                        <Switch
                                            label="¿Cubrir comida el 1er día?"
                                            mt="md" color="yellow.6" fw={600} size="md"
                                            checked={form.values.comidaPrimerDia}
                                            onChange={(event) => form.setFieldValue("comidaPrimerDia", event.currentTarget.checked)}
                                        />
                                    </Paper>
                                </Stack>
                            </Grid.Col>

                            {/* COLUMNA 2: Asignación de Flota y Telemetría */}
                            <Grid.Col span={{ base: 12, lg: 4 }}>
                                <Stack gap="md">
                                    <Text fw={900} c="dark.5" size="sm" tt="uppercase" style={{ borderBottom: '2px solid #fab005', display: 'inline-block', paddingBottom: '4px' }}>Asignación de Flota</Text>

                                    <ODTSelectableGrid
                                        label="Vehículo Principal (Chuto/Camión)"
                                        data={activosMapeados.filter((a) => a.tipo === "Vehiculo")}
                                        onChange={(val) => form.setFieldValue("activoPrincipalId", val)}
                                        value={form.values.activoPrincipalId}
                                        showMetrics
                                    />
                                    <ODTSelectableGrid
                                        label="Remolque / Batea"
                                        data={activosMapeados.filter((a) => a.tipo === "Remolque")}
                                        onChange={(val) => form.setFieldValue("remolqueId", val)}
                                        value={form.values.remolqueId}
                                        showMetrics
                                    />

                                    {/* PANEL DE TELEMETRÍA DINÁMICO */}
                                    {form.values.activoPrincipalId ? (
                                        <Paper withBorder p="md" radius="sm" bg="dark.8" shadow="sm">
                                            <Group mb="md" gap="xs">
                                                <IconDashboard size={20} color="#fab005" />
                                                <Text size="sm" fw={900} c="white" tt="uppercase">Telemetría de Flota Detectada</Text>
                                            </Group>

                                            <SimpleGrid cols={2} spacing="md">
                                                <Box>
                                                    <Text size="xs" fw={700} c="gray.5" tt="uppercase">Tara Flota (Vacía):</Text>
                                                    <Group gap={5} mt={4}>
                                                        <Text size="xl" fw={900} c="yellow.5">{taraBaseVisual.toFixed(1)} t</Text>
                                                    </Group>
                                                    <Text size="xs" c="gray.4" mt={2}>
                                                        C: {taraChutoFija.toFixed(1)}t | B: {taraRemolqueFija.toFixed(1)}t
                                                    </Text>
                                                </Box>

                                                <Box>
                                                    <Text size="xs" fw={700} c="gray.5" tt="uppercase">Max Arrastre:</Text>
                                                    <Text size="xl" fw={900} c="white" mt={4}>{capacidadMaxDynamic} t</Text>
                                                </Box>

                                                {estimacion?.breakdown?.auditoriaPesos && (
                                                    <>
                                                        <Box>
                                                            {/* Cambiamos Rendimiento Base por Promedio Estimado */}
                                                            <Text size="xs" fw={700} c="gray.5" tt="uppercase">Rendimiento Estimado:</Text>
                                                            <Text size="md" fw={900} c="white" mt={4}>{consumoPromedioDinamico} L/Km</Text>
                                                            <Text size="xs" c="gray.5" mt={2}>(Ajustado por carga en ruta)</Text>
                                                        </Box>

                                                        <Box>
                                                            <Text size="xs" fw={700} c="gray.5" tt="uppercase">Vel. Real Montaña:</Text>
                                                            <Text size="md" fw={900} c="orange.5" mt={4}>{estimacion.breakdown.rutinaViaje.velocidadPromedioReal} Km/h</Text>
                                                        </Box>
                                                    </>
                                                )}
                                            </SimpleGrid>
                                        </Paper>
                                    ) : (
                                        <Alert color="dark.8" variant="outline" style={{ borderStyle: 'dashed' }}>
                                            Asigna la flota para visualizar la telemetría base.
                                        </Alert>
                                    )}
                                </Stack>
                            </Grid.Col>

                            {/* COLUMNA 3: Tripulación */}
                            <Grid.Col span={{ base: 12, lg: 4 }}>
                                <Stack gap="md">
                                    <Text fw={900} c="dark.5" size="sm" tt="uppercase" style={{ borderBottom: '2px solid #fab005', display: 'inline-block', paddingBottom: '4px' }}>Tripulación</Text>
                                    <ODTSelectableGrid
                                        label="Chofer Principal"
                                        data={empleados.filter((e) => e.puestos?.some((p) => p.nombre.toLowerCase().includes("chofer"))).map((e) => ({ id: e.id, nombre: `${e.nombre} ${e.apellido}`, imagen: e.imagen }))}
                                        onChange={(val) => form.setFieldValue("choferId", val)}
                                        value={form.values.choferId}
                                    />
                                    <ODTSelectableGrid
                                        label="Ayudante / Escolta (Opcional)"
                                        data={empleados.filter((e) => e.puestos?.some((p) => p.nombre.toLowerCase().includes("ayudante"))).map((e) => ({ id: e.id, nombre: `${e.nombre} ${e.apellido}`, imagen: e.imagen }))}
                                        onChange={(val) => form.setFieldValue("ayudanteId", val)}
                                        value={form.values.ayudanteId}
                                    />
                                </Stack>
                            </Grid.Col>
                        </Grid>
                    </Paper>

                    {/* ======================================================= */}
                    {/* SECCIÓN 2: LOGÍSTICA Y RUTA (FULL WIDTH MAP) */}
                    {/* ======================================================= */}
                    <Paper shadow="sm" p="xl" radius={0} bg="white" style={{ borderBottom: '4px solid #fab005' }}>
                        <Group mb="md" align="center">
                            <ThemeIcon size="xl" radius="md" variant="filled" color="dark.8">
                                <IconRoute size={28} color="#fab005" />
                            </ThemeIcon>
                            <Title order={2} c="dark.9" tt="uppercase" style={{ letterSpacing: '1px' }}>
                                Trazado Logístico y Altimetría
                            </Title>
                        </Group>

                        <Alert variant="filled" color="dark.8" mb="lg" icon={<IconInfoCircle size={18} color="#fab005" />} style={{ borderLeft: '4px solid #fab005' }}>
                            <Text c="white" fw={500}>Haz clic en el mapa. El sistema trazará el circuito calculando kilómetros, tiempos y esfuerzo en montañas automáticamente.</Text>
                        </Alert>

                        <Box style={{ minHeight: '500px', borderRadius: '4px', overflow: 'hidden', border: '2px solid #343a40' }}>
                            <GoogleRouteMap
                                onRouteCalculated={handleRouteCalculated}
                                tramosFormulario={form.values.tramos}
                                vehiculoAsignado={!!form.values.vehiculoPrincipalId}
                                taraBase={0}
                                capacidadMax={30}
                                // 🔥 LE PASAMOS LOS PUNTOS GUARDADOS AL MAPA 🔥
                                initialWaypoints={form.values.waypoints}
                            />
                        </Box>

                        {form.values.tramos.length > 0 && (
                            <Box mt="xl" p="xl" bg="gray.1" style={{ borderRadius: '8px', border: '1px solid #dee2e6' }}>
                                <Text fw={900} c="dark.8" size="lg" tt="uppercase" mb="xl" style={{ borderBottom: '2px solid #fab005', display: 'inline-block', paddingBottom: '4px' }}>
                                    Distribución de Carga por Tramos
                                </Text>

                                <Timeline active={form.values.tramos.length} bulletSize={32} lineWidth={4} color="yellow.6">
                                    {form.values.tramos.map((tramo, index) => (
                                        <Timeline.Item
                                            key={index}
                                            bullet={<IconMapPin size={18} c="dark.9" />}
                                            title={<Text fw={900} size="xl" c="dark.8">{tramo.origen.split(',')[0]} ➔ {tramo.destino.split(',')[0]}</Text>}
                                        >
                                            <Group gap="md" mt={8} mb="lg">
                                                <Badge size="lg" color="dark.8" variant="filled" radius="sm">{tramo.distanciaKm} Km</Badge>
                                                {tramo.desnivelMetros > 0 && <Badge size="lg" color="orange.6" variant="filled" radius="sm">⛰️ +{tramo.desnivelMetros}m subida</Badge>}
                                            </Group>

                                            <Paper withBorder p="xl" radius="md" bg="white" shadow="sm" style={{ borderLeft: '8px solid #fab005' }}>
                                                <Grid align="center" gutter="xl">
                                                    <Grid.Col span={{ base: 12, md: 3 }}>
                                                        <Stack gap={4}>
                                                            <Text size="sm" fw={800} c="gray.6" tt="uppercase">Peso Neto (Carga):</Text>
                                                            <Badge size="xl" radius="sm" color={tramo.tonelaje === 0 ? 'gray.6' : tramo.tonelaje > (capacidadMaxDynamic * 0.8) ? 'red.7' : 'dark.8'} variant="filled">
                                                                {tramo.tonelaje} t
                                                            </Badge>
                                                            <Text size="sm" mt="xs" fw={600}>Peso Bruto: <Text span c="dark.9" fw={900}>{((Number(taraBaseVisual) || 0) + (Number(tramo.tonelaje) || 0)).toFixed(1)}t</Text></Text>
                                                        </Stack>
                                                    </Grid.Col>

                                                    <Grid.Col span={{ base: 12, md: 6 }}>
                                                        <Text size="md" fw={800} mb={10} c="dark.7">Ajustar Peso a Mover en este Tramo:</Text>
                                                        <Slider
                                                            color="yellow.6" size="xl" radius="sm"
                                                            defaultValue={tramo.tonelaje}
                                                            onChangeEnd={(val) => form.setFieldValue(`tramos.${index}.tonelaje`, val)}
                                                            step={0.5} min={0} max={capacidadMaxDynamic}
                                                            label={(val) => `${val}t`}
                                                            marks={[
                                                                { value: 0, label: <Text fw={800}>Vacío</Text> },
                                                                { value: Math.round(capacidadMaxDynamic), label: <Text fw={800}>Full</Text> }
                                                            ]}
                                                        />
                                                    </Grid.Col>

                                                    <Grid.Col span={{ base: 12, md: 3 }}>
                                                        <NumberInput
                                                            label={<Text fw={700}>Espera en parada (Hrs)</Text>}
                                                            description="Carga/Descarga"
                                                            size="lg" min={0} step={0.5}
                                                            value={tramo.tiempoEspera || 0}
                                                            onChange={(val) => form.setFieldValue(`tramos.${index}.tiempoEspera`, val)}
                                                        />
                                                    </Grid.Col>
                                                </Grid>
                                            </Paper>
                                        </Timeline.Item>
                                    ))}
                                </Timeline>
                            </Box>
                        )}
                    </Paper>

                    {/* ======================================================= */}
                    {/* SECCIÓN 3: INTELIGENCIA FINANCIERA (FULL WIDTH) */}
                    {/* ======================================================= */}
                    <Paper shadow="sm" p="xl" radius={0} bg="white" style={{ borderBottom: '4px solid #fab005' }}>
                        <Group mb="md" align="center">
                            <ThemeIcon size="xl" radius="md" variant="filled" color="dark.8">
                                <IconCalculator size={28} color="#fab005" />
                            </ThemeIcon>
                            <Title order={2} c="dark.9" tt="uppercase" style={{ letterSpacing: '1px' }}>
                                Presupuesto Inteligente
                            </Title>
                        </Group>

                        {calcLoading ? (
                            <Center py={100}><Loader size="xl" color="yellow.6" variant="bars" /></Center>
                        ) : !estimacion ? (
                            <Alert color="dark.8" variant="outline" ta="center" mt="xl" style={{ borderStyle: 'dashed' }}>
                                <Text fw={600} size="lg">Traza la ruta para que el motor financiero procese los costos en tiempo real.</Text>
                            </Alert>
                        ) : (
                            <Stack gap="xl">

                                {estimacion?.breakdown?.rutinaViaje && (
                                    <SimpleGrid cols={{ base: 1, md: 3 }} spacing="xl">
                                        <Paper withBorder p="xl" radius="md" ta="center" bg="gray.1" shadow="xs">
                                            <Text size="md" c="gray.6" fw={900} tt="uppercase">Tiempo en Movimiento</Text>
                                            <Text fw={900} style={{ fontSize: '3rem', lineHeight: 1.2 }} c="dark.8">{estimacion.breakdown.rutinaViaje.horasConduccion} <Text span size="xl" c="dimmed">hrs</Text></Text>
                                            <Text size="md" c="gray.6" fw={700}>+{estimacion.breakdown.rutinaViaje.horasEsperaTotales} hrs (Demoras/Espera)</Text>
                                        </Paper>
                                        <Paper withBorder p="xl" radius="md" ta="center" bg="dark.8" shadow="md">
                                            <Text size="md" c="yellow.5" fw={900} tt="uppercase">Duración Total Misión</Text>
                                            <Text fw={900} style={{ fontSize: '3rem', lineHeight: 1.2 }} c="white">{estimacion.breakdown.rutinaViaje.tiempoMisionTotal} <Text span size="xl" c="gray.5">hrs</Text></Text>
                                            <Text size="md" c="gray.4" fw={700}>Rodando + Descansos</Text>
                                        </Paper>
                                        <Paper withBorder p="xl" radius="md" ta="center" bg="teal.0" shadow="xs" style={{ border: '2px solid #20c997' }}>
                                            <Text size="md" c="teal.9" fw={900} tt="uppercase">Llegada Estimada</Text>
                                            <Text fw={900} style={{ fontSize: '2.2rem', lineHeight: 1.2 }} c="teal.9" mt={8}>
                                                {new Date(estimacion.breakdown.rutinaViaje.fechaLlegadaISO).toLocaleDateString('es-VE', { weekday: 'short', day: '2-digit', month: 'short' })}
                                            </Text>
                                            <Text fw={900} size="xl" c="teal.9">
                                                {new Date(estimacion.breakdown.rutinaViaje.fechaLlegadaISO).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}
                                            </Text>
                                        </Paper>
                                    </SimpleGrid>
                                )}

                                <Accordion variant="separated" radius="sm" defaultValue="detalles">
                                    <Accordion.Item value="detalles" style={{ backgroundColor: '#ffffff', border: '1px solid #ced4da', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                                        <Accordion.Control icon={<IconChartLine size={28} color="#343a40" />} p="xl">
                                            <Text fw={900} size="xl" c="dark.9" tt="uppercase">Desglose Analítico de Costos Financieros</Text>
                                        </Accordion.Control>
                                        <Accordion.Panel p="xl">

                                            {estimacion?.breakdown?.itinerario && estimacion.breakdown.itinerario.length > 0 && (
                                                <Box mt="md" mb="xl" p="xl" bg="gray.0" style={{ borderRadius: '8px', border: '1px solid #e9ecef' }}>
                                                    <Text fw={900} mb="lg" size="lg" c="dark.8" tt="uppercase"><IconRoute size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} /> Cronograma Estimado de la Misión</Text>
                                                    <Timeline active={estimacion.breakdown.itinerario.length} bulletSize={24} lineWidth={3} color="yellow.6">
                                                        {estimacion.breakdown.itinerario.map((evento, idx) => (
                                                            <Timeline.Item key={idx} title={<Text fw={900} c="dark.8" size="md">Día {evento.dia}</Text>} lineVariant={evento.tipo === 'descanso' ? 'dashed' : 'solid'} color={evento.tipo === 'descanso' ? 'orange.6' : 'yellow.6'}>
                                                                <Text c="dimmed" size="md" fw={700}>{evento.inicio} - {evento.fin}</Text>
                                                                <Text size="lg" fw={800} c="dark.7">{evento.accion}</Text>
                                                                {evento.detalleViatico && (
                                                                    <Badge size="md" color="green.7" variant="filled" mt={8} radius="sm">{evento.detalleViatico}</Badge>
                                                                )}
                                                            </Timeline.Item>
                                                        ))}
                                                    </Timeline>
                                                </Box>
                                            )}

                                            <Box style={{ overflowX: 'auto' }}>
                                                <Table highlightOnHover verticalSpacing="lg" style={{ minWidth: '1000px' }}>
                                                    <Table.Thead bg="gray.2">
                                                        <Table.Tr>
                                                            <Table.Th w="60%"><Text c="dark.8" fw={900} size="md" tt="uppercase">Concepto Operativo</Text></Table.Th>
                                                            <Table.Th w="20%"><Text c="dark.8" fw={900} size="md" tt="uppercase">Clasificación</Text></Table.Th>
                                                            <Table.Th w="20%" style={{ textAlign: 'right' }}><Text c="dark.8" fw={900} size="md" tt="uppercase">Costo USD</Text></Table.Th>
                                                        </Table.Tr>
                                                    </Table.Thead>
                                                    <Table.Tbody>

                                                        {/* 1. GASOIL */}
                                                        <Table.Tr onClick={() => toggleSection('gasoil')} style={{ cursor: 'pointer' }} bg={expandedSections.gasoil ? "gray.1" : undefined}>
                                                            <Table.Td fw={900} c="dark.8" fz="lg"><Text span mr={8} c="yellow.6">{expandedSections.gasoil ? '▼' : '▶'}</Text> ⛽ Combustible Total ({estimacion.breakdown.litros.toFixed(0)} Lts)</Table.Td>
                                                            <Table.Td><Badge color="dark.6" radius="sm" size="lg">Operativo</Badge></Table.Td>
                                                            <Table.Td fw={900} ta="right" fz="xl" c="dark.9">${estimacion.breakdown.combustible.toFixed(2)}</Table.Td>
                                                        </Table.Tr>
                                                        {expandedSections.gasoil && estimacion?.breakdown?.combustibleDetalle && (
                                                            <>
                                                                <Table.Tr><Table.Td pl={60} c="dimmed" style={{ borderBottom: 'none' }} colSpan={2} fz="md">↳ 🛣️ Por distancia plana base</Table.Td><Table.Td style={{ borderBottom: 'none' }} ta="right" c="dimmed" fw={800} fz="md">${(estimacion.breakdown.combustibleDetalle.baseDistancia * configPrecios.gasoil).toFixed(2)}</Table.Td></Table.Tr>
                                                                <Table.Tr><Table.Td pl={60} c="dimmed" style={{ borderBottom: 'none' }} colSpan={2} fz="md">↳ ⚖️ Por esfuerzo de tonelaje remolcado</Table.Td><Table.Td style={{ borderBottom: 'none' }} ta="right" c="dimmed" fw={800} fz="md">${(estimacion.breakdown.combustibleDetalle.extraPeso * configPrecios.gasoil).toFixed(2)}</Table.Td></Table.Tr>
                                                                {estimacion.breakdown.combustibleDetalle.extraElevacion > 0 && (
                                                                    <Table.Tr><Table.Td pl={60} c="dimmed" style={{ borderBottom: 'none' }} colSpan={2} fz="md">↳ ⛰️ Por esfuerzo de elevación en montaña</Table.Td><Table.Td style={{ borderBottom: 'none' }} ta="right" c="dimmed" fw={800} fz="md">${(estimacion.breakdown.combustibleDetalle.extraElevacion * configPrecios.gasoil).toFixed(2)}</Table.Td></Table.Tr>
                                                                )}
                                                            </>
                                                        )}

                                                        {/* 2. NÓMINA */}
                                                        <Table.Tr onClick={() => toggleSection('nomina')} style={{ cursor: 'pointer' }} bg={expandedSections.nomina ? "gray.1" : undefined}>
                                                            <Table.Td fw={900} c="dark.8" fz="lg"><Text span mr={8} c="yellow.6">{expandedSections.nomina ? '▼' : '▶'}</Text> 👷 Nómina de Ruta</Table.Td>
                                                            <Table.Td><Badge color="blue.8" radius="sm" size="lg">RRHH</Badge></Table.Td>
                                                            <Table.Td fw={900} ta="right" fz="xl" c="dark.9">${estimacion.breakdown.nomina.toFixed(2)}</Table.Td>
                                                        </Table.Tr>
                                                        {expandedSections.nomina && estimacion?.breakdown?.nominaDetalle && (
                                                            <>
                                                                <Table.Tr><Table.Td pl={60} c="dimmed" style={{ borderBottom: 'none' }} colSpan={2} fz="md">↳ 👨‍✈️ Chofer Principal (Base mes: ${estimacion.breakdown.nominaDetalle.sueldoBaseChofer})</Table.Td><Table.Td style={{ borderBottom: 'none' }} ta="right" c="dimmed" fw={800} fz="md">${estimacion.breakdown.nominaDetalle.pagoChoferRuta.toFixed(2)}</Table.Td></Table.Tr>
                                                                {estimacion.breakdown.nominaDetalle.pagoAyudanteRuta > 0 && (
                                                                    <Table.Tr><Table.Td pl={60} c="dimmed" style={{ borderBottom: 'none' }} colSpan={2} fz="md">↳ 🧑‍🔧 Ayudante de Carga (Base mes: ${estimacion.breakdown.nominaDetalle.sueldoBaseAyudante})</Table.Td><Table.Td style={{ borderBottom: 'none' }} ta="right" c="dimmed" fw={800} fz="md">${estimacion.breakdown.nominaDetalle.pagoAyudanteRuta.toFixed(2)}</Table.Td></Table.Tr>
                                                                )}
                                                            </>
                                                        )}

                                                        {/* 🔥 RIESGO 🔥 */}
                                                        {estimacion?.breakdown?.riesgo > 0 && (
                                                            <>
                                                                <Table.Tr onClick={() => toggleSection('riesgo')} style={{ cursor: 'pointer' }} bg={expandedSections.riesgo ? "red.0" : undefined}>
                                                                    <Table.Td fw={900} c="red.8" fz="lg"><Text span mr={8}>{expandedSections.riesgo ? '▼' : '▶'}</Text> ⚠️ Prima de Riesgo Dinámica ({estimacion.breakdown.riesgoDetalle.porcentajeAplicado}%)</Table.Td>
                                                                    <Table.Td><Badge color="red.7" radius="sm" size="lg">Peligrosidad</Badge></Table.Td>
                                                                    <Table.Td fw={900} ta="right" c="red.8" fz="xl">${estimacion.breakdown.riesgo.toFixed(2)}</Table.Td>
                                                                </Table.Tr>

                                                                {expandedSections.riesgo && (
                                                                    <>
                                                                        <Table.Tr>
                                                                            <Table.Td pl={60} c="dark.7" style={{ fontSize: '1rem', borderBottom: 'none', paddingBottom: 6, paddingTop: 16 }} colSpan={3}>
                                                                                <Text span fw={900}>Fórmula de Riesgo Escalable:</Text> {estimacion.breakdown.riesgoDetalle.porcentajeBase}% cuota fija + {estimacion.breakdown.riesgoDetalle.porcentajeVariable}% escalar por peso ({estimacion.breakdown.riesgoDetalle.tonelajeAplicado}t movilizadas)
                                                                            </Table.Td>
                                                                        </Table.Tr>
                                                                        <Table.Tr>
                                                                            <Table.Td colSpan={3} style={{ borderBottom: 'none', paddingBottom: '20px', paddingTop: '10px', paddingLeft: '60px', paddingRight: '60px' }}>
                                                                                <Alert variant="filled" color="dark.8" radius="sm" title={<Text c="yellow.5" fw={900} size="md">Nota Estratégica para Gerencia</Text>} icon={<IconAlertTriangle size={24} color="#fab005" />} style={{ borderLeft: '6px solid #fab005' }}>
                                                                                    <Text size="md" c="gray.3" fw={500}>Este recargo no está diseñado para pagar un desastre de su bolsillo. Su objetivo es generar el flujo de caja necesario en <strong>cada viaje</strong> para financiar de forma prorrateada sus pólizas anuales (RCV/Carga/Ambiental), pagar el bono de peligrosidad al chofer y cubrir contingencias como el lavado profundo de la cisterna post-descarga.</Text>
                                                                                </Alert>
                                                                            </Table.Td>
                                                                        </Table.Tr>
                                                                        <Table.Tr><Table.Td pl={60} c="dimmed" style={{ borderBottom: 'none' }} colSpan={2} fz="md">↳ 👨‍🚒 Bono de Peligrosidad (Incentivo Chofer)</Table.Td><Table.Td style={{ borderBottom: 'none' }} ta="right" c="dimmed" fw={800} fz="md">${estimacion.breakdown.riesgoDetalle.bonoChofer.toFixed(2)}</Table.Td></Table.Tr>
                                                                        <Table.Tr><Table.Td pl={60} c="dimmed" style={{ borderBottom: 'none' }} colSpan={2} fz="md">↳ 🛡️ Cuota Proporcional Póliza Carga/Ambiental</Table.Td><Table.Td style={{ borderBottom: 'none' }} ta="right" c="dimmed" fw={800} fz="md">${estimacion.breakdown.riesgoDetalle.seguroViaje.toFixed(2)}</Table.Td></Table.Tr>
                                                                        <Table.Tr><Table.Td pl={60} c="dimmed" style={{ borderBottom: 'none' }} colSpan={2} fz="md">↳ 🚧 Fondo Guías/Escolta/Lavado de Tanque</Table.Td><Table.Td style={{ borderBottom: 'none' }} ta="right" c="dimmed" fw={800} fz="md">${estimacion.breakdown.riesgoDetalle.contingenciaOperativa.toFixed(2)}</Table.Td></Table.Tr>
                                                                        <Table.Tr><Table.Td pl={60} c="red.8" style={{ fontSize: '1rem', fontStyle: 'italic', fontWeight: 800 }} colSpan={3}>*Clasificación de Riesgo Asignada: {estimacion.breakdown.riesgoDetalle.descripcion}</Table.Td></Table.Tr>
                                                                    </>
                                                                )}
                                                            </>
                                                        )}

                                                        {/* 3. VIÁTICOS */}
                                                        <Table.Tr onClick={() => toggleSection('viaticos')} style={{ cursor: 'pointer' }} bg={expandedSections.viaticos ? "gray.1" : undefined}>
                                                            <Table.Td fw={900} c="dark.8" fz="lg"><Text span mr={8} c="yellow.6">{expandedSections.viaticos ? '▼' : '▶'}</Text> 🍔 Viáticos en Ruta</Table.Td>
                                                            <Table.Td><Badge color="indigo.7" radius="sm" size="lg">Operaciones</Badge></Table.Td>
                                                            <Table.Td fw={900} ta="right" fz="xl" c="dark.9">${estimacion.breakdown.viaticos.toFixed(2)}</Table.Td>
                                                        </Table.Tr>
                                                        {expandedSections.viaticos && estimacion?.breakdown?.viaticosDetalle && (
                                                            <>
                                                                <Table.Tr><Table.Td pl={60} c="dimmed" style={{ borderBottom: 'none' }} colSpan={2} fz="md">↳ 🍽️ Alimentación Completa (Desay/Almuerzo/Cena)</Table.Td><Table.Td style={{ borderBottom: 'none' }} ta="right" c="dimmed" fw={800} fz="md">${estimacion.breakdown.viaticosDetalle.alimentacion.toFixed(2)}</Table.Td></Table.Tr>
                                                                {estimacion.breakdown.viaticosDetalle.pernocta > 0 && (
                                                                    <Table.Tr><Table.Td pl={60} c="dimmed" style={{ borderBottom: 'none' }} colSpan={2} fz="md">↳ 🛌 Pernocta / Estancia nocturna en Hotel</Table.Td><Table.Td style={{ borderBottom: 'none' }} ta="right" c="dimmed" fw={800} fz="md">${estimacion.breakdown.viaticosDetalle.pernocta.toFixed(2)}</Table.Td></Table.Tr>
                                                                )}
                                                            </>
                                                        )}

                                                        {/* 4. PEAJES */}
                                                        <Table.Tr>
                                                            <Table.Td fw={900} c="dark.8" fz="lg"><Text span mr={8} c="transparent">▶</Text> 🚧 Peajes y Vialidad</Table.Td>
                                                            <Table.Td><Badge color="cyan.7" radius="sm" size="lg">Impuestos</Badge></Table.Td>
                                                            <Table.Td fw={900} ta="right" fz="xl" c="dark.9">${estimacion.breakdown.peajes.toFixed(2)}</Table.Td>
                                                        </Table.Tr>

                                                        {/* OVERHEAD (ABC) */}
                                                        <Table.Tr bg="gray.2">
                                                            <Table.Td pl={60} c="dark.8" style={{ fontSize: '1rem', fontWeight: 900 }}>
                                                                <Group gap="xs">
                                                                    ↳ 🏢 Base Prorrateo Fijo ABC ({Number(configGlobal.horasTotalesFlota || 0).toLocaleString()} hrs/año)
                                                                    <Tooltip multiline w={350} withArrow position="top-start" label="Gastos fijos administrativos de la empresa divididos entre las horas reales operativas. Los equipos apagados en patio no diluyen este costo.">
                                                                        <IconInfoCircle size={20} color="#fab005" style={{ cursor: 'help' }} />
                                                                    </Tooltip>
                                                                </Group>
                                                            </Table.Td>
                                                            <Table.Td></Table.Td>
                                                            <Table.Td ta="right" style={{ fontSize: '1.2rem' }} fw={900} c="dark.6">
                                                                <Tooltip withArrow position="top-end" label="Costo Overhead Administrativo Global ÷ Horas Flota Activas">
                                                                    <span style={{ cursor: 'help', borderBottom: '2px dashed #ced4da' }}>${Number(configGlobal.costoAdministrativoPorHora).toFixed(2)} / hr</span>
                                                                </Tooltip>
                                                            </Table.Td>
                                                        </Table.Tr>

                                                        {/* 6. MANTENIMIENTO */}
                                                        <Table.Tr onClick={() => toggleSection('mantenimiento')} style={{ cursor: 'pointer' }} bg={expandedSections.mantenimiento ? "gray.1" : undefined}>
                                                            <Table.Td fw={900} c="dark.8" fz="lg"><Text span mr={8} c="yellow.6">{expandedSections.mantenimiento ? '▼' : '▶'}</Text> 🔧 Reserva Mantenimiento Dinámico</Table.Td>
                                                            <Table.Td><Badge color="orange.7" radius="sm" size="lg">Taller</Badge></Table.Td>
                                                            <Table.Td fw={900} ta="right" fz="xl" c="dark.9">${estimacion.breakdown.mantenimiento.toFixed(2)}</Table.Td>
                                                        </Table.Tr>
                                                        {expandedSections.mantenimiento && estimacion.breakdown.itemsDetallados?.map((item, index) => (
                                                            <Table.Tr key={index}>
                                                                <Table.Td pl={60} c="dimmed" style={{ borderBottom: 'none' }} fw={700} fz="md">↳ {item.descripcion}</Table.Td>
                                                                <Table.Td style={{ borderBottom: 'none' }}><Badge color={item.tipo === 'Rodamiento' ? 'orange.8' : 'gray.6'} variant="outline" radius="sm" size="md">{item.tipo}</Badge></Table.Td>
                                                                <Table.Td style={{ borderBottom: 'none' }} ta="right" c="dimmed" fw={800} fz="md">${item.monto.toFixed(2)}</Table.Td>
                                                            </Table.Tr>
                                                        ))}

                                                        {/* 7. POSESIÓN */}
                                                        <Table.Tr onClick={() => toggleSection('posesion')} style={{ cursor: 'pointer' }} bg={expandedSections.posesion ? "gray.1" : undefined}>
                                                            <Table.Td fw={900} c="dark.8" fz="lg"><Text span mr={8} c="yellow.6">{expandedSections.posesion ? '▼' : '▶'}</Text> 📈 Costo Posesión y Capital</Table.Td>
                                                            <Table.Td><Badge color="teal.7" radius="sm" size="lg">Financiero</Badge></Table.Td>
                                                            <Table.Td fw={900} ta="right" fz="xl" c="dark.9">${estimacion.breakdown.posesion.toFixed(2)}</Table.Td>
                                                        </Table.Tr>
                                                        {expandedSections.posesion && estimacion?.breakdown?.posesionDetalle && (
                                                            <>
                                                                <Table.Tr><Table.Td pl={60} c="dimmed" style={{ borderBottom: 'none' }} colSpan={2} fz="md">↳ 🔻 Depreciación por Desgaste de Activo</Table.Td><Table.Td style={{ borderBottom: 'none' }} ta="right" c="dimmed" fw={800} fz="md">${estimacion.breakdown.posesionDetalle.depreciacion.toFixed(2)}</Table.Td></Table.Tr>
                                                                <Table.Tr><Table.Td pl={60} c="dimmed" style={{ borderBottom: 'none' }} colSpan={2} fz="md">↳ 📈 Costo de Oportunidad Financiera</Table.Td><Table.Td style={{ borderBottom: 'none' }} ta="right" c="dimmed" fw={800} fz="md">${estimacion.breakdown.posesionDetalle.oportunidad.toFixed(2)}</Table.Td></Table.Tr>
                                                            </>
                                                        )}
                                                    </Table.Tbody>

                                                    <Table.Tfoot>
                                                        <Table.Tr bg="dark.8">
                                                            <Table.Th colSpan={2} ta="right" fz="xl" c="white" tt="uppercase" style={{ letterSpacing: '1px' }}>COSTO OPERATIVO BASE (Break-Even):</Table.Th>
                                                            <Table.Th ta="right" fz="xl" c="yellow.5" style={{ fontSize: '2.5rem' }}>${estimacion.costoTotal.toFixed(2)}</Table.Th>
                                                        </Table.Tr>
                                                    </Table.Tfoot>
                                                </Table>
                                            </Box>
                                        </Accordion.Panel>
                                    </Accordion.Item>
                                </Accordion>

                                <Grid align="center" gutter="xl">
                                    <Grid.Col span={{ base: 12, md: 5 }}>
                                        <Paper withBorder p="xl" radius="md" h="100%" shadow="sm" bg="white" style={{ borderTop: '8px solid #2f9e44' }}>
                                            <Text fw={900} c="dark.8" size="xl" tt="uppercase" mb="xl">Control de Rentabilidad</Text>
                                            <Stack gap="xl">
                                                <Box>
                                                    <Group justify="space-between" mb="xs">
                                                        <Text size="lg" fw={900} c="dark.7">Margen de Ganancia Comercial</Text>
                                                        <Badge color="green.7" size="xl" radius="sm" variant="filled" style={{ fontSize: '1.2rem', padding: '16px 12px' }}>{valorVisualMargen}%</Badge>
                                                    </Group>
                                                    <Slider
                                                        color="green.6" size="xl"
                                                        value={valorVisualMargen} onChange={setValorVisualMargen}
                                                        onChangeEnd={(val) => form.setFieldValue("margenGanancia", val)}
                                                        step={1} min={0} max={100}
                                                        marks={[{ value: 0, label: <Text fw={800}>0%</Text> }, { value: 100, label: <Text fw={800}>100%</Text> }]}
                                                    />
                                                </Box>
                                                <Box mt="xl">
                                                    <Group justify="space-between" mb="xs">
                                                        <Text size="lg" fw={900} c="dark.7">Calidad Repuestos Asignada</Text>
                                                        <Badge variant="filled" color="dark.5" size="xl" radius="sm">{valorVisualRepuestos}%</Badge>
                                                    </Group>
                                                    <Slider
                                                        color="dark.4" size="lg"
                                                        value={valorVisualRepuestos} onChange={setValorVisualRepuestos}
                                                        onChangeEnd={(val) => form.setFieldValue("calidadRepuestos", val)}
                                                        step={10} marks={[{ value: 0, label: <Text fw={700}>Económico</Text> }, { value: 100, label: <Text fw={700}>Original</Text> }]}
                                                    />
                                                </Box>
                                            </Stack>
                                        </Paper>
                                    </Grid.Col>

                                    <Grid.Col span={{ base: 12, md: 7 }}>
                                        <Paper withBorder p="xl" radius="md" bg="white" shadow="md" style={{ borderLeft: '12px solid #fab005' }}>
                                            <Stack gap="lg">
                                                <Group justify="space-between" style={{ borderBottom: '2px dashed #adb5bd', paddingBottom: '16px' }}>
                                                    <Text size="xl" fw={900} c="dark.6" tt="uppercase">Costo Operativo (Break-Even):</Text>
                                                    <Text size="xl" fw={900} c="dark.9" style={{ fontSize: '2rem' }}>${estimacion.costoTotal.toFixed(2)}</Text>
                                                </Group>
                                                <Group justify="space-between" style={{ borderBottom: '2px dashed #adb5bd', paddingBottom: '16px' }}>
                                                    <Text size="xl" fw={900} c="green.8" tt="uppercase">+ Ganancia Comercial Esperada:</Text>
                                                    <Text size="xl" fw={900} c="green.8" style={{ fontSize: '2rem' }}>${estimacion.gananciaBase.toFixed(2)}</Text>
                                                </Group>
                                                {estimacion.ajusteTarifaMinima > 0 && (
                                                    <Group justify="space-between" style={{ borderBottom: '2px dashed #adb5bd', paddingBottom: '16px' }}>
                                                        <Text size="xl" fw={900} c="orange.7" tt="uppercase">+ Ajuste Tarifa Mínima de Salida:</Text>
                                                        <Text size="xl" fw={900} c="orange.7" style={{ fontSize: '2rem' }}>${estimacion.ajusteTarifaMinima.toFixed(2)}</Text>
                                                    </Group>
                                                )}

                                                <Box ta="right" mt="xl">
                                                    <Text size="xl" tt="uppercase" fw={900} c="dark.4" mb={8} style={{ letterSpacing: '2px' }}>Tarifa Final Sugerida al Cliente</Text>
                                                    <Text style={{ fontSize: '5.5rem', lineHeight: '1' }} fw={900} c="dark.9">
                                                        ${estimacion.precioSugerido.toFixed(2)}
                                                    </Text>
                                                    <Group justify="flex-end" mt="lg">
                                                        {estimacion?.infoTarifa?.esMinima ? (
                                                            <Badge color="orange.6" size="xl" radius="sm" variant="filled" style={{ padding: '20px 16px', fontSize: '1.2rem' }}>TARIFA MÍNIMA APLICADA</Badge>
                                                        ) : (
                                                            <Badge color="green.7" size="xl" radius="sm" variant="filled" style={{ padding: '20px 16px', fontSize: '1.2rem' }}>TARIFA RENTABLE GARANTIZADA</Badge>
                                                        )}
                                                    </Group>
                                                </Box>
                                            </Stack>
                                        </Paper>
                                    </Grid.Col>
                                </Grid>
                            </Stack>
                        )}
                    </Paper>

                    <Box px="xl" pb="xl">
                        <Button
                            fullWidth
                            radius="md"
                            type="submit"
                            loading={submitting}
                            leftSection={<IconSteeringWheel size={36} />}
                            color="yellow.6"
                            c="dark.9"
                            style={{ height: '100px', fontSize: '1.8rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', boxShadow: '0 12px 24px rgba(0,0,0,0.25)' }}
                        >
                            Guardar Flete e Iniciar Operación
                        </Button>
                    </Box>
                </Stack>
            </Box>
        </form>
    );
}