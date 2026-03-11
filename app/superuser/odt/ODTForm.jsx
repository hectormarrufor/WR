"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  TextInput, Textarea, Button, Paper, Title, Center,
  SimpleGrid, Box, Divider, Group, Loader, Badge, Text, NumberInput, Grid, Alert,
  Stack,
  Select
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
      tipoLiquido: 'general',
      viajesEstimados: 1,
    },
    validate: {
      fecha: (value) => (value ? null : "Fecha requerida"),
    },
  });

  // 1. Agregamos un estado para guardar TODA la configuración global
  const [configGlobal, setConfigGlobal] = useState({});

  useEffect(() => {
    const cargarDatosIniciales = async () => {
      try {
        const [resEmp, resAct, resBcv, resConfig] = await Promise.all([
          fetch(`/api/rrhh/empleados`).then(r => r.json()),
          fetch(`/api/gestionMantenimiento/activos`).then(r => r.json()),
          fetch(`/api/bcv`).then(r => r.json()),
          fetch(`/api/configuracion/general`).then(r => r.json()), // 🔥 Traemos el general, no solo precios
        ]);
        setEmpleados(resEmp || []);
        setActivos(resAct.success ? resAct.data : []);
        if (resConfig) {
          // Guardamos toda la matriz global en la memoria del form
          setConfigGlobal(resConfig);
          setConfigPrecios({ gasoil: resConfig.precioGasoil || 0.5, peaje: resConfig.precioPeajePromedio / resBcv.precio || 5 });
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

        // Si guardaste un margen específico, lo ponemos en el estado del Input
        if (data.margenGanancia !== undefined) {
            setMargenOdt(data.margenGanancia);
        }

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

          // 🔥 RECUPERAMOS LOS DATOS DEL COTIZADOR 🔥
          distanciaKm: data.distanciaKm || 0,
          cantidadPeajes: data.cantidadPeajes || 0,
          tipoLiquido: data.tipoLiquido || 'general',
          viajesEstimados: data.viajesEstimados || 1,
          tramos: data.tramos || [],
          waypoints: data.waypoints || [],
          destino: data.destino || "",
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
      form.values.cantidadPeajes, configPrecios, margenOdt, // Agregados como dependencias
      form.values.tipoLiquido, form.values.viajesEstimados
    ],
    queryFn: async () => {
      if (!form.values.vehiculoPrincipalId) return null;
      const horasParaCalculo = horasOperacionCalculadas > 0 ? horasOperacionCalculadas : 8;

      // 🔥 LÓGICA DE CONVERSIÓN BBL -> TONELADAS 🔥
      // 160 BBL = ~25.4 Toneladas por viaje
      const toneladasEstimadas = isVacuumAsignado ? (form.values.viajesEstimados * 25.4) : 0;

      const response = await fetch('/api/fletes/estimar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipoCotizacion: 'servicio',
          activoPrincipalId: form.values.vehiculoPrincipalId,
          remolqueId: form.values.vehiculoRemolqueId,
          distanciaKm: form.values.distanciaKm || 0,
          horasOperacion: horasParaCalculo,
          cantidadPeajes: form.values.cantidadPeajes || 0,
          precioPeajeBs: configPrecios.peaje,
          precioGasoilUsd: configPrecios.gasoil,
          porcentajeGanancia: margenOdt / 100,
          // 🔥 INYECCIÓN PARA ACTIVAR EL OVERHEAD 🔥
          // Asegúrate de que estos nombres coincidan con los de tu BD (API General)
          valorFlotaTotal: configGlobal.valorFlotaTotal || 1,
          gastosFijosAnualesTotales: configGlobal.gastosFijosAnualesTotales || 0,
          horasTotalesFlota: configGlobal.horasTotalesFlota || 1,

          // 🔥 INYECCIÓN DE PARÁMETROS DE ACHIQUE 🔥
          tipoCarga: isVacuumAsignado ? form.values.tipoLiquido : 'general',
          tonelaje: toneladasEstimadas,

          // 🔥 INYECCIÓN PARA MATAR LOS $35 DE VIÁTICOS AUTOMÁTICOS 🔥
          // Para las ODT extendemos la jornada a 24h para que no salte el Hotel automático
          jornadaMaxima: 24,
          
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

  // 🔥 DETECTOR DE VACUUM (LÓGICA RELACIONAL CORRECTA) 🔥
  const isVacuumAsignado = useMemo(() => {
    if (!form.values.vehiculoRemolqueId) return false;

    // 1. Buscamos en el arreglo ORIGINAL de activos (que trae la data anidada de la BD)
    const activoSeleccionado = activos.find(a => a.id === form.values.vehiculoRemolqueId);
    if (!activoSeleccionado) return false;

    // 2. Verificamos que su tipo matriz sea "Remolque"
    if (activoSeleccionado.tipoActivo !== 'Remolque') return false;

    // 3. Consultamos su instancia y luego su plantilla
    const plantilla = activoSeleccionado.remolqueInstancia?.plantilla;
    if (!plantilla) return false;

    // 4. Le preguntamos a la plantilla si es un Vacuum. 
    // (Buscamos en las propiedades comunes: tipoRemolque, tipo o modelo)
    const identificador = (plantilla.tipoRemolque || plantilla.tipo || plantilla.modelo || "").toLowerCase();

    return identificador.includes('vacuum') || identificador.includes('vaccum');

  }, [form.values.vehiculoRemolqueId, activos]); // Importante: dependencia en 'activos' original


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
        // 🔥 AQUÍ GUARDAMOS LA MAGIA FINANCIERA 🔥
        margenGanancia: margenOdt,
        costoEstimado: estimacion?.costoTotal || 0,
        precioSugerido: estimacion?.precioSugerido || 0,
        desgloseCostos: estimacion || null, // Se guarda el JSON completo con toda la matemática
      

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
                  {/* 🔥 PANEL DINÁMICO SOLO PARA VACUUMS 🔥 */}
                  {isVacuumAsignado && (
                    <Paper withBorder p="md" bg="blue.0" mt="xs" radius="sm" style={{ borderColor: '#339af0' }}>
                      <Group mb="sm">
                        <IconMapPin size={20} color="#1c7ed6" />
                        <Text fw={800} c="blue.9" tt="uppercase">Parámetros Operativos de Achique</Text>
                      </Group>
                      <SimpleGrid cols={2}>
                        <Select
                          label="Fluido a Extraer"
                          data={[
                            { value: 'general', label: '💧 Agua / Lodos Básicos (Sin recargo)' },
                            { value: 'hidrocarburos', label: '🛢️ Crudo / Hidrocarburos (Riesgo Medio)' },
                            { value: 'salmuera', label: '☢️ Salmuera / Corrosivos (Riesgo Alto)' },
                            { value: 'quimicos', label: '🧪 Químicos Puros (Riesgo Extremo)' }
                          ]}
                          {...form.getInputProps('tipoLiquido')}
                        />
                        <NumberInput
                          label="Nro. de Viajes (Llenado/Vaciado)"
                          description="Capacidad teórica: 160 BBL por viaje"
                          min={1}
                          {...form.getInputProps('viajesEstimados')}
                        />
                      </SimpleGrid>
                      <Text size="xs" c="blue.8" mt="sm" fw={600}>
                        * Impacto en cotización: {(form.values.viajesEstimados || 1) * 160} BBL (~{((form.values.viajesEstimados || 1) * 25.4).toFixed(1)} Toneladas) procesados. El motor ajustará el desgaste y el riesgo según la corrosividad.
                      </Text>
                    </Paper>
                  )}
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
          {/* BLOQUE 4: INTELIGENCIA FINANCIERA (HÍBRIDA DETALLADA) */}
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
                  <Stack gap="xl">
                    {/* FASE 1: OPERACIÓN DETALLADA CON FÓRMULAS */}
                    <Box p="md" bg="white">
                      <Grid gutter="sm" align="center">
                        <Grid.Col span={8}>
                          <Text size="sm" fw={700} c="dark.8">⛽ Combustible Tránsito:</Text>
                          <Text size="xs" c="gray.6">
                            Fórmula: {(estimacion.breakdown.desgloseServicio.mobDetalle.gasoil / configPrecios.gasoil).toFixed(1)} Litros consumidos en ruta × ${configPrecios.gasoil}/L
                          </Text>
                        </Grid.Col>
                        <Grid.Col span={4} ta="right"><Text size="md" fw={900} c="dark.9">${estimacion.breakdown.desgloseServicio.mobDetalle.gasoil.toFixed(2)}</Text></Grid.Col>

                        <Grid.Col span={8}>
                          <Text size="sm" fw={700} c="dark.8">🚧 Peajes:</Text>
                          <Text size="xs" c="gray.6">
                            Fórmula: {form.values.cantidadPeajes} Cruces × ${(estimacion.breakdown.desgloseServicio.mobDetalle.peajes / (form.values.cantidadPeajes || 1)).toFixed(2)} c/u
                          </Text>
                        </Grid.Col>
                        <Grid.Col span={4} ta="right"><Text size="md" fw={900} c="dark.9">${estimacion.breakdown.desgloseServicio.mobDetalle.peajes.toFixed(2)}</Text></Grid.Col>

                        <Grid.Col span={8}>
                          <Text size="sm" fw={700} c="dark.8">⚙️ Desgaste Rodamiento (Matriz):</Text>
                          <Text size="xs" c="gray.6">
                            Fórmula: Suma de Insumos por Km (Cauchos, Tren, etc) × {form.values.distanciaKm} Km recorridos
                          </Text>
                        </Grid.Col>
                        <Grid.Col span={4} ta="right"><Text size="md" fw={900} c="dark.9">${estimacion.breakdown.desgloseServicio.mobDetalle.mtto.toFixed(2)}</Text></Grid.Col>

                        <Grid.Col span={8}>
                          <Text size="sm" fw={700} c="dark.8">👨‍🔧 Cuota Nómina Operativa:</Text>
                          <Text size="xs" c="gray.6">
                            Fórmula: Prorrateo de {estimacion.breakdown.desgloseServicio.horasViajeAprox} Hrs de viaje ÷ {estimacion.breakdown.rutinaViaje.tiempoMisionTotal} Hrs totales de misión × ${estimacion.breakdown.nomina.toFixed(2)} (Nómina Total)
                          </Text>
                        </Grid.Col>
                        <Grid.Col span={4} ta="right">
                          <Text size="md" fw={900} c="dark.9">
                            ${((estimacion.breakdown.nomina / (estimacion.breakdown.rutinaViaje.tiempoMisionTotal || 1)) * estimacion.breakdown.desgloseServicio.horasViajeAprox).toFixed(2)}
                          </Text>
                        </Grid.Col>

                        <Grid.Col span={8}>
                          <Text size="sm" fw={700} c="dark.8">🏢 Cuota Estructura/Overhead:</Text>
                          <Text size="xs" c="gray.6">
                            Fórmula: {estimacion.breakdown.desgloseServicio.horasViajeAprox} Hrs de viaje × ${estimacion.breakdown.overheadDetalle?.costoHoraCombinado?.toFixed(2) || 0}/Hr (Costo Operativo Base DADICA)
                          </Text>
                        </Grid.Col>
                        <Grid.Col span={4} ta="right"><Text size="md" fw={900} c="dark.9">${estimacion.breakdown.desgloseServicio.mobDetalle.overhead.toFixed(2)}</Text></Grid.Col>

                        <Grid.Col span={8}>
                          <Text size="sm" fw={700} c="dark.8">⏳ Costo de Posesión:</Text>
                          <Text size="xs" c="gray.6">
                            Fórmula: (Depreciación + Seguro/Insumos Mensuales) prorrateados en {estimacion.breakdown.desgloseServicio.horasViajeAprox} Hrs
                          </Text>
                        </Grid.Col>
                        <Grid.Col span={4} ta="right"><Text size="md" fw={900} c="dark.9">${estimacion.breakdown.desgloseServicio.mobDetalle.posesion.toFixed(2)}</Text></Grid.Col>
                      </Grid>
                    </Box>

                    {/* FASE 2: OPERACIÓN DETALLADA CON FÓRMULAS */}
                    <Box p="md" bg="white">
                      <Grid gutter="sm" align="center">
                        <Grid.Col span={8}>
                          <Text size="sm" fw={700} c="dark.8">⛽ Combustible Estacionario (PTO/Bomba):</Text>
                          <Text size="xs" c="gray.6">
                            Fórmula: {horasOperacionCalculadas > 0 ? horasOperacionCalculadas.toFixed(1) : '8.0'} Hrs In Situ × 5 Litros/Hr × ${configPrecios.gasoil}/L
                          </Text>
                        </Grid.Col>
                        <Grid.Col span={4} ta="right"><Text size="md" fw={900} c="dark.9">${estimacion.breakdown.desgloseServicio.opsDetalle.gasoil.toFixed(2)}</Text></Grid.Col>

                        <Grid.Col span={8}>
                          <Text size="sm" fw={700} c="dark.8">🔧 Desgaste por Tiempo/Horas (Motor/PTO):</Text>
                          <Text size="xs" c="gray.6">
                            Fórmula: Suma de Insumos por Hora de motor (Matriz) × {horasOperacionCalculadas > 0 ? horasOperacionCalculadas.toFixed(1) : '8.0'} Hrs In Situ
                          </Text>
                        </Grid.Col>
                        <Grid.Col span={4} ta="right"><Text size="md" fw={900} c="dark.9">${estimacion.breakdown.desgloseServicio.opsDetalle.mtto.toFixed(2)}</Text></Grid.Col>

                        <Grid.Col span={8}>
                          <Text size="sm" fw={700} c="dark.8">👨‍🔧 Cuota Nómina Operativa:</Text>
                          <Text size="xs" c="gray.6">
                            Fórmula: Prorrateo de {horasOperacionCalculadas > 0 ? horasOperacionCalculadas.toFixed(1) : '8.0'} Hrs In Situ ÷ {estimacion.breakdown.rutinaViaje.tiempoMisionTotal} Hrs totales × ${estimacion.breakdown.nomina.toFixed(2)} (Nómina Total)
                          </Text>
                        </Grid.Col>
                        <Grid.Col span={4} ta="right">
                          <Text size="md" fw={900} c="dark.9">
                            ${((estimacion.breakdown.nomina / (estimacion.breakdown.rutinaViaje.tiempoMisionTotal || 1)) * (horasOperacionCalculadas > 0 ? horasOperacionCalculadas : 8)).toFixed(2)}
                          </Text>
                        </Grid.Col>

                        <Grid.Col span={8}>
                          <Text size="sm" fw={700} c="dark.8">🏢 Cuota Estructura/Overhead:</Text>
                          <Text size="xs" c="gray.6">
                            Fórmula: {horasOperacionCalculadas > 0 ? horasOperacionCalculadas.toFixed(1) : '8.0'} Hrs In Situ × ${estimacion.breakdown.overheadDetalle?.costoHoraCombinado?.toFixed(2) || 0}/Hr (Costo Operativo Base DADICA)
                          </Text>
                        </Grid.Col>
                        <Grid.Col span={4} ta="right"><Text size="md" fw={900} c="dark.9">${estimacion.breakdown.desgloseServicio.opsDetalle.overhead.toFixed(2)}</Text></Grid.Col>

                        <Grid.Col span={8}>
                          <Text size="sm" fw={700} c="dark.8">⏳ Costo de Posesión:</Text>
                          <Text size="xs" c="gray.6">
                            Fórmula: (Depreciación + Seguro/Insumos Mensuales) prorrateados en {horasOperacionCalculadas > 0 ? horasOperacionCalculadas.toFixed(1) : '8.0'} Hrs
                          </Text>
                        </Grid.Col>
                        <Grid.Col span={4} ta="right"><Text size="md" fw={900} c="dark.9">${estimacion.breakdown.desgloseServicio.opsDetalle.posesion.toFixed(2)}</Text></Grid.Col>
                      </Grid>
                    </Box>

                    {/* ADICIONALES */}
                    {estimacion.breakdown.desgloseServicio.costoViaticosYRiesgo > 0 && (
                      <Paper withBorder p="md" radius="sm" bg="orange.0" style={{ borderColor: '#ffe8cc' }}>
                        <Group justify="space-between" align="flex-start">
                          <Box>
                            <Text size="sm" fw={900} c="orange.8" tt="uppercase">⚠️ Adicionales (Viáticos / Riesgo):</Text>
                            {/* Mostrar el detalle del riesgo inyectado por la API */}
                            {estimacion.breakdown.riesgoDetalle && (
                              <Text size="xs" c="orange.9" mt={4} fw={600}>
                                + Recargo Operativo: {estimacion.breakdown.riesgoDetalle.descripcion}
                                <br />(Aplicado: {estimacion.breakdown.riesgoDetalle.porcentajeAplicado}% sobre el subtotal)
                              </Text>
                            )}
                          </Box>
                          <Text size="lg" fw={900} c="orange.9">${estimacion.breakdown.desgloseServicio.costoViaticosYRiesgo.toFixed(2)}</Text>
                        </Group>
                      </Paper>
                    )}
                  </Stack>
                </Grid.Col>

                <Grid.Col span={{ base: 12, md: 5 }}>
                  {/* TOTALES Y MARGEN (SE MANTIENE IGUAL, SOLO SE AJUSTA ALTURA) */}
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
                          Equivale a ${(estimacion.precioSugerido / (horasOperacionCalculadas > 0 ? horasOperacionCalculadas : 8)).toFixed(2)} por hora de locación
                        </Text>
                      </Box>
                    </Stack>
                  </Paper>
                </Grid.Col>
              </Grid>
            ) : (
              <Alert color="dark.4" variant="outline" style={{ borderStyle: 'dashed' }} mt="md">
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
                        notifications.show({ title: "Faltan datos", message: "Ingresa horas de Llegada y Salida para finalizar", color: 'red' });
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