"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
    TextInput, NumberInput, Button, Paper, Title, Center,
    SimpleGrid, Box, Divider, Grid, Text, Loader, Group, Badge, Select
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { IconMapPin, IconCalculator, IconCoin, IconTruck, IconRoute } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";

import GoogleRouteMap from "./GoogleRouteMap";
import ODTSelectableGrid from "../../odt/ODTSelectableGrid";
import { SelectClienteConCreacion } from "../../contratos/SelectClienteConCreacion";

export default function FleteCreator() {
    const router = useRouter();
    const { userId, nombre, apellido } = useAuth();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [empleados, setEmpleados] = useState([]);
    const [activos, setActivos] = useState([]);
    const [configPrecios, setConfigPrecios] = useState({ peaje: 5, gasoil: 0.5 });
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
            destino: "Circuito Múltiple", // Ahora es un texto genérico o lo reemplazamos por el array de direcciones
            distanciaKm: 0,
            waypoints: [], // Guardamos las coordenadas de las paradas
            cantidadPeajes: 0,
            tonelaje: 0,
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

    // Carga de maestros
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
                subtitulo: `Tarifa: $${v.tarifaPorKm || 0}/km`,
                imagen: v.imagen,
                tipo: v.tipoActivo,
            };
        });
    }, [activos]);

    // Estimador de Costos (React Query)
    const { data: estimacion, isLoading: calcLoading } = useQuery({
        queryKey: [
            "calcular-flete-puro",
            form.values.activoPrincipalId,
            form.values.remolqueId,
            rutaData?.distanciaTotal,
            form.values.tonelaje,
            form.values.tipoCarga,
            form.values.cantidadPeajes
        ],
        queryFn: async () => {
            if (!form.values.activoPrincipalId || !rutaData?.distanciaTotal) return null;

            const response = await fetch('/api/fletes/estimar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tipoCotizacion: 'flete', // FIJO: Esto es pura logística
                    activoPrincipalId: form.values.activoPrincipalId,
                    remolqueId: form.values.remolqueId,
                    distanciaKm: rutaData.distanciaTotal,
                    tonelaje: form.values.tonelaje,
                    tipoCarga: form.values.tipoCarga,
                    cantidadPeajes: form.values.cantidadPeajes,
                    precioPeajeUnitario: configPrecios.peaje,
                    precioGasoilUsd: configPrecios.gasoil,
                    porcentajeGanancia: 0.30, 
                }),
            });

            if (!response.ok) throw new Error('Error en cálculo');
            return response.json();
        },
        enabled: !!form.values.activoPrincipalId && !!rutaData?.distanciaTotal,
    });

    const handleRouteCalculated = useCallback((data) => {
        setRutaData(data);
        form.setFieldValue("distanciaKm", parseFloat(data.distanciaTotal));
        form.setFieldValue("waypoints", data.waypoints); // Guardamos JSON de coordenadas
        // Si hay varios destinos, los concatenamos o mostramos cantidad
        const destinosTexto = data.rutasDetalle ? data.rutasDetalle.join(" | ") : "Varias paradas";
        form.setFieldValue("destino", destinosTexto);
    }, []);

    const handleSubmit = async (values) => {
        setSubmitting(true);
        try {
            const payload = {
                ...values,
                waypoints: JSON.stringify(values.waypoints), // Guardamos coordenadas en la BD
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

            notifications.show({ title: "Éxito", message: "Flete logístico programado", color: "green" });
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
                            <DateInput label="Fecha de Salida" valueFormat="DD/MM/YYYY" {...form.getInputProps("fechaSalida")} />
                            <TextInput label="Nro Control" placeholder="FL-XXXX" {...form.getInputProps("nroFlete")} />
                        </Group>

                        <Divider label="Recursos Humanos" labelPosition="center" />
                        <ODTSelectableGrid label="Chofer Principal" data={empleados.filter((e) => e.puestos?.some((p) => p.nombre.toLowerCase().includes("chofer"))).map((e) => ({ id: e.id, nombre: `${e.nombre} ${e.apellido}`, imagen: e.imagen }))} onChange={(val) => form.setFieldValue("choferId", val)} value={form.values.choferId} />
                        <ODTSelectableGrid label="Ayudante (Opcional)" data={empleados.filter((e) => e.puestos?.some((p) => p.nombre.toLowerCase().includes("ayudante"))).map((e) => ({ id: e.id, nombre: `${e.nombre} ${e.apellido}`, imagen: e.imagen }))} onChange={(val) => form.setFieldValue("ayudanteId", val)} value={form.values.ayudanteId} />

                        <Divider label="Equipos" labelPosition="center" />
                        <ODTSelectableGrid label="Vehículo Principal (Chuto)" data={activosMapeados.filter((a) => a.tipo === "Vehiculo")} onChange={(val) => form.setFieldValue("activoPrincipalId", val)} value={form.values.activoPrincipalId} />
                        <ODTSelectableGrid label="Remolque / Batea" data={activosMapeados.filter((a) => a.tipo === "Remolque")} onChange={(val) => form.setFieldValue("remolqueId", val)} value={form.values.remolqueId} />

                        <Divider label="Detalles de Carga" labelPosition="center" />
                        <Group grow>
                            <NumberInput label="Tonelaje Total (ton)" min={0} step={0.5} {...form.getInputProps("tonelaje")} />
                            <Select label="Tipo de Carga" data={[{ value: "general", label: "General / No peligrosa" }, { value: "petrolera", label: "Hidrocarburos" }, { value: "peligrosa", label: "Químicos" }]} {...form.getInputProps("tipoCarga")} />
                        </Group>
                    </SimpleGrid>
                </Grid.Col>

                {/* COLUMNA DERECHA */}
                <Grid.Col span={{ base: 12, md: 6 }}>
                    <Paper withBorder p="sm" radius="md" mb="md" bg="gray.0">
                        <Group mb="xs" justify="space-between">
                            <Group>
                                <IconRoute size={20} />
                                <Text fw={700}>Trazar Ruta (Múltiples Paradas)</Text>
                            </Group>
                            <Text size="xs" c="dimmed">Haz clic en el mapa para agregar entregas. El circuito cierra en Base automáticamente.</Text>
                        </Group>

                        <Box h={{ base: 350, sm: 400 }} style={{ borderRadius: "8px", overflow: 'hidden' }}>
                            <GoogleRouteMap onRouteCalculated={handleRouteCalculated} />
                        </Box>
                    </Paper>

                    <Paper withBorder p="md" mb="md">
                        <Group mb="xs">
                            <IconCoin size={20} color="orange" />
                            <Text fw={700}>Gastos de Ruta</Text>
                        </Group>
                        <SimpleGrid cols={2}>
                            <NumberInput label="Cantidad Total de Peajes (Circuito Completo)" min={0} {...form.getInputProps("cantidadPeajes")} />
                            <TextInput label="Precio Unitario" value={`$${configPrecios.peaje}`} readOnly />
                        </SimpleGrid>
                    </Paper>

                    {/* RESUMEN FINANCIERO */}
                    <Paper withBorder p="md" bg="blue.0" radius="md">
                        <Group mb="md">
                            <IconCalculator size={24} color="#1c7ed6" />
                            <Title order={4}>Presupuesto de Flete</Title>
                        </Group>

                        {calcLoading ? <Center><Loader /></Center> : estimacion ? (
                            <Grid gutter="xs">
                                <Grid.Col span={8}><Text size="sm">Combustible (Rendimiento por {form.values.tonelaje} Tons):</Text></Grid.Col>
                                <Grid.Col span={4}><Text size="sm" ta="right">${estimacion.breakdown.combustible.toFixed(2)}</Text></Grid.Col>

                                <Grid.Col span={8}><Text size="sm">Nómina (Chofer + Ayudante) y Viáticos:</Text></Grid.Col>
                                <Grid.Col span={4}><Text size="sm" ta="right">${(estimacion.breakdown.nomina + estimacion.breakdown.viaticos).toFixed(2)}</Text></Grid.Col>

                                <Grid.Col span={8}><Text size="sm">Peajes:</Text></Grid.Col>
                                <Grid.Col span={4}><Text size="sm" ta="right">${estimacion.breakdown.peajes.toFixed(2)}</Text></Grid.Col>

                                <Grid.Col span={8}><Text size="sm">Desgaste Activos (Cauchos, Aceite, Seguros):</Text></Grid.Col>
                                <Grid.Col span={4}><Text size="sm" ta="right">${(estimacion.breakdown.mantenimiento + estimacion.breakdown.posesion).toFixed(2)}</Text></Grid.Col>

                                <Grid.Col span={12}><Divider my="xs" /></Grid.Col>

                                <Grid.Col span={6}><Text fw={700}>Costo Operativo Real:</Text></Grid.Col>
                                <Grid.Col span={6}><Text fw={700} ta="right" c="red.9">${estimacion.costoTotal.toFixed(2)}</Text></Grid.Col>

                                <Grid.Col span={6}><Text size="xl" fw={900} c="green.9">PRECIO DEL FLETE:</Text></Grid.Col>
                                <Grid.Col span={6}><Text size="xl" fw={900} ta="right" c="green.9">${estimacion.precioSugerido.toFixed(2)}</Text></Grid.Col>
                            </Grid>
                        ) : (
                            <Text c="dimmed" ta="center">Seleccione el chuto y trace al menos un punto en el mapa.</Text>
                        )}
                    </Paper>

                    <Button fullWidth size="xl" mt="xl" type="submit" loading={submitting} leftSection={<IconTruck size={24} />}>
                        Confirmar Flete Logístico
                    </Button>
                </Grid.Col>
            </Grid>
        </form>
    );
}