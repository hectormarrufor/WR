"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
    TextInput, NumberInput, Button, Paper, Title, Center,
    SimpleGrid, Box, Divider, Grid, Text, Loader, Group, Badge
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { IconMapPin, IconCalculator, IconCoin, IconTruck } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth"; // Tu hook de auth

// Componentes importados
import GoogleRouteMap from "./GoogleRouteMap";
import ODTSelectableGrid from "../../odt/ODTSelectableGrid";
import { SelectClienteConCreacion } from "../../contratos/SelectClienteConCreacion";

export default function FleteCreator() {
    const router = useRouter();
    const { nombre, apellido, userId } = useAuth();

    // Estados de Carga
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Datos Maestros
    const [empleados, setEmpleados] = useState([]);
    const [activos, setActivos] = useState([]);
    const [configPrecios, setConfigPrecios] = useState({ peaje: 0, gasoil: 0 });
    const [bcv, setBcv] = useState(null);

    // Datos del Mapa
    const [rutaData, setRutaData] = useState(null);

    // Totales Calculados
    const [totales, setTotales] = useState({ fleteBase: 0, peajes: 0, granTotal: 0 });

    const form = useForm({
        initialValues: {
            // Datos Generales
            clienteId: "",
            fechaSalida: new Date(),
            nroFlete: "", // O autogenerado

            // Recursos
            choferId: null,
            ayudanteId: null,
            activoPrincipalId: null, // Chuto
            remolqueId: null,        // Batea

            // Ruta y Logística
            origen: "Base DADICA - Tía Juana",
            destino: "",
            distanciaKm: 0,
            coordenadasDestino: null,

            // Costos Manuales
            cantidadPeajes: 0,
            observaciones: ""
        },
        validate: {
            clienteId: (val) => (val ? null : "Seleccione un cliente"),
            fechaSalida: (val) => (val ? null : "Fecha requerida"),
            choferId: (val) => (val ? null : "Debe asignar un chofer"),
            activoPrincipalId: (val) => (val ? null : "Debe asignar un vehículo principal"),
            distanciaKm: (val) => (val > 0 ? null : "Debe seleccionar un destino en el mapa"),
        },
    });

    // 1. Fetching de Datos (Igual que ODTForm + Precios)
    useEffect(() => {
        const cargarDatos = async () => {
            try {
                const [resEmp, resAct, resPrecios, resBcv] = await Promise.all([
                    fetch(`/api/rrhh/empleados`).then(r => r.json()),
                    fetch(`/api/gestionMantenimiento/activos`).then(r => r.json()),
                    fetch(`/api/configuracion/precios`).then(r => r.json()), // Tu API de precios
                    fetch(`/api/bcv`).then(r => r.json())
                ]);

                setEmpleados(resEmp || []);
                setActivos(resAct.success ? resAct.data : []);
                setBcv(resBcv.precio);

                // Configuración de precios globales
                if (resPrecios) {
                    setConfigPrecios({
                        peaje: parseFloat(resPrecios.peaje5ejes / (resBcv.precio)).toFixed(2),
                        gasoil: parseFloat(resPrecios.gasoil || 0)
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

    // 2. Mapeo de Activos (Lógica de ODTForm)
    const activosMapeados = useMemo(() => {
        return activos.map(v => {
            let nombreDisplay = v.codigoInterno;
            let placa = "";
            let tipo = v.tipoActivo; // Vehiculo, Remolque, Maquina
            let tarifa = parseFloat(v.tarifaPorKm || 0); // Asumiendo que el modelo Activo tiene este campo

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
                subtitulo: `Tarifa: $${tarifa}/km`, // Mostramos la tarifa en el grid
                imagen: v.imagen,
                tipo: tipo,
                tarifa: tarifa
            };
        });
    }, [activos]);

    // 3. Efecto Calculadora: Se actualiza cuando cambia la ruta, los vehículos o los peajes
    useEffect(() => {
        if (!rutaData) return;

        // Buscar tarifas de los activos seleccionados
        const chuto = activosMapeados.find(a => a.id === form.values.activoPrincipalId);
        const remolque = activosMapeados.find(a => a.id === form.values.remolqueId);

        const tarifaChuto = chuto ? chuto.tarifa : 0;
        const tarifaRemolque = remolque ? remolque.tarifa : 0;

        // Cálculo
        const costoTransporte = (tarifaChuto + tarifaRemolque) * parseFloat(rutaData.distanciaTotal);
        const costoPeajes = form.values.cantidadPeajes * configPrecios.peaje;

        setTotales({
            fleteBase: costoTransporte,
            peajes: costoPeajes,
            granTotal: costoTransporte + costoPeajes
        });

    }, [form.values.activoPrincipalId, form.values.remolqueId, form.values.cantidadPeajes, rutaData, configPrecios, activosMapeados]);

    const handleRouteCalculated = useCallback((data) => {
        setRutaData(data);
        form.setFieldValue('destino', data.direccionDestino || "Ubicación en Mapa");
        form.setFieldValue('distanciaKm', parseFloat(data.distanciaTotal));
        form.setFieldValue('coordenadasDestino', data.coordenadas);
    }, []); // Array vacío para que nunca cambie

    const handleSubmit = async (values) => {
        setSubmitting(true);
        try {
            const payload = {
                ...values,
                costoPeajesTotal: totales.peajes,
                montoFleteTotal: totales.granTotal,
                creadoPor: userId // Del hook useAuth
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
        <Paper p="md" shadow="sm" radius="md">
            <Title order={3} mb="md" ta="center">Programación de Flete</Title>

            <form onSubmit={form.onSubmit(handleSubmit)}>
                <Grid gutter="lg">
                    {/* COLUMNA IZQUIERDA: DATOS Y RECURSOS */}
                    <Grid.Col span={{ base: 12, md: 6 }}>
                        <SimpleGrid cols={1} spacing="md">
                            <SelectClienteConCreacion form={form} fieldName="clienteId" label="Cliente" />

                            <Group grow>
                                <DateInput
                                    label="Fecha de Salida"
                                    valueFormat="DD/MM/YYYY"
                                    {...form.getInputProps('fechaSalida')}
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
                                        .filter(e => e.puestos?.some(p => p.nombre.toLowerCase().includes("chofer")))
                                        .map(e => ({
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
                                        .filter(e => e.puestos?.some(p => p.nombre.toLowerCase().includes("ayudante")))
                                        .map(e => ({
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
                                    data={activosMapeados.filter(a => a.tipo === "Vehiculo")}
                                    onChange={(val) => form.setFieldValue("activoPrincipalId", val)}
                                    value={form.values.activoPrincipalId}
                                />
                            </Box>

                            <Box>
                                <ODTSelectableGrid
                                    label="Remolque / Batea"
                                    data={activosMapeados.filter(a => a.tipo === "Remolque")}
                                    onChange={(val) => form.setFieldValue("remolqueId", val)}
                                    value={form.values.remolqueId}
                                />
                            </Box>
                        </SimpleGrid>
                    </Grid.Col>

                    {/* COLUMNA DERECHA: MAPA Y COTIZACIÓN */}
                    <Grid.Col span={{ base: 12, md: 6 }}>
                        <Paper withBorder p="sm" radius="md" mb="md" bg="gray.0">
                            <Group mb="xs">
                                <IconMapPin size={20} />
                                <Text fw={700}>Seleccione el Destino</Text>
                            </Group>

                            <GoogleRouteMap onRouteCalculated={handleRouteCalculated} />

                            {rutaData && (
                                <Box mt="sm">
                                    <Text size="sm" fw={700}>Destino: <Text span c="dimmed">{rutaData.direccionDestino}</Text></Text>
                                    <Group grow mt="xs">
                                        <Badge size="lg" variant="dot" color="blue">
                                            Distancia Total: {rutaData.distanciaTotal} km
                                        </Badge>
                                        <Badge size="lg" variant="dot" color="orange">
                                            Tiempo Aprox: {rutaData.tiempoEstimado}
                                        </Badge>
                                    </Group>
                                </Box>
                            )}
                        </Paper>

                        {/* SECCIÓN DE PEAJES MANUAL */}
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
                                    {...form.getInputProps('cantidadPeajes')}
                                />
                                <TextInput
                                    label="Precio Unitario"
                                    value={`$${configPrecios.peaje}`}
                                    readOnly
                                    description="Según configuración global"
                                />
                            </SimpleGrid>
                        </Paper>

                        {/* RESUMEN DE COTIZACIÓN */}
                        <Paper withBorder p="md" bg="blue.0" radius="md">
                            <Group mb="md">
                                <IconCalculator size={24} color="#1c7ed6" />
                                <Title order={4}>Resumen de Costos</Title>
                            </Group>

                            <Grid>
                                <Grid.Col span={8}><Text>Flete Base (Activos x Km):</Text></Grid.Col>
                                <Grid.Col span={4}><Text fw={700} ta="right">${totales.fleteBase.toFixed(2)}</Text></Grid.Col>

                                <Grid.Col span={8}><Text>Peajes Estimados:</Text></Grid.Col>
                                <Grid.Col span={4}><Text fw={700} ta="right">${totales.peajes.toFixed(2)}</Text></Grid.Col>

                                <Grid.Col span={12}><Divider my="xs" color="blue.3" /></Grid.Col>

                                <Grid.Col span={6}><Text size="lg" fw={900} c="blue.9">TOTAL:</Text></Grid.Col>
                                <Grid.Col span={6}><Text size="lg" fw={900} ta="right" c="blue.9">${totales.granTotal.toFixed(2)}</Text></Grid.Col>
                            </Grid>
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
        </Paper>
    );
}