"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
    TextInput,
    NumberInput,
    Button,
    Paper,
    Title,
    Center,
    SimpleGrid,
    Box,
    Divider,
    Grid,
    Text,
    Loader,
    Group,
    Badge,
    Select,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { IconMapPin, IconCalculator, IconCoin, IconTruck } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

// Componentes importados
import GoogleRouteMap from "./GoogleRouteMap";
import ODTSelectableGrid from "../../odt/ODTSelectableGrid";
import { SelectClienteConCreacion } from "../../contratos/SelectClienteConCreacion";

// Función de cálculo mejorada (puedes moverla a lib/calcularCostoFlete.js)

export default function FleteCreator() {
    const router = useRouter();
    const { nombre, apellido, userId } = useAuth();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [empleados, setEmpleados] = useState([]);
    const [activos, setActivos] = useState([]);
    const [configPrecios, setConfigPrecios] = useState({ peaje: 5, gasoil: 0.8 }); // defaults realistas
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
            destino: "",
            distanciaKm: 0,
            coordenadasDestino: null,

            cantidadPeajes: 0,
            observaciones: "",

            // Nuevos para cálculo sólido
            tonelaje: 0,
            tipoCarga: "general",
        },
        validate: {
            clienteId: (val) => (val ? null : "Seleccione un cliente"),
            fechaSalida: (val) => (val ? null : "Fecha requerida"),
            choferId: (val) => (val ? null : "Debe asignar un chofer"),
            activoPrincipalId: (val) => (val ? null : "Debe asignar un vehículo principal"),
            distanciaKm: (val) => (val > 0 ? null : "Debe seleccionar un destino en el mapa"),
        },
    });

    // Fetch datos maestros
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
                setBcv(resBcv.precio);

                if (resPrecios) {
                    setConfigPrecios({
                        peaje: parseFloat(resPrecios.peaje5ejes || 5),
                        gasoil: parseFloat(resPrecios.gasoil || 0.8), // ajusta según subsidio/internacional
                    });
                }

                setLoading(false);
            } catch (error) {
                console.error(error);
                notifications.show({ title: "Error", message: "No se pudieron cargar los datos", color: "red" });
                setLoading(false);
            }
        };
        cargarDatos();
    }, []);

    const activosMapeados = useMemo(() => {
        return activos.map((v) => {
            let nombreDisplay = v.codigoInterno;
            let placa = "";
            let tipo = v.tipoActivo;
            let tarifa = parseFloat(v.tarifaPorKm || 0);

            if (v.vehiculoInstancia) {
                nombreDisplay = `${v.vehiculoInstancia.plantilla.marca} ${v.vehiculoInstancia.plantilla.modelo}`;
                placa = v.vehiculoInstancia.placa;
            } else if (v.remolqueInstancia) {
                nombreDisplay = `${v.remolqueInstancia.plantilla.marca} ${v.remolqueInstancia.plantilla.modelo}`;
                placa = v.remolqueInstancia.placa;
            }

            return {
                id: v.id,
                nombre: `${nombreDisplay} (${placa})`,
                subtitulo: `Tarifa: $${tarifa}/km`,
                imagen: v.imagen,
                tipo: tipo,
                tarifa,
            };
        });
    }, [activos]);

    // Cálculo automático con React Query
    const { data: estimacion, isLoading: calcLoading } = useQuery({
        queryKey: [
            "calcular-flete",
            form.values.activoPrincipalId,
            rutaData?.distanciaTotal,
            form.values.tonelaje,
            form.values.tipoCarga,
            form.values.cantidadPeajes,
        ],
        queryFn: async () => {
            if (!rutaData?.distanciaTotal || !form.values.activoPrincipalId) return null;

            const response = await fetch('/api/fletes/estimar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    activoPrincipalId: form.values.activoPrincipalId,
                    distanciaKm: rutaData.distanciaTotal,
                    tonelaje: form.values.tonelaje,
                    tipoCarga: form.values.tipoCarga,
                    cantidadPeajes: form.values.cantidadPeajes,
                    precioPeajeUnitario: configPrecios.peaje,
                    precioGasoilUsd: configPrecios.gasoil,
                    porcentajeGanancia: 0.30,
                    bcv: bcv || 390, // pasa el BCV actual para cálculos más precisos
                    // horasEstimadas: lo calculamos en el backend ahora
                    // bcv: lo puedes pasar si lo necesitas en backend
                }),
            });

            if (!response.ok) {
                throw new Error('Error en la API de cálculo');
            }

            return response.json();
        },
        enabled: !!rutaData?.distanciaTotal && !!form.values.activoPrincipalId,
        staleTime: 1000 * 60 * 5, // 5 minutos – ajusta según quieras
    });

    const handleRouteCalculated = useCallback((data) => {
        setRutaData(data);
        form.setFieldValue("destino", data.direccionDestino || "Ubicación en Mapa");
        form.setFieldValue("distanciaKm", parseFloat(data.distanciaTotal));
        form.setFieldValue("coordenadasDestino", data.coordenadas);
    }, []);

    const handleSubmit = async (values) => {
        setSubmitting(true);
        try {
            const payload = {
                ...values,
                costoPeajesTotal: estimacion?.breakdown.peajes || 0,
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

            notifications.show({ title: "Éxito", message: "Flete programado correctamente", color: "green" });
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
                {/* COLUMNA IZQUIERDA */}
                <Grid.Col span={{ base: 12, md: 6 }}>
                    <SimpleGrid cols={1} spacing="md">
                        <SelectClienteConCreacion form={form} fieldName="clienteId" label="Cliente" />

                        <Group grow>
                            <DateInput
                                label="Fecha de Salida"
                                valueFormat="DD/MM/YYYY"
                                {...form.getInputProps("fechaSalida")}
                            />
                            <TextInput
                                label="Nro Control (Opcional)"
                                placeholder="FL-XXXX"
                                {...form.getInputProps("nroFlete")}
                            />
                        </Group>

                        <Divider label="Recursos Humanos" labelPosition="center" />

                        <Box>
                            <ODTSelectableGrid
                                label="Chofer Principal"
                                data={empleados
                                    .filter((e) => e.puestos?.some((p) => p.nombre.toLowerCase().includes("chofer")))
                                    .map((e) => ({
                                        id: e.id,
                                        nombre: `${e.nombre} ${e.apellido}`,
                                        imagen: e.imagen,
                                    }))}
                                onChange={(val) => form.setFieldValue("choferId", val)}
                                value={form.values.choferId}
                            />
                        </Box>

                        <Box>
                            <ODTSelectableGrid
                                label="Ayudante (Opcional)"
                                data={empleados
                                    .filter((e) => e.puestos?.some((p) => p.nombre.toLowerCase().includes("ayudante")))
                                    .map((e) => ({
                                        id: e.id,
                                        nombre: `${e.nombre} ${e.apellido}`,
                                        imagen: e.imagen,
                                    }))}
                                onChange={(val) => form.setFieldValue("ayudanteId", val)}
                                value={form.values.ayudanteId}
                            />
                        </Box>

                        <Divider label="Equipos" labelPosition="center" />

                        <Box>
                            <ODTSelectableGrid
                                label="Vehículo Principal (Chuto)"
                                data={activosMapeados.filter((a) => a.tipo === "Vehiculo")}
                                onChange={(val) => form.setFieldValue("activoPrincipalId", val)}
                                value={form.values.activoPrincipalId}
                            />
                        </Box>

                        <Box>
                            <ODTSelectableGrid
                                label="Remolque / Batea"
                                data={activosMapeados.filter((a) => a.tipo === "Remolque")}
                                onChange={(val) => form.setFieldValue("remolqueId", val)}
                                value={form.values.remolqueId}
                            />
                        </Box>

                        {/* Nuevos campos para cálculo sólido */}
                        <Divider label="Detalles de Carga" labelPosition="center" />
                        <NumberInput
                            label="Tonelaje de Carga (ton)"
                            min={0}
                            step={0.5}
                            placeholder="Ej: 25"
                            {...form.getInputProps("tonelaje")}
                        />
                        <Select
                            label="Tipo de Carga"
                            data={[
                                { value: "general", label: "General / No peligrosa" },
                                { value: "petrolera", label: "Hidrocarburos / Petrolera (PDVSA)" },
                                { value: "peligrosa", label: "Peligrosa / Químicos" },
                            ]}
                            {...form.getInputProps("tipoCarga")}
                        />
                    </SimpleGrid>
                </Grid.Col>

                {/* COLUMNA DERECHA */}
                <Grid.Col span={{ base: 12, md: 6 }}>
                    <Paper withBorder p="sm" radius="md" mb="md" bg="gray.0">
                        <Group mb="xs">
                            <IconMapPin size={20} />
                            <Text fw={700}>Seleccione el Destino</Text>
                        </Group>
                        <Box h={{ base: 300, sm: 400 }} style={{ position: "relative", overflow: "hidden", borderRadius: "8px" }}>
                            <GoogleRouteMap onRouteCalculated={handleRouteCalculated} />
                        </Box>

                        {rutaData && (
                            <Box mt="sm">
                                <Text size="sm" fw={700}>
                                    Destino: <Text span c="dimmed">{rutaData.direccionDestino}</Text>
                                </Text>
                                <Text size="sm" fw={700} pt={10}>
                                    Ida y Vuelta:
                                </Text>
                                <Group grow mt="xs">
                                    <Badge size="lg" variant="dot" color="blue">
                                        {rutaData.distanciaTotal} km
                                    </Badge>
                                    <Badge size="lg" variant="dot" color="orange">
                                        {rutaData.tiempoEstimado}
                                    </Badge>
                                </Group>
                            </Box>
                        )}
                    </Paper>

                    <Paper withBorder p="md" mb="md">
                        <Group mb="xs">
                            <IconCoin size={20} color="orange" />
                            <Text fw={700}>Gastos de Ruta</Text>
                        </Group>
                        <SimpleGrid cols={2}>
                            <NumberInput
                                label="Cantidad de Peajes"
                                description="Ingrese total (Ida y Vuelta)"
                                min={0}
                                {...form.getInputProps("cantidadPeajes")}
                            />
                            <TextInput
                                label="Precio Unitario"
                                value={`$${configPrecios.peaje}`}
                                readOnly
                                description="Según configuración global"
                            />
                        </SimpleGrid>
                    </Paper>

                    {/* RESUMEN MEJORADO */}
                    <Paper withBorder p="md" bg="blue.0" radius="md">
                        <Group mb="md">
                            <IconCalculator size={24} color="#1c7ed6" />
                            <Title order={4}>Resumen de Costos Estimados</Title>
                        </Group>

                        {calcLoading ? (
                            <Loader />
                        ) : estimacion ? (

                            <>
                                <Badge
                                    color={estimacion.metrics.fuente === 'historial_real' ? 'green' : 'orange'}
                                    variant="light"
                                    size="lg"
                                    mt="md"
                                >
                                    {estimacion.metrics.detalle}
                                </Badge>
                                <Grid>
                                    <Grid.Col span={8}><Text>Combustible:</Text></Grid.Col>
                                    <Grid.Col span={4}><Text ta="right">${estimacion.breakdown.combustible}</Text></Grid.Col>

                                    <Grid.Col span={8}><Text>Nómina (chofer + ayudante):</Text></Grid.Col>
                                    <Grid.Col span={4}><Text ta="right">${estimacion.breakdown.nomina}</Text></Grid.Col>

                                    <Grid.Col span={8}><Text>Viáticos:</Text></Grid.Col>
                                    <Grid.Col span={4}><Text ta="right">${estimacion.breakdown.viaticos}</Text></Grid.Col>

                                    <Grid.Col span={8}><Text>Peajes:</Text></Grid.Col>
                                    <Grid.Col span={4}><Text ta="right">${estimacion.breakdown.peajes}</Text></Grid.Col>

                                    <Grid.Col span={8}><Text>Desgaste cauchos:</Text></Grid.Col>
                                    <Grid.Col span={4}><Text ta="right">${estimacion.breakdown.desgasteCaucho}</Text></Grid.Col>

                                    <Grid.Col span={8}><Text>Fijos prorrateados + activo:</Text></Grid.Col>
                                    <Grid.Col span={4}><Text ta="right">${estimacion.breakdown.fijosProrrateados}</Text></Grid.Col>

                                    {estimacion.breakdown.sobretasa > 0 && (
                                        <>
                                            <Grid.Col span={8}><Text>Sobretasa PDVSA:</Text></Grid.Col>
                                            <Grid.Col span={4}><Text ta="right">${estimacion.breakdown.sobretasa}</Text></Grid.Col>
                                        </>
                                    )}

                                    <Grid.Col span={12}><Divider my="xs" /></Grid.Col>

                                    <Grid.Col span={6}><Text size="lg" fw={900}>Costo Total Estimado:</Text></Grid.Col>
                                    <Grid.Col span={6}><Text size="lg" fw={900} ta="right">${estimacion.costoTotal}</Text></Grid.Col>

                                    <Grid.Col span={6}><Text size="xl" fw={900} c="green">Precio Sugerido:</Text></Grid.Col>
                                    <Grid.Col span={6}><Text size="xl" fw={900} ta="right" c="green">${estimacion.precioSugerido}</Text></Grid.Col>
                                </Grid>
                            </>
                        ) : (
                            <Text c="dimmed" ta="center">
                                Completa ruta, vehículo principal y tonelaje para ver el cálculo automático
                            </Text>
                        )}
                    </Paper>

                    <Button
                        fullWidth
                        size="xl"
                        mt="xl"
                        type="submit"
                        loading={submitting}
                        leftSection={<IconTruck size={24} />}
                    >
                        Confirmar Flete
                    </Button>
                </Grid.Col>
            </Grid>
        </form>
    );
}