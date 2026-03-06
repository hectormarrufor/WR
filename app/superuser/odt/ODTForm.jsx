"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { 
  TextInput, Textarea, Button, Paper, Title, Center, 
  SimpleGrid, Box, Divider, Group, Loader, Badge, Text, NumberInput, Grid, Alert, 
  Stack
} from "@mantine/core";
import { useAuth } from "@/hooks/useAuth";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { DateInput, TimeInput } from "@mantine/dates";
import { IconArrowLeft, IconCheck, IconSearch, IconTruck, IconLockOpen, IconCalculator, IconClockHour4, IconMapPin } from "@tabler/icons-react";
import { format, addDays } from "date-fns";
import '@mantine/dates/styles.css';
import ODTSelectableGrid from "./ODTSelectableGrid";
import { SelectClienteConCreacion } from "../contratos/SelectClienteConCreacion";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import GoogleRouteMap from "../fletes/components/GoogleRouteMap";

// --- HELPERS DE FECHAS ---
const createDateTime = (fechaDate, horaString) => {
  if (!fechaDate || !horaString) return null;
  const d = new Date(fechaDate);
  const [hours, minutes] = horaString.split(':').map(Number);
  d.setHours(hours, minutes, 0, 0);
  return d;
};


const calculateEndDateTime = (fechaDate, horaLlegadaStr, horaSalidaStr) => {
  if (!fechaDate || !horaLlegadaStr || !horaSalidaStr) return null;
  let end = createDateTime(fechaDate, horaSalidaStr);
  const start = createDateTime(fechaDate, horaLlegadaStr);
  if (end < start) end = addDays(end, 1);
  return end;
};

// --- HELPERS DE ESTADO Y ORDENAMIENTO ---
const getEstadoConfig = (estado, tipo = 'empleado') => {
  const colors = {
    'Activo': 'green', 'Vacaciones': 'cyan', 'Reposo Medico': 'red', 'Permiso': 'orange',
    'Suspendido': 'gray', 'Inactivo': 'gray', 'Retirado': 'dark',
    'Operativo': 'green', 'En Mantenimiento': 'orange', 'Desincorporado': 'red'
  };
  return { color: colors[estado] || 'gray', label: estado };
};

const sortPorDisponibilidad = (a, b) => {
  const priority = ['Activo', 'Operativo'];
  const aEsPrioritario = priority.includes(a.estadoRaw);
  const bEsPrioritario = priority.includes(b.estadoRaw);
  if (aEsPrioritario && !bEsPrioritario) return -1;
  if (!aEsPrioritario && bEsPrioritario) return 1;
  return 0; 
};

export default function ODTForm({ mode = "create", odtId }) {
  const router = useRouter();
  const { nombre, apellido, userId } = useAuth();

  const [empleados, setEmpleados] = useState([]);
  const [activos, setActivos] = useState([]);
  const [configPrecios, setConfigPrecios] = useState({ gasoil: 0.5, peaje: 5 }); // NUEVO
  const [loadingInit, setLoadingInit] = useState(true);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [dayOdts, setDayOdts] = useState([]);

  // Buscadores locales
  const [qChofer, setQChofer] = useState("");
  const [qAyudante, setQAyudante] = useState("");
  const [qVehiculo, setQVehiculo] = useState("");
  const [qRemolque, setQRemolque] = useState("");
  const [qMaquinaria, setQMaquinaria] = useState("");
  const [margenOdt, setMargenOdt] = useState(35); // Ganancia comercial por defecto 35%

  const form = useForm({
    initialValues: {
      nroODT: "", fecha: null, descripcionServicio: "", horaLlegada: "", horaSalida: "",
      clienteId: "", vehiculoPrincipalId: null, vehiculoRemolqueId: null, maquinariaId: null,
      choferId: null, ayudanteId: null,
      choferEntradaBase: null, choferSalidaBase: null,
      ayudanteEntradaBase: null, ayudanteSalidaBase: null,
      salidaActivosBase: null, llegadaActivosBase: null, 
      estado: 'En Curso', 
      // NUEVOS CAMPOS DEL MAPA
      distanciaKm: 0, 
      cantidadPeajes: 0,
      tramos: [],     // <-- Necesario para el mapa
      waypoints: [],  // <-- Necesario para el mapa
      destino: "",    // <-- El punto al que van
    },
    validate: {
      fecha: (value) => (value ? null : "Fecha requerida"),
    },
  });

  // 1. Carga Inicial
  useEffect(() => {
    const cargarDatosIniciales = async () => {
      try {
        const [resEmp, resAct, resPrecios] = await Promise.all([
          fetch(`/api/rrhh/empleados`).then(r => r.json()),
          fetch(`/api/gestionMantenimiento/activos`).then(r => r.json()),
          fetch(`/api/configuracion/precios`).then(r => r.json()), // NUEVO
        ]);
        setEmpleados(resEmp || []);
        setActivos(resAct.success ? resAct.data : []);
        if (resPrecios) {
            setConfigPrecios({ gasoil: resPrecios.gasoil || 0.5, peaje: resPrecios.peaje5ejes || 5 });
        }
      } catch (error) { notifications.show({ title: "Error", message: "Error cargando datos", color: "red" }); }
      finally { setLoadingInit(false); }
    };
    cargarDatosIniciales();
  }, []);

  // 2. Modo Edición
  useEffect(() => {
    if (mode === "edit" && odtId) {
      fetch(`/api/odts/${odtId}`).then(r => r.json()).then(data => {
        const [y, m, d] = data.fecha.split('-').map(Number);
        const fechaLocal = new Date(y, m - 1, d);

        form.setValues({
          ...data,
          fecha: fechaLocal,
          horaLlegada: data.horaLlegada?.substring(0, 5),
          horaSalida: data.horaSalida?.substring(0, 5),
          clienteId: data.clienteId ? String(data.clienteId) : "",
          vehiculoPrincipalId: data.vehiculoPrincipalId || null,
          vehiculoRemolqueId: data.vehiculoRemolqueId || null,
          maquinariaId: data.maquinariaId || null,
          choferId: data.choferId || null,
          ayudanteId: data.ayudanteId || null,
          distanciaKm: data.distanciaKm || 0, // NUEVO
        });
      });
    }
  }, [mode, odtId]);

  // 3. Listener Disponibilidad
  useEffect(() => {
    const fetchDayAvailability = async () => {
      if (!form.values.fecha) return;
      setLoadingAvailability(true);
      try {
        const dateString = format(form.values.fecha, 'yyyy-MM-dd');
        const res = await fetch(`/api/odts/check-availability?fecha=${dateString}`);
        const data = await res.json();
        setDayOdts(Array.isArray(data) ? data : []);
      } catch (error) { console.error(error); }
      finally { setLoadingAvailability(false); }
    };
    fetchDayAvailability();
  }, [form.values.fecha]);

  const handleRouteCalculated = useCallback((data) => {
      // Como es ODT (Ida y Vuelta a la misma base), la distancia total del mapa 
      // suele ser el circuito completo si el usuario pone origen y destino.
      form.setFieldValue("distanciaKm", parseFloat(data.distanciaTotal));
      form.setFieldValue("waypoints", data.waypoints);
      form.setFieldValue("destino", data.direccionDestino || "Locación Foránea");
      form.setFieldValue("tramos", data.tramos || []);
  }, []);

  // --- CÁLCULO DE HORAS DE OPERACIÓN (NUEVO) ---
  const horasOperacionCalculadas = useMemo(() => {
    if (!form.values.fecha || !form.values.horaLlegada || !form.values.horaSalida) return 0;
    const start = createDateTime(form.values.fecha, form.values.horaLlegada);
    const end = calculateEndDateTime(form.values.fecha, form.values.horaLlegada, form.values.horaSalida);
    if (!start || !end) return 0;
    
    const diffMs = end - start;
    return diffMs / (1000 * 60 * 60); // Retorna horas decimales
  }, [form.values.fecha, form.values.horaLlegada, form.values.horaSalida]);

  // --- MOTOR DE ESTIMACIÓN REACT QUERY (HÍBRIDO ODT) ---
  const { data: estimacion, isLoading: calcLoading } = useQuery({
    queryKey: [
        "estimar-odt", "servicio", 
        form.values.vehiculoPrincipalId, form.values.vehiculoRemolqueId, 
        form.values.distanciaKm, horasOperacionCalculadas,
        form.values.cantidadPeajes, configPrecios, margenOdt // Agregados como dependencias
    ],
    queryFn: async () => {
        if (!form.values.vehiculoPrincipalId) return null;
        
        const horasParaCalculo = horasOperacionCalculadas > 0 ? horasOperacionCalculadas : 8;

        const response = await fetch('/api/fletes/estimar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tipoCotizacion: 'servicio', // Gatilla la lógica híbrida
                activoPrincipalId: form.values.vehiculoPrincipalId,
                remolqueId: form.values.vehiculoRemolqueId,
                distanciaKm: form.values.distanciaKm || 0,
                horasOperacion: horasParaCalculo,
                cantidadPeajes: form.values.cantidadPeajes || 0,
                precioPeajeBs: configPrecios.peaje, // Corregido: la API espera precioPeajeBs
                precioGasoilUsd: configPrecios.gasoil,
                porcentajeGanancia: margenOdt / 100, // Dinámico
            }),
        });
        if (!response.ok) throw new Error('Error estimando costos');
        return response.json();
    },
    enabled: !!form.values.vehiculoPrincipalId,
  });

  // --- MAPEOS ---
  const empleadosMapeados = useMemo(() => {
    return empleados.map(e => {
        const config = getEstadoConfig(e.estado);
        return { ...e, nombre: `${e.nombre} ${e.apellido}`, estadoRaw: e.estado, badge: config.label, badgeColor: config.color };
    }).sort(sortPorDisponibilidad);
  }, [empleados]);

  const activosMapeados = useMemo(() => {
    return activos.map(v => {
        let nombreDisplay = v.codigoInterno;
        let placa = v.vehiculoInstancia?.placa || v.remolqueInstancia?.placa || v.maquinaInstancia?.placa || "";
        if (v.vehiculoInstancia) nombreDisplay = `${v.vehiculoInstancia.plantilla.marca} ${v.vehiculoInstancia.plantilla.modelo}`;
        else if (v.remolqueInstancia) nombreDisplay = `${v.remolqueInstancia.plantilla.marca} ${v.remolqueInstancia.plantilla.modelo}`;
        else if (v.maquinaInstancia) nombreDisplay = `${v.maquinaInstancia.plantilla.marca} ${v.maquinaInstancia.plantilla.modelo}`;
        
        const config = getEstadoConfig(v.estado, 'activo');
        return { id: v.id, nombre: `${nombreDisplay} (${placa})`, imagen: v.imagen, tipo: v.tipoActivo, estadoRaw: v.estado, badge: config.label, badgeColor: config.color };
    }).sort(sortPorDisponibilidad);
  }, [activos]);

  // --- VALIDACIONES ORIGINALES INTACTAS ---
  const validarNumeroUnico = async (nro) => {
    try {
      const res = await fetch(`/api/odts/check-number?nro=${nro}`);
      const data = await res.json();
      if (data.exists) {
        if (mode === "create") return true;
        if (mode === "edit" && String(data.id) !== String(odtId)) return true;
      }
      return false;
    } catch (e) { return false; }
  };

  const validarConflictos = (values) => {
    const newStart = createDateTime(values.fecha, values.horaLlegada);
    const newEnd = calculateEndDateTime(values.fecha, values.horaLlegada, values.horaSalida);
    if (!newStart || !newEnd) return null;

    for (const odt of dayOdts) {
      if (mode === "edit" && String(odt.id) === String(odtId)) continue;
      const [y, m, d] = odt.fecha.split('-').map(Number);
      const fechaBaseOdt = new Date(y, m - 1, d);
      const existingStart = createDateTime(fechaBaseOdt, odt.horaLlegada?.substring(0, 5));
      const existingEnd = calculateEndDateTime(fechaBaseOdt, odt.horaLlegada?.substring(0, 5), odt.horaSalida?.substring(0, 5));
      const haySolapamientoTiempo = (newStart < existingEnd && newEnd > existingStart);

      if (haySolapamientoTiempo) {
        const msgBase = `Conflicto con ODT #${odt.nroODT} (${format(existingStart, 'HH:mm')} - ${format(existingEnd, 'HH:mm')})`;
        if (values.choferId && values.choferId === odt.choferId) return `Chofer ocupado. ${msgBase}`;
        if (values.ayudanteId && values.ayudanteId === odt.ayudanteId) return `Ayudante ocupado. ${msgBase}`;
        if (values.vehiculoPrincipalId && values.vehiculoPrincipalId === odt.vehiculoPrincipalId) return `Vehículo ocupado. ${msgBase}`;
        if (values.vehiculoRemolqueId && values.vehiculoRemolqueId === odt.vehiculoRemolqueId) return `Remolque ocupado. ${msgBase}`;
        if (values.maquinariaId && values.maquinariaId === odt.maquinariaId) return `Maquinaria ocupada. ${msgBase}`;
      }
    }
    return null;
  };

  const handleSubmit = async (values) => {
    if (form.validate().hasErrors) return;
    if (loadingAvailability) { notifications.show({ title: "Verificando...", message: "Espere un momento", color: "yellow" }); return; }

    const errorConflicto = validarConflictos(values);
    if (errorConflicto) {
      notifications.show({ title: "Conflicto de Disponibilidad", message: errorConflicto, color: "red", autoClose: 8000 });
      return;
    }

    const existeNumero = await validarNumeroUnico(values.nroODT);
    if (existeNumero) {
      form.setFieldError('nroODT', 'Duplicado');
      notifications.show({ title: "Error", message: "Número de ODT duplicado", color: "red" });
      return;
    }

    try {
      const url = mode === "create" ? "/api/odts" : `/api/odts/${odtId}`;
      const method = mode === "create" ? "POST" : "PUT";

      const payload = {
        ...values,
        nombreCreador: nombre + " " + apellido,
        userId,
        fecha: format(values.fecha, 'yyyy-MM-dd'),
        horaLlegada: values.horaLlegada || null,
        horaSalida: values.horaSalida || null,
        choferEntradaBase: values.choferEntradaBase || null,
        choferSalidaBase: values.choferSalidaBase || null,
        ayudanteEntradaBase: values.ayudanteEntradaBase || null,
        ayudanteSalidaBase: values.ayudanteSalidaBase || null,
        
        // Opcional: Puedes guardar el costo estimado en la BD si agregas los campos al modelo de ODT
        // costoEstimado: estimacion?.costoTotal || 0,
      };

      const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error("Error en servidor");
      notifications.show({ title: "Éxito", message: "Guardado correctamente", color: "green" });
      router.push("/superuser/odt");
    } catch (e) {
      notifications.show({ title: "Error", message: e.message, color: "red" });
    }
  };

  if (loadingInit) return <Center h="94vh"><Loader size="xl" /></Center>;

  const isFinalizada = form.values.estado === 'Finalizada';
  const statusColor = isFinalizada ? 'green' : 'blue';

return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      {/* FONDO INDUSTRIAL Y FULL WIDTH */}
      <Box w="100%" p={{ base: "sm", md: "xl" }} m={0} bg="#e9ecef" style={{ minHeight: '100vh', paddingBottom: '40px' }}>
        
        {/* HEADER */}
        <Group mb="xl" justify="space-between" align="center">
          <Group>
            <Button variant="white" color="dark" size="md" onClick={() => router.back()} shadow="sm"><IconArrowLeft size={20} /></Button>
            <Box>
              <Title order={2} c="dark.9" tt="uppercase" style={{ letterSpacing: '1px' }}>
                {mode === "create" ? "Nueva Orden de Trabajo (ODT)" : `Editando ODT #${form.values.nroODT || ''}`}
              </Title>
              {mode === 'edit' && (
                <Badge color={statusColor} variant="filled" size="lg" mt={4}>{form.values.estado}</Badge>
              )}
            </Box>
          </Group>
        </Group>

        <Stack gap="xl">

          {/* ======================================================= */}
          {/* BLOQUE 1: DATOS OPERATIVOS Y CONTROL DE TIEMPOS */}
          {/* ======================================================= */}
          <Paper shadow="sm" p="xl" radius="md" bg="white" style={{ borderTop: '6px solid #1c7ed6' }}>
            <Group mb="lg" align="center">
              <IconClockHour4 size={28} color="#1c7ed6" />
              <Title order={3} c="dark.8" tt="uppercase">1. Datos Generales y Tiempos</Title>
            </Group>

            <Grid gutter="xl">
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Stack gap="md">
                  <SelectClienteConCreacion form={form} fieldName="clienteId" label="Cliente / Empresa" placeholder='Selecciona un cliente' />
                  <Group grow>
                    <TextInput
                        label="Nro ODT" placeholder="0000" {...form.getInputProps("nroODT")}
                        fw={800} c="blue.9"
                        onBlur={async (e) => {
                            form.getInputProps("nroODT").onBlur(e);
                            if (e.target.value.length === 4) {
                                const err = await validarNumeroUnico(e.target.value);
                                if (err) form.setFieldError('nroODT', 'Ya existe');
                            }
                        }}
                    />
                    <DateInput label="Fecha de Ejecución" valueFormat="DD/MM/YYYY" {...form.getInputProps('fecha')} rightSection={loadingAvailability && <Loader size="xs" />} />
                  </Group>
                  <Textarea label="Descripción del Servicio" placeholder="Ej: Achique de tanquilla en locación..." rows={2} {...form.getInputProps('descripcionServicio')} />
                </Stack>
              </Grid.Col>

              <Grid.Col span={{ base: 12, md: 6 }}>
                <Paper withBorder p="md" bg="gray.0" radius="sm">
                  <Text fw={700} c="dark.6" mb="md" tt="uppercase">Cronograma de la Jornada</Text>
                  <SimpleGrid cols={2} spacing="md">
                    <TimeInput label="Salida de Base" description="Portón DADICA" {...form.getInputProps('salidaActivosBase')} />
                    <TimeInput label="Retorno a Base" description="Portón DADICA" {...form.getInputProps('llegadaActivosBase')} />
                    <TimeInput label="Llegada a Locación" description="Inicio de ODT in situ" {...form.getInputProps('horaLlegada')} />
                    <TimeInput label="Salida de Locación" description="Fin de ODT in situ" {...form.getInputProps('horaSalida')} />
                  </SimpleGrid>
                </Paper>
              </Grid.Col>
            </Grid>
          </Paper>

          {/* ======================================================= */}
          {/* BLOQUE 2: ASIGNACIÓN DE FLOTA Y PERSONAL */}
          {/* ======================================================= */}
          <Paper shadow="sm" p="xl" radius="md" bg="white" style={{ borderTop: '6px solid #fab005' }}>
            <Group mb="lg" align="center">
              <IconTruck size={28} color="#fab005" />
              <Title order={3} c="dark.8" tt="uppercase">2. Flota y Cuadrilla</Title>
            </Group>

            <Grid gutter="xl">
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Text fw={800} c="dark.6" mb="sm" tt="uppercase" style={{ borderBottom: '2px solid #fab005', display: 'inline-block' }}>Equipos Asignados</Text>
                <Stack gap="md">
                  <ODTSelectableGrid
                      label="Vehículo Principal / Maquinaria"
                      data={activosMapeados.filter(a => a.tipo === "Vehiculo" || a.tipo === "Maquina").filter(a => a.nombre.toLowerCase().includes(qVehiculo.toLowerCase()))}
                      onChange={(v) => form.setFieldValue("vehiculoPrincipalId", v)}
                      value={form.values.vehiculoPrincipalId}
                  />
                  <ODTSelectableGrid
                      label="Remolque / Batea (Opcional)"
                      data={activosMapeados.filter(a => a.tipo === "Remolque").filter(a => a.nombre.toLowerCase().includes(qRemolque.toLowerCase()))}
                      onChange={(v) => form.setFieldValue("vehiculoRemolqueId", v)}
                      value={form.values.vehiculoRemolqueId} 
                  />
                </Stack>
              </Grid.Col>

              <Grid.Col span={{ base: 12, md: 6 }}>
                <Text fw={800} c="dark.6" mb="sm" tt="uppercase" style={{ borderBottom: '2px solid #fab005', display: 'inline-block' }}>Personal a Cargo</Text>
                <Stack gap="md">
                  <ODTSelectableGrid
                      label="Chofer / Operador"
                      data={empleadosMapeados.filter(e => e.puestos?.some(p => p.nombre.toLowerCase().includes("chofer") || p.nombre.toLowerCase().includes("operador"))).filter(e => e.nombre.toLowerCase().includes(qChofer.toLowerCase()))}
                      onChange={(v) => form.setFieldValue("choferId", v)}
                      value={form.values.choferId}
                  />
                  <ODTSelectableGrid
                      label="Ayudante (Opcional)"
                      data={empleadosMapeados.filter(e => e.puestos?.some(p => p.nombre.toLowerCase().includes("ayudante"))).filter(e => e.nombre.toLowerCase().includes(qAyudante.toLowerCase()))}
                      onChange={(v) => form.setFieldValue("ayudanteId", v)}
                      value={form.values.ayudanteId}
                  />
                </Stack>
              </Grid.Col>
            </Grid>
          </Paper>

          {/* ======================================================= */}
          {/* BLOQUE 3: MAPA DE MOVILIZACIÓN (FULL WIDTH) */}
          {/* ======================================================= */}
          <Paper shadow="sm" p="xl" radius="md" bg="white" style={{ borderTop: '6px solid #e64980' }}>
            <Group mb="md" align="center">
              <IconMapPin size={28} color="#e64980" />
              <Title order={3} c="dark.8" tt="uppercase">3. Ruta de Movilización (Base ➔ Cliente ➔ Base)</Title>
            </Group>

            <Alert variant="light" color="pink" mb="lg" icon={<IconMapPin size={18} />}>
                <Text size="sm" fw={600}>
                    Haz clic en el mapa para ubicar la locación del cliente. El sistema calculará el costo del "Flete Oculto" (desgaste y gasoil para llevar y traer los equipos).
                </Text>
            </Alert>

            <Box style={{ minHeight: '450px', borderRadius: '8px', overflow: 'hidden', border: '2px solid #dee2e6' }}>
                <GoogleRouteMap
                    onRouteCalculated={handleRouteCalculated}
                    tramosFormulario={form.values.tramos}
                    vehiculoAsignado={!!form.values.vehiculoPrincipalId}
                    taraBase={0} 
                    capacidadMax={30}
                />
            </Box>

            <Group grow mt="xl">
                <Paper withBorder p="md" bg="gray.0" radius="sm">
                    <Text size="sm" fw={700} c="dimmed" tt="uppercase">Distancia Calculada (Ida y Vuelta)</Text>
                    <Text size="xl" fw={900} c="pink.7">{form.values.distanciaKm} Km</Text>
                </Paper>
                <NumberInput 
                    label="Peajes Cruzados (Ida y Vuelta)" 
                    description="Ajuste manual si aplica"
                    leftSection={<IconMapPin size={16} />}
                    size="lg"
                    {...form.getInputProps("cantidadPeajes")} 
                />
            </Group>
          </Paper>

          {/* ======================================================= */}
          {/* BLOQUE 4: INTELIGENCIA FINANCIERA (HÍBRIDA) */}
          {/* ======================================================= */}
          <Paper shadow="sm" p="xl" radius="md" bg="dark.8" style={{ borderTop: '6px solid #20c997' }}>
            <Group mb="xl" align="center" justify="space-between">
                <Group>
                    <IconCalculator size={28} color="#20c997" />
                    <Title order={3} c="white" tt="uppercase">4. Presupuesto Inteligente ODT</Title>
                </Group>
                {horasOperacionCalculadas > 0 ? (
                    <Badge color="teal.5" size="xl" radius="sm" variant="filled">
                        Tiempo de Operación: {horasOperacionCalculadas.toFixed(1)} Hrs
                    </Badge>
                ) : (
                    <Badge color="orange.5" size="xl" radius="sm" variant="filled">
                        Proyección Estándar: 8.0 Hrs (Sin horas definidas)
                    </Badge>
                )}
            </Group>

            {calcLoading ? (
                <Center my="xl" py="xl"><Loader color="teal" type="bars" size="xl" /></Center>
            ) : estimacion && estimacion.breakdown?.desgloseServicio ? (
                <Grid gutter="xl">
                    <Grid.Col span={{ base: 12, md: 7 }}>
                        {/* DESGLOSE FASE 1 Y 2 */}
                        <Stack gap="md">
                            <Paper withBorder p="md" radius="sm" bg="gray.1">
                                <Text size="sm" fw={900} c="dark.5" tt="uppercase" mb={8}>🚚 Fase 1: Costo de Movilización (Ida/Vuelta)</Text>
                                <Group justify="space-between">
                                    <Text size="md" fw={600} c="dimmed">Combustible Tránsito, Peajes, Llantas ({estimacion.breakdown.desgloseServicio.horasViajeAprox} Hrs ruta)</Text>
                                    <Text size="lg" fw={900} c="dark.8">${estimacion.breakdown.desgloseServicio.costoMovilizacionTotal.toFixed(2)}</Text>
                                </Group>
                            </Paper>

                            <Paper withBorder p="md" radius="sm" bg="gray.1">
                                <Text size="sm" fw={900} c="dark.5" tt="uppercase" mb={8}>⚙️ Fase 2: Costo de Operación en Locación</Text>
                                <Group justify="space-between">
                                    <Text size="md" fw={600} c="dimmed">Gasoil Híbrido, PTO, Posesión y Nómina ({horasOperacionCalculadas > 0 ? horasOperacionCalculadas.toFixed(1) : '8.0'} Hrs)</Text>
                                    <Text size="lg" fw={900} c="dark.8">${estimacion.breakdown.desgloseServicio.costoOperacionTotal.toFixed(2)}</Text>
                                </Group>
                            </Paper>

                            {estimacion.breakdown.desgloseServicio.costoViaticosYRiesgo > 0 && (
                                <Paper withBorder p="md" radius="sm" bg="orange.0" style={{ borderColor: '#ffe8cc' }}>
                                    <Text size="sm" fw={900} c="orange.8" tt="uppercase" mb={8}>⚠️ Adicionales: Riesgo y Viáticos</Text>
                                    <Group justify="space-between">
                                        <Text size="md" fw={600} c="orange.9">Comidas, Hotel o Pólizas Carga Peligrosa</Text>
                                        <Text size="lg" fw={900} c="orange.9">${estimacion.breakdown.desgloseServicio.costoViaticosYRiesgo.toFixed(2)}</Text>
                                    </Group>
                                </Paper>
                            )}
                        </Stack>
                    </Grid.Col>

                    <Grid.Col span={{ base: 12, md: 5 }}>
                        {/* TOTALES Y MARGEN */}
                        <Paper withBorder p="xl" radius="sm" bg="white" shadow="sm" h="100%">
                            <Stack justify="space-between" h="100%">
                                <Box>
                                    <Group justify="space-between" mb="xs">
                                        <Text size="sm" fw={700} c="gray.6" tt="uppercase">Costo Operativo (Break-Even):</Text>
                                        <Text size="xl" fw={900} c="red.7">${estimacion.costoTotal?.toFixed(2)}</Text>
                                    </Group>
                                    <Divider my="sm" />
                                    <Group justify="space-between" align="center" mt="md">
                                        <Text size="sm" fw={700} c="dark.6" tt="uppercase">Margen de Ganancia:</Text>
                                        <NumberInput 
                                            size="md" w={100}
                                            value={margenOdt} 
                                            onChange={(val) => setMargenOdt(val || 0)} 
                                            min={0} max={100}
                                            rightSection={<Text size="sm" fw={700}>%</Text>}
                                        />
                                    </Group>
                                </Box>

                                <Box ta="right" mt="xl">
                                    <Text size="xs" fw={900} c="teal.7" tt="uppercase" mb={4} style={{ letterSpacing: '1px' }}>Tarifa Total Sugerida ODT</Text>
                                    <Text style={{ fontSize: '4rem', lineHeight: 1 }} fw={900} c="dark.9">
                                        ${estimacion.precioSugerido?.toFixed(2)}
                                    </Text>
                                    <Text size="md" fw={700} c="dimmed" mt={8}>
                                        Equivale a ${(estimacion.precioSugerido / (horasOperacionCalculadas > 0 ? horasOperacionCalculadas : 8)).toFixed(2)} por hora
                                    </Text>
                                </Box>
                            </Stack>
                        </Paper>
                    </Grid.Col>
                </Grid>
            ) : (
                <Alert color="dark.4" variant="outline" style={{ borderStyle: 'dashed' }}>
                    <Text c="gray.4" ta="center" size="md" fw={600}>Seleccione un vehículo principal y trace la ruta para que el motor financiero procese los costos.</Text>
                </Alert>
            )}
          </Paper>

          {/* ======================================================= */}
          {/* BOTONERA INFERIOR */}
          {/* ======================================================= */}
          <Box px="xl" pb="xl" mt="md">
            {mode === 'create' ? (
                <Button 
                    fullWidth radius="md" type="submit" loading={loadingInit} 
                    leftSection={<IconTruck size={36} />} color="blue.7"
                    style={{ height: '80px', fontSize: '1.5rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', boxShadow: '0 8px 16px rgba(0,0,0,0.15)' }}
                >
                    Despachar Unidad (Crear ODT)
                </Button>
            ) : (
                <Grid>
                    <Grid.Col span={6}>
                        <Button fullWidth size="xl" variant="default" onClick={() => handleSubmit(form.values)} style={{ height: '70px', fontSize: '1.2rem' }}>
                            Guardar Cambios
                        </Button>
                    </Grid.Col>
                    <Grid.Col span={6}>
                        {!isFinalizada ? (
                            <Button fullWidth size="xl" color="green.7" leftSection={<IconCheck size={24} />} style={{ height: '70px', fontSize: '1.2rem' }} onClick={() => {
                                if (!form.values.horaLlegada || !form.values.horaSalida) {
                                    notifications.show({ title:"Faltan datos", message: "Ingresa horas de Llegada y Salida para finalizar", color: 'red' });
                                    return;
                                }
                                handleSubmit({ ...form.values, estado: 'Finalizada' });
                            }}>
                                Finalizar ODT
                            </Button>
                        ) : (
                            <Button fullWidth size="xl" color="orange.6" variant="light" leftSection={<IconLockOpen size={24} />} style={{ height: '70px', fontSize: '1.2rem' }} onClick={() => {
                                handleSubmit({ ...form.values, estado: 'En Curso' });
                            }}>
                                Reabrir ODT
                            </Button>
                        )}
                    </Grid.Col>
                </Grid>
            )}
          </Box>

        </Stack>
      </Box>
    </form>
  );
}