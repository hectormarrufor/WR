"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
    TextInput, NumberInput, Button, Paper, Title, Center,
    SimpleGrid, Box, Divider, Grid, Text, Loader, Group, Badge, Select, Tooltip, Alert, Slider,
    Accordion,
    Table,
    Timeline,
    Switch,
    Stack
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { IconCalculator, IconCoin, IconTruck, IconRoute, IconInfoCircle, IconMapPin, IconChartLine } from "@tabler/icons-react";
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

    // Añade esto en la parte superior de tu componente
    const [expandedSections, setExpandedSections] = useState({
        gasoil: false,
        nomina: false,
        viaticos: false,
        posesion: false,
        overhead: false,
        mantenimiento: false,
    });

    const toggleSection = (section) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const form = useForm({
        initialValues: {
            clienteId: "",
            fechaSalida: new Date(),
            nroFlete: "",
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
            margenGanancia: 30, // 🔥 NUEVO: Porcentaje de ganancia por defecto
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
                const [resEmp, resAct, resPrecios, resBcv, resConfig] = await Promise.all([
                    fetch(`/api/rrhh/empleados`).then((r) => r.json()),
                    fetch(`/api/gestionMantenimiento/activos`).then((r) => r.json()),
                    fetch(`/api/configuracion/precios`).then((r) => r.json()),
                    fetch(`/api/bcv`).then((r) => r.json()),
                    fetch(`/api/configuracion/general`).then((r) => r.json()),
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
                setLoading(false);
            } catch (error) {
                notifications.show({ title: "Error", message: "No se pudieron cargar los datos", color: "red" });
                setLoading(false);
            }
        };
        cargarDatos();
    }, []);

    // 🔥 EL MAPEO LIMPIO: Pasamos raw para que el Grid extraiga los costos puros
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
                raw: v // Esto permite extraer 'costoPosesionHora' y 'costoMantenimientoTeorico' en el grid
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
            form.values.margenGanancia // 🔥 GATILLO NUEVO: Recalcula al mover el slider
        ],
        queryFn: async () => {
            if (!form.values.activoPrincipalId || !rutaData?.distanciaTotal || !configGlobal) return null;

            const choferObj = empleados.find(e => e.id === form.values.choferId);
            const ayudanteObj = empleados.find(e => e.id === form.values.ayudanteId);

            // 🔥 1. Ajustamos para leer los sueldos DIARIOS de la Configuración Global
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

                    // 🔥 2. ENVIAMOS LOS SUELDOS DIARIOS CORRECTOS
                    sueldoDiarioChofer: sueldoChofer,
                    sueldoDiarioAyudante: sueldoAyudante,

                    // 🔥 3. ENVIAMOS VIÁTICOS
                    viaticoAlimentacionDia: parseFloat(configGlobal.viaticoAlimentacionDia || 15),
                    viaticoHotelNoche: parseFloat(configGlobal.viaticoHotelNoche || 20),
                    
                  // 🔥 4. ENVIAMOS TODAS LAS VARIABLES DEL COSTEO PONDERADO ABC
                    valorFlotaTotal: parseFloat(configGlobal.valorFlotaTotal || 1),
                    gastosFijosAnualesTotales: parseFloat(configGlobal.gastosFijosAnualesTotales || 0),
                    horasTotalesFlota: parseInt(configGlobal.horasTotalesFlota || 1),
                    costoAdministrativoPorHora: parseFloat(configGlobal.costoAdministrativoPorHora || 0),
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

    const capacidadMaxDynamic = estimacion?.breakdown?.auditoriaPesos?.capacidad?.valor || 40;
    const taraChutoCalc = estimacion?.breakdown?.auditoriaPesos?.chuto?.valor || 0;
    const taraRemolqueCalc = estimacion?.breakdown?.auditoriaPesos?.remolque?.valor || 0;
    const taraBase = taraChutoCalc + taraRemolqueCalc;

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

                        <Divider label="Recursos Humanos y gastos extra" labelPosition="center" />
                        <TextInput
                            type="time"
                            label="Hora de Salida"
                            description="Inicio de la ruta"
                            {...form.getInputProps("horaSalida")}
                        />
                        <NumberInput
                            label="Jornada Máxima (Hrs)"
                            description="Conducción al día"
                            min={4} max={24}
                            {...form.getInputProps("jornadaMaxima")}
                        />
                        <Switch
                            label="¿Cubrir comida el 1er día?"
                            description="Asigna viático corporativo al salir"
                            mt="md"
                            color="blue"
                            checked={form.values.comidaPrimerDia}
                            onChange={(event) => form.setFieldValue("comidaPrimerDia", event.currentTarget.checked)}
                        />
                        <NumberInput
                            label="Viáticos Manuales ($)"
                            description="Si no hay hotel (Cena, extras)"
                            min={0}
                            leftSection={<IconCoin size={16} />}
                            {...form.getInputProps("viaticosManuales")}

                        />
                        <NumberInput
                            label="Cantidad de Peajes"
                            description="Nro de casetas de cobro en ruta"
                            placeholder="Ej: 4"
                            min={0}
                            leftSection={<IconMapPin size={16} />}
                            {...form.getInputProps("cantidadPeajes")}
                        />
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
                            showMetrics
                        />
                        <ODTSelectableGrid
                            label="Remolque / Batea"
                            data={activosMapeados.filter((a) => a.tipo === "Remolque")}
                            onChange={(val) => form.setFieldValue("remolqueId", val)}
                            value={form.values.remolqueId}
                            showMetrics
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
                                        <Text size="xs" fw={600}>Tara del Equipo (Vacío):</Text>
                                        <Box ta="right">
                                            <Text size="xs" c="dimmed">
                                                Chuto: {(Number(taraChutoCalc) || 0).toFixed(1)}t | Batea: {(Number(taraRemolqueCalc) || 0).toFixed(1)}t
                                            </Text>
                                            <Group gap={5} justify="flex-end">
                                                <Text size="sm" fw={800} c="blue.9">
                                                    Total: {(Number(taraBase) || 0).toFixed(1)}t
                                                </Text>
                                                <Badge color={taraBase > 0 ? 'green' : 'gray'} variant="light" size="xs" style={{ textTransform: 'none' }}>
                                                    {taraBase > 0 ? 'Calculada' : 'N/D'}
                                                </Badge>
                                            </Group>
                                        </Box>
                                    </Group>

                                    <Group justify="space-between" mt={4}>
                                        <Text size="xs" fw={600}>Vel. Promedio (Normalizada):</Text>
                                        <Group gap={5}>
                                            <Text size="xs" fw={700} c="orange.9">{estimacion.breakdown.rutinaViaje.velocidadPromedioReal} Km/h</Text>
                                            <Badge color="orange" variant="light" size="xs" style={{ textTransform: 'none' }}>Física Real</Badge>
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
                                                        Peso Bruto a mover: <Text span c="blue.9" fw={800}>{((Number(taraBase) || 0) + (Number(tramo.tonelaje) || 0)).toFixed(1)}t</Text>
                                                    </Text>
                                                </Group>

                                                <Group justify="space-between" align="flex-end" mb="sm">
                                                    <Box style={{ flex: 1, marginRight: '15px' }}>
                                                        <Text size="xs" fw={500} mb={5}>Peso de la carga:</Text>
                                                        <Slider
                                                            // Permitimos que el slider sea autónomo en su movimiento
                                                            defaultValue={tramo.tonelaje}
                                                            // Solo actualizamos el formulario (y por ende el cálculo) al soltar
                                                            onChangeEnd={(val) => form.setFieldValue(`tramos.${index}.tonelaje`, val)}
                                                            step={0.5}
                                                            min={0}
                                                            max={capacidadMaxDynamic}
                                                            label={(val) => `${val}t`} // Muestra el peso mientras arrastras
                                                            marks={[
                                                                { value: 0, label: 'Vacío' },
                                                                { value: Math.round(capacidadMaxDynamic), label: 'Full' }
                                                            ]}
                                                        />
                                                    </Box>
                                                    <NumberInput
                                                        label="Espera en parada (Hrs)"
                                                        size="xs" w={130} min={0} step={0.5}
                                                        value={tramo.tiempoEspera || 0}
                                                        onChange={(val) => form.setFieldValue(`tramos.${index}.tiempoEspera`, val)}
                                                    />
                                                </Group>
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

                        <GoogleRouteMap
                            onRouteCalculated={handleRouteCalculated}
                            tramosFormulario={form.values.tramos}
                            taraBase={taraBase}
                            capacidadMax={capacidadMaxDynamic}
                            vehiculoAsignado={!!form.values.activoPrincipalId}
                        />

                    </Paper>

                    {estimacion?.breakdown?.rutinaViaje && (
                        <SimpleGrid cols={3} mt="md">
                            <Paper withBorder p="xs" radius="md" ta="center">
                                <Text size="xs" c="dimmed" fw={600}>Tiempo en Movimiento</Text>
                                <Text fw={800} size="lg" c="blue.7">{estimacion.breakdown.rutinaViaje.horasConduccion} hrs</Text>
                                <Text size="xs" c="dimmed">+{estimacion.breakdown.rutinaViaje.horasEsperaTotales} hrs (Espera)</Text>
                            </Paper>
                            <Paper withBorder p="xs" radius="md" ta="center">
                                <Text size="xs" c="dimmed" fw={600}>Duración Total (Misión)</Text>
                                <Text fw={800} size="lg" c="orange.7">{estimacion.breakdown.rutinaViaje.tiempoMisionTotal} hrs</Text>
                                <Text size="xs" c="dimmed">Rodando + Descansos</Text>
                            </Paper>
                            <Paper withBorder p="xs" radius="md" ta="center" bg="teal.0">
                                <Text size="xs" c="teal.9" fw={700}>Llegada Estimada</Text>
                                <Text fw={800} size="sm" c="teal.9" mt={4}>
                                    {new Date(estimacion.breakdown.rutinaViaje.fechaLlegadaISO).toLocaleDateString('es-VE', { weekday: 'short', day: '2-digit', month: 'short' })}
                                </Text>
                                <Text fw={700} size="sm" c="teal.9">
                                    {new Date(estimacion.breakdown.rutinaViaje.fechaLlegadaISO).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                            </Paper>
                        </SimpleGrid>
                    )}

                    <Paper withBorder p="md" bg="blue.0" radius="md" mt="md">

                        <Group>
                            <IconCalculator size={24} color="#1c7ed6" />
                            <Title order={4}>Presupuesto Inteligente</Title>
                        </Group>

                        {/* EL ACORDEON DE DESGLOSE ABIERTO */}
                        {estimacion?.breakdown?.itemsDetallados && (
                            <Accordion variant="separated" radius="md" mt="xl" defaultValue="detalles">
                                <Accordion.Item value="detalles">
                                    <Accordion.Control icon={<IconInfoCircle size={20} color="teal" />}>
                                        <Text fw={700} c="dimmed">Ver Desglose Analítico</Text>
                                    </Accordion.Control>
                                    <Accordion.Panel>

                                        {/* --- CRONOGRAMA --- */}
                                        {estimacion?.breakdown?.itinerario && estimacion.breakdown.itinerario.length > 0 && (
                                            <Box mt="sm" mb="xl" p="sm" bg="gray.1" style={{ borderRadius: '8px' }}>
                                                <Text fw={700} mb="md" size="sm" c="blue.9"><IconRoute size={16} /> Cronograma Estimado de la Ruta</Text>
                                                <Timeline active={estimacion.breakdown.itinerario.length} bulletSize={16} lineWidth={2}>
                                                    {estimacion.breakdown.itinerario.map((evento, idx) => (
                                                        <Timeline.Item key={idx} title={`Día ${evento.dia}`} lineVariant={evento.tipo === 'descanso' ? 'dashed' : 'solid'} color={evento.tipo === 'descanso' ? 'orange' : 'blue'}>
                                                            <Text c="dimmed" size="xs">{evento.inicio} - {evento.fin}</Text>
                                                            <Text size="xs" fw={500}>{evento.accion}</Text>
                                                            {evento.detalleViatico && (
                                                                <Badge size="xs" color="green" variant="light" mt={4}>{evento.detalleViatico}</Badge>
                                                            )}
                                                        </Timeline.Item>
                                                    ))}
                                                </Timeline>
                                            </Box>
                                        )}

                                        {/* --- TABLA INTERACTIVA DE COSTOS --- */}
                                        <Box style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                            <Table highlightOnHover verticalSpacing="xs">
                                                <Table.Thead>
                                                    <Table.Tr>
                                                        <Table.Th>Concepto (Clic para expandir)</Table.Th>
                                                        <Table.Th>Tipo</Table.Th>
                                                        <Table.Th style={{ textAlign: 'right' }}>Costo</Table.Th>
                                                    </Table.Tr>
                                                </Table.Thead>
                                                <Table.Tbody>

                                                    {/* 1. GASOIL */}
                                                    <Table.Tr
                                                        onClick={() => toggleSection('gasoil')}
                                                        style={{ cursor: 'pointer', transition: 'background-color 0.2s' }}
                                                        bg={expandedSections.gasoil ? "blue.0" : undefined}
                                                    >
                                                        <Table.Td fw={700}>
                                                            <Text span mr={5} c="dimmed">{expandedSections.gasoil ? '▼' : '▶'}</Text>
                                                            ⛽ Gasoil Total ({estimacion.breakdown.litros.toFixed(0)} Lts)
                                                        </Table.Td>
                                                        <Table.Td><Badge color="blue" size="xs">Combustible</Badge></Table.Td>
                                                        <Table.Td fw={700} ta="right">${estimacion.breakdown.combustible.toFixed(2)}</Table.Td>
                                                    </Table.Tr>
                                                    {expandedSections.gasoil && estimacion?.breakdown?.combustibleDetalle && (
                                                        <>
                                                            <Table.Tr>
                                                                <Table.Td pl="xl" c="dimmed" style={{ fontSize: '0.8rem', borderBottom: 'none', paddingBottom: 2 }} colSpan={2}>
                                                                    ↳ 🛣️ Por distancia plana ({estimacion.breakdown.combustibleDetalle.baseDistancia.toFixed(0)} Lts)
                                                                </Table.Td>
                                                                <Table.Td style={{ borderBottom: 'none' }}></Table.Td>
                                                            </Table.Tr>
                                                            <Table.Tr>
                                                                <Table.Td pl="xl" c="dimmed" style={{ fontSize: '0.8rem', borderBottom: 'none', paddingBottom: 2 }} colSpan={2}>
                                                                    ↳ ⚖️ Por tonelaje remolcado (+{estimacion.breakdown.combustibleDetalle.extraPeso.toFixed(0)} Lts)
                                                                </Table.Td>
                                                                <Table.Td style={{ borderBottom: 'none' }}></Table.Td>
                                                            </Table.Tr>
                                                            {estimacion.breakdown.combustibleDetalle.extraElevacion > 0 && (
                                                                <Table.Tr>
                                                                    <Table.Td pl="xl" c="dimmed" style={{ fontSize: '0.8rem' }} colSpan={2}>
                                                                        ↳ ⛰️ Por esfuerzo en montaña (+{estimacion.breakdown.combustibleDetalle.extraElevacion.toFixed(0)} Lts)
                                                                    </Table.Td>
                                                                    <Table.Td></Table.Td>
                                                                </Table.Tr>
                                                            )}
                                                        </>
                                                    )}

                                                    {/* 2. NÓMINA */}
                                                    <Table.Tr
                                                        onClick={() => toggleSection('nomina')}
                                                        style={{ cursor: 'pointer', transition: 'background-color 0.2s' }}
                                                        bg={expandedSections.nomina ? "blue.0" : undefined}
                                                    >
                                                        <Table.Td fw={700}>
                                                            <Text span mr={5} c="dimmed">{expandedSections.nomina ? '▼' : '▶'}</Text>
                                                            👷 Nómina Operativa
                                                        </Table.Td>
                                                        <Table.Td><Badge color="blue" size="xs">RRHH</Badge></Table.Td>
                                                        <Table.Td fw={700} ta="right">${estimacion.breakdown.nomina.toFixed(2)}</Table.Td>
                                                    </Table.Tr>
                                                    {expandedSections.nomina && estimacion?.breakdown?.nominaDetalle && (
                                                        <>
                                                            <Table.Tr>
                                                                <Table.Td pl="xl" c="dimmed" style={{ fontSize: '0.8rem', borderBottom: 'none', paddingBottom: 2 }}>
                                                                    ↳ 👨‍✈️ Chofer (Base Ref: ${estimacion.breakdown.nominaDetalle.sueldoBaseChofer}/mes)
                                                                </Table.Td>
                                                                <Table.Td style={{ borderBottom: 'none' }}></Table.Td>
                                                                <Table.Td style={{ borderBottom: 'none', fontSize: '0.8rem' }} ta="right" c="dimmed">
                                                                    ${estimacion.breakdown.nominaDetalle.pagoChoferRuta.toFixed(2)}
                                                                </Table.Td>
                                                            </Table.Tr>
                                                            {estimacion.breakdown.nominaDetalle.pagoAyudanteRuta > 0 && (
                                                                <Table.Tr>
                                                                    <Table.Td pl="xl" c="dimmed" style={{ fontSize: '0.8rem' }}>
                                                                        ↳ 🧑‍🔧 Ayudante (Base Ref: ${estimacion.breakdown.nominaDetalle.sueldoBaseAyudante}/mes)
                                                                    </Table.Td>
                                                                    <Table.Td></Table.Td>
                                                                    <Table.Td style={{ fontSize: '0.8rem' }} ta="right" c="dimmed">
                                                                        ${estimacion.breakdown.nominaDetalle.pagoAyudanteRuta.toFixed(2)}
                                                                </Table.Td>
                                                                </Table.Tr>
                                                            )}
                                                        </>
                                                    )}

                                                    {/* 3. VIÁTICOS */}
                                                    <Table.Tr
                                                        onClick={() => toggleSection('viaticos')}
                                                        style={{ cursor: 'pointer', transition: 'background-color 0.2s' }}
                                                        bg={expandedSections.viaticos ? "blue.0" : undefined}
                                                    >
                                                        <Table.Td fw={700}>
                                                            <Text span mr={5} c="dimmed">{expandedSections.viaticos ? '▼' : '▶'}</Text>
                                                            🍔 Viáticos en Ruta
                                                        </Table.Td>
                                                        <Table.Td><Badge color="blue" size="xs">Operaciones</Badge></Table.Td>
                                                        <Table.Td fw={700} ta="right">${estimacion.breakdown.viaticos.toFixed(2)}</Table.Td>
                                                    </Table.Tr>
                                                    {expandedSections.viaticos && estimacion?.breakdown?.viaticosDetalle && (
                                                        <>
                                                            <Table.Tr>
                                                                <Table.Td pl="xl" c="dimmed" style={{ fontSize: '0.8rem', borderBottom: 'none', paddingBottom: 2 }}>
                                                                    ↳ 🍽️ Alimentación (Desay/Almuerzo/Cena)
                                                                </Table.Td>
                                                                <Table.Td style={{ borderBottom: 'none' }}></Table.Td>
                                                                <Table.Td style={{ borderBottom: 'none', fontSize: '0.8rem' }} ta="right" c="dimmed">
                                                                    ${estimacion.breakdown.viaticosDetalle.alimentacion.toFixed(2)}
                                                                </Table.Td>
                                                            </Table.Tr>
                                                            {estimacion.breakdown.viaticosDetalle.pernocta > 0 && (
                                                                <Table.Tr>
                                                                    <Table.Td pl="xl" c="dimmed" style={{ fontSize: '0.8rem' }}>
                                                                        ↳ 🛌 Pernocta / Estancia nocturna
                                                                    </Table.Td>
                                                                    <Table.Td></Table.Td>
                                                                    <Table.Td style={{ fontSize: '0.8rem' }} ta="right" c="dimmed">
                                                                        ${estimacion.breakdown.viaticosDetalle.pernocta.toFixed(2)}
                                                                </Table.Td>
                                                                </Table.Tr>
                                                            )}
                                                        </>
                                                    )}

                                                    {/* 4. PEAJES */}
                                                    <Table.Tr>
                                                        <Table.Td fw={700}>
                                                            <Text span mr={5} c="transparent">▶</Text>
                                                            🚧 Peajes y Tasas
                                                        </Table.Td>
                                                        <Table.Td><Badge color="blue" size="xs">Vialidad</Badge></Table.Td>
                                                        <Table.Td fw={700} ta="right">${estimacion.breakdown.peajes.toFixed(2)}</Table.Td>
                                                    </Table.Tr>

                                                    {/* FILA DEL TOOLTIP EXPLICATIVO (NUEVO MODELO ABC) */}
                                                    <Table.Tr>
                                                        <Table.Td pl="xl" c="red.7" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                ↳ ⚠️ Base Prorrateo ABC ({Number(configGlobal.horasTotalesFlota || 0).toLocaleString()} hrs/año)
                                                                <Tooltip
                                                                    multiline
                                                                    w={280}
                                                                    withArrow
                                                                    position="top-start"
                                                                    label={`Los gastos fijos se están dividiendo entre las ${Number(configGlobal.horasTotalesFlota || 0).toLocaleString()} horas operativas reales de la flota activa. Los equipos ociosos (0 horas) no diluyen este costo, protegiendo tu rentabilidad.`}
                                                                >
                                                                    <IconInfoCircle size={14} style={{ cursor: 'help', color: 'gray' }} />
                                                                </Tooltip>
                                                            </div> 
                                                        </Table.Td>
                                                        <Table.Td></Table.Td>
                                                        <Table.Td ta="right" style={{ fontSize: '0.8rem' }} fw={700} c="violet.9">
                                                            <Tooltip
                                                                withArrow
                                                                position="top-end"
                                                                label="Fórmula: (Gastos Fijos de la Empresa) ÷ (Horas Totales Activas)"
                                                            >
                                                                <span style={{ cursor: 'help', borderBottom: '1px dashed #ced4da' }}>
                                                                    ${Number(configGlobal.costoAdministrativoPorHora).toFixed(2)} / hr
                                                                </span>
                                                            </Tooltip>
                                                        </Table.Td>
                                                    </Table.Tr>

                                                    {/* 6. MANTENIMIENTO */}
                                                    <Table.Tr
                                                        onClick={() => toggleSection('mantenimiento')}
                                                        style={{ cursor: 'pointer', transition: 'background-color 0.2s' }}
                                                        bg={expandedSections.mantenimiento ? "orange.0" : undefined}
                                                    >
                                                        <Table.Td fw={700}>
                                                            <Text span mr={5} c="dimmed">{expandedSections.mantenimiento ? '▼' : '▶'}</Text>
                                                            🔧 Reserva de Mantenimiento
                                                        </Table.Td>
                                                        <Table.Td><Badge color="orange" size="xs">Taller</Badge></Table.Td>
                                                        <Table.Td fw={700} ta="right">${estimacion.breakdown.mantenimiento.toFixed(2)}</Table.Td>
                                                    </Table.Tr>
                                                    {expandedSections.mantenimiento && estimacion.breakdown.itemsDetallados?.map((item, index) => (
                                                        <Table.Tr key={index}>
                                                            <Table.Td pl="xl" c="dimmed" style={{ fontSize: '0.8rem' }}>
                                                                ↳ {item.descripcion}
                                                            </Table.Td>
                                                            <Table.Td>
                                                                <Badge color={item.tipo === 'Rodamiento' ? 'orange' : 'gray'} variant="outline" size="xs" style={{ fontSize: '0.65rem' }}>
                                                                    {item.tipo === 'Rodamiento' ? 'Por Km' : 'Por Hora'}
                                                                </Badge>
                                                            </Table.Td>
                                                            <Table.Td ta="right" c="dimmed" style={{ fontSize: '0.8rem' }}>
                                                                ${item.monto.toFixed(2)}
                                                            </Table.Td>
                                                        </Table.Tr>
                                                    ))}

                                                    {/* 7. POSESIÓN */}
                                                    <Table.Tr
                                                        onClick={() => toggleSection('posesion')}
                                                        style={{ cursor: 'pointer', transition: 'background-color 0.2s' }}
                                                        bg={expandedSections.posesion ? "teal.0" : undefined}
                                                    >
                                                        <Table.Td fw={700}>
                                                            <Text span mr={5} c="dimmed">{expandedSections.posesion ? '▼' : '▶'}</Text>
                                                            📈 Costo de Posesión (Activos)
                                                        </Table.Td>
                                                        <Table.Td><Badge color="teal" size="xs">Capital</Badge></Table.Td>
                                                        <Table.Td fw={700} ta="right">${estimacion.breakdown.posesion.toFixed(2)}</Table.Td>
                                                    </Table.Tr>
                                                    {expandedSections.posesion && estimacion?.breakdown?.posesionDetalle && (
                                                        <>
                                                            <Table.Tr>
                                                                <Table.Td pl="xl" c="dimmed" style={{ fontSize: '0.8rem', borderBottom: 'none', paddingBottom: 2 }}>
                                                                    ↳ 🔻 Depreciación (Desgaste en el tiempo)
                                                                </Table.Td>
                                                                <Table.Td style={{ borderBottom: 'none' }}></Table.Td>
                                                                <Table.Td style={{ borderBottom: 'none', fontSize: '0.8rem' }} ta="right" c="dimmed">
                                                                    ${estimacion.breakdown.posesionDetalle.depreciacion.toFixed(2)}
                                                                </Table.Td>
                                                            </Table.Tr>
                                                            <Table.Tr>
                                                                <Table.Td pl="xl" c="dimmed" style={{ fontSize: '0.8rem', borderBottom: 'none', paddingBottom: 2 }}>
                                                                    ↳ 📈 Costo de Oportunidad (Capital)
                                                                </Table.Td>
                                                                <Table.Td style={{ borderBottom: 'none' }}></Table.Td>
                                                                <Table.Td style={{ borderBottom: 'none', fontSize: '0.8rem' }} ta="right" c="dimmed">
                                                                    ${estimacion.breakdown.posesionDetalle.oportunidad.toFixed(2)}
                                                                </Table.Td>
                                                            </Table.Tr>
                                                            <Table.Tr>
                                                                <Table.Td pl="xl" c="dimmed" style={{ fontSize: '0.75rem', fontStyle: 'italic' }} colSpan={3}>
                                                                    *Calculado sobre un valor de flota de ${estimacion.breakdown.posesionDetalle.valorActivo.toLocaleString()}
                                                                </Table.Td>
                                                            </Table.Tr>
                                                        </>
                                                    )}

                                                </Table.Tbody>

                                                {/* FOOTER TOTAL */}
                                                <Table.Tfoot>
                                                    <Table.Tr>
                                                        <Table.Th colSpan={2} ta="right">COSTO OPERATIVO BASE (Break-Even):</Table.Th>
                                                        <Table.Th ta="right" style={{ fontSize: '1.1rem' }} c="red.9">${estimacion.costoTotal.toFixed(2)}</Table.Th>
                                                    </Table.Tr>
                                                </Table.Tfoot>

                                            </Table>
                                        </Box>
                                    </Accordion.Panel>
                                </Accordion.Item>
                            </Accordion>
                        )}


                        {calcLoading ? (
                            <Center py="xl"><Loader /></Center>
                        ) : estimacion ? (
                            <Grid gutter="sm" align="center">
                                {/* --- CONTROLES ESTRATÉGICOS (SLIDERS) --- */}
                                <Grid.Col span={12}>
                                    <Paper withBorder pb="xl" mt={10} radius="md" shadow="xs" bg="green.0">
                                        <Group justify="space-between" mb="xs" px="md" pt="xs">
                                            <Text size="xs" fw={700} c="green.9">MARGEN GANANCIA</Text>
                                            <Badge color="green">{valorVisualMargen}%</Badge>
                                        </Group>
                                        <Box px="md">
                                            <Slider
                                                color="green"
                                                value={valorVisualMargen}
                                                onChange={setValorVisualMargen}
                                                onChangeEnd={(val) => form.setFieldValue("margenGanancia", val)}
                                                step={1} min={0} max={100}
                                                marks={[{ value: 0, label: '0%' }, { value: 100, label: '100%' }]}
                                            />
                                        </Box>
                                    </Paper>

                                    <Paper withBorder pb="xl" mt={10} radius="md" shadow="xs">
                                        <Group justify="space-between" mb="xs" px="md" pt="xs">
                                            <Text size="xs" fw={700} c="dimmed">CALIDAD REPUESTOS</Text>
                                            <Badge variant="light">{valorVisualRepuestos}%</Badge>
                                        </Group>
                                        <Box px="md">
                                            <Slider
                                                value={valorVisualRepuestos}
                                                onChange={setValorVisualRepuestos}
                                                onChangeEnd={(val) => form.setFieldValue("calidadRepuestos", val)}
                                                step={10}
                                                marks={[{ value: 0, label: 'Econ' }, { value: 100, label: 'Orig' }]}
                                            />
                                        </Box>
                                    </Paper>
                                </Grid.Col>

                                {/* --- RESUMEN FINAL DE RENTABILIDAD --- */}
                                <Grid.Col span={7} mt="md">
                                    <Text fw={700} size="md">Costo Operativo Base:</Text>
                                </Grid.Col>
                                <Grid.Col span={5} mt="md">
                                    <Text fw={700} ta="right" size="md" c="red.9">${estimacion.costoTotal.toFixed(2)}</Text>
                                </Grid.Col>

                                <Grid.Col span={12}>
                                    <Paper withBorder p="xs" radius="sm" bg="gray.0">
                                        <Stack gap={4}>
                                            <Group justify="space-between">
                                                <Text size="sm" fw={600} c="green.9">+ Ganancia Comercial ({form.values.margenGanancia}%):</Text>
                                                <Text size="sm" fw={700} c="green.9">${estimacion.gananciaBase.toFixed(2)}</Text>
                                            </Group>

                                            {/* AJUSTE TARIFA MÍNIMA (Solo visible si aplica) */}
                                            {estimacion.ajusteTarifaMinima > 0 && (
                                                <Group justify="space-between">
                                                    <Text size="sm" fw={600} c="orange.8">+ Ajuste de Salida Mínima:</Text>
                                                    <Text size="sm" fw={700} c="orange.8">${estimacion.ajusteTarifaMinima.toFixed(2)}</Text>
                                                </Group>
                                            )}
                                        </Stack>
                                    </Paper>
                                </Grid.Col>

                                <Grid.Col span={12}><Divider my="xs" variant="dashed" /></Grid.Col>

                                <Grid.Col span={7}>
                                    <Tooltip
                                        label={estimacion?.infoTarifa?.esMinima ? "Se aplicó tarifa plana por distancia corta." : "Total calculado: Costo + Margen."}
                                        position="top-start" withArrow
                                    >
                                        <Box>
                                            <Text size="xl" fw={900} c="blue.9" style={{ cursor: 'help', borderBottom: '2px dotted #1c7ed6', display: 'inline-block' }}>
                                                TARIFA A COTIZAR:
                                            </Text>
                                            {estimacion?.infoTarifa?.esMinima && (
                                                <Badge color="orange" size="xs" ml="sm">TARIFA MÍNIMA</Badge>
                                            )}
                                        </Box>
                                    </Tooltip>
                                </Grid.Col>
                                <Grid.Col span={5}>
                                    <Text size="xl" fw={900} ta="right" c="blue.9">
                                        ${estimacion.precioSugerido.toFixed(2)}
                                    </Text>
                                </Grid.Col>
                            </Grid>
                        ) : (
                            <Box py="xl"><Text c="dimmed" ta="center">Traza la ruta para calcular el presupuesto.</Text></Box>
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