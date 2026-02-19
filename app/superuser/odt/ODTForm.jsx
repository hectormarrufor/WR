"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  TextInput, Textarea, Button, Paper, Title, Center, 
  SimpleGrid, Box, Divider, Group, Loader, Badge, Text, NumberInput, Grid, Alert 
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

  const form = useForm({
    initialValues: {
      nroODT: "", fecha: null, descripcionServicio: "", horaLlegada: "", horaSalida: "",
      clienteId: "", vehiculoPrincipalId: null, vehiculoRemolqueId: null, maquinariaId: null,
      choferId: null, ayudanteId: null,
      choferEntradaBase: null, choferSalidaBase: null,
      ayudanteEntradaBase: null, ayudanteSalidaBase: null,
      salidaActivosBase: null, llegadaActivosBase: null, 
      estado: 'En Curso', 
      // NUEVOS CAMPOS PARA CÁLCULO
      distanciaKm: 0, 
      cantidadPeajes: 0
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

  // --- CÁLCULO DE HORAS DE OPERACIÓN (NUEVO) ---
  const horasOperacionCalculadas = useMemo(() => {
    if (!form.values.fecha || !form.values.horaLlegada || !form.values.horaSalida) return 0;
    const start = createDateTime(form.values.fecha, form.values.horaLlegada);
    const end = calculateEndDateTime(form.values.fecha, form.values.horaLlegada, form.values.horaSalida);
    if (!start || !end) return 0;
    
    const diffMs = end - start;
    return diffMs / (1000 * 60 * 60); // Retorna horas decimales
  }, [form.values.fecha, form.values.horaLlegada, form.values.horaSalida]);

  // --- MOTOR DE ESTIMACIÓN REACT QUERY (NUEVO) ---
  const { data: estimacion, isLoading: calcLoading } = useQuery({
    queryKey: [
        "estimar-odt", "servicio", 
        form.values.vehiculoPrincipalId, form.values.vehiculoRemolqueId, 
        form.values.distanciaKm, horasOperacionCalculadas
    ],
    queryFn: async () => {
        if (!form.values.vehiculoPrincipalId) return null;
        
        // Asumimos que si no han puesto horas de llegada/salida, hacemos un presupuesto base de 8 horas
        const horasParaCalculo = horasOperacionCalculadas > 0 ? horasOperacionCalculadas : 8;

        const response = await fetch('/api/fletes/estimar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tipoCotizacion: 'servicio', // Fuerza la lógica híbrida del backend
                activoPrincipalId: form.values.vehiculoPrincipalId,
                remolqueId: form.values.vehiculoRemolqueId,
                distanciaKm: form.values.distanciaKm || 0,
                horasOperacion: horasParaCalculo,
                cantidadPeajes: form.values.cantidadPeajes || 0,
                precioPeajeUnitario: configPrecios.peaje,
                precioGasoilUsd: configPrecios.gasoil,
                porcentajeGanancia: 0.35, 
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
    <Paper mt={70} p="md">
      <Group mb="lg" justify="space-between">
        <Group>
            <Button variant="default" size="xs" onClick={() => router.back()}><IconArrowLeft size={18} /></Button>
            <Box>
                <Title order={3}>
                {mode === "create" ? "Nueva ODT (Orden de Servicio)" : `Editando ODT #${form.values.nroODT || ''}`}
                </Title>
                {mode === 'edit' && (
                    <Badge color={statusColor} variant="light" size="lg" mt={4}>{form.values.estado}</Badge>
                )}
            </Box>
        </Group>
      </Group>

      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Grid gutter="xl">
            {/* COLUMNA IZQUIERDA (DATOS OPERATIVOS) */}
            <Grid.Col span={{ base: 12, md: 7 }}>
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
                    <SelectClienteConCreacion form={form} fieldName="clienteId" label="Cliente" placeholder='Selecciona un cliente' />
                    
                    <TextInput
                        label="Nro ODT" placeholder="0000" {...form.getInputProps("nroODT")}
                        onBlur={async (e) => {
                            form.getInputProps("nroODT").onBlur(e);
                            if (e.target.value.length === 4) {
                                const err = await validarNumeroUnico(e.target.value);
                                if (err) form.setFieldError('nroODT', 'Ya existe');
                            }
                        }}
                    />

                    <DateInput label="Fecha" valueFormat="DD/MM/YYYY" {...form.getInputProps('fecha')} rightSection={loadingAvailability && <Loader size="xs" />} />
                    
                    <Box style={{ gridColumn: '1 / -1' }}>
                        <Textarea label="Descripción del Servicio" rows={2} {...form.getInputProps('descripcionServicio')} />
                    </Box>

                    {/* NUEVA SECCIÓN: MOVILIZACIÓN (Para el estimador) */}
                    <Box style={{ gridColumn: '1 / -1' }}>
                        <Divider label="Datos Geográficos" labelPosition="center" mb="sm" />
                        <Group grow>
                            <NumberInput 
                                label="Distancia a Locación (Km)" 
                                description="Ida y Vuelta aprox."
                                leftSection={<IconMapPin size={16} />}
                                {...form.getInputProps("distanciaKm")} 
                            />
                            <NumberInput 
                                label="Peajes" 
                                description="Ida y Vuelta"
                                {...form.getInputProps("cantidadPeajes")} 
                            />
                        </Group>
                    </Box>

                    <Box style={{ gridColumn: '1 / -1' }}><Divider label="Control de Tiempos" labelPosition="center" /></Box>

                    <TimeInput label="Salida de Base" description="Salida del portón de la base" {...form.getInputProps('salidaActivosBase')} />
                    <TimeInput label="Retorno a Base" description="Entrada al portón de la base" {...form.getInputProps('llegadaActivosBase')} />
                    
                    <TimeInput label="Llegada a contacto con cliente" description={mode === 'create' ? "(Opcional al despachar)" : "Inicio del Servicio"} {...form.getInputProps('horaLlegada')} />
                    <TimeInput label="Fin de contacto con cliente" description={mode === 'create' ? "(Opcional al despachar)" : "Fin del Servicio"} {...form.getInputProps('horaSalida')} />
                </SimpleGrid>

                <Divider my="xl" label="Asignación de Personal" labelPosition="center" />
                
                <Group justify="space-between" mb={5}>
                    <Text size="sm" fw={500}>Chofer / Operador</Text>
                    <TextInput placeholder="Buscar..." size="xs" w={150} leftSection={<IconSearch size={12} />} value={qChofer} onChange={(e) => setQChofer(e.target.value)} />
                </Group>
                <ODTSelectableGrid
                    label="Chofer"
                    data={empleadosMapeados.filter(e => e.puestos?.some(p => p.nombre.toLowerCase().includes("chofer") || p.nombre.toLowerCase().includes("operador"))).filter(e => e.nombre.toLowerCase().includes(qChofer.toLowerCase()))}
                    onChange={(v) => form.setFieldValue("choferId", v)}
                    value={form.values.choferId}
                />
                
                <Group justify="space-between" mb={5} mt="md">
                    <Text size="sm" fw={500}>Ayudante</Text>
                    <TextInput placeholder="Buscar..." size="xs" w={150} leftSection={<IconSearch size={12} />} value={qAyudante} onChange={(e) => setQAyudante(e.target.value)} />
                </Group>
                <ODTSelectableGrid
                    label="Ayudante"
                    data={empleadosMapeados.filter(e => e.puestos?.some(p => p.nombre.toLowerCase().includes("ayudante"))).filter(e => e.nombre.toLowerCase().includes(qAyudante.toLowerCase()))}
                    onChange={(v) => form.setFieldValue("ayudanteId", v)}
                    value={form.values.ayudanteId}
                />

                <Divider my="xl" label="Asignación de Equipos" labelPosition="center" />
                
                <Group justify="space-between" mb={5}>
                    <Text size="sm" fw={500}>Vehículo Principal / Maquinaria</Text>
                    <TextInput placeholder="Buscar..." size="xs" w={150} leftSection={<IconSearch size={12} />} value={qVehiculo} onChange={(e) => setQVehiculo(e.target.value)} />
                </Group>
                <ODTSelectableGrid
                    label="Vehículo"
                    data={activosMapeados.filter(a => a.tipo === "Vehiculo" || a.tipo === "Maquina").filter(a => a.nombre.toLowerCase().includes(qVehiculo.toLowerCase()))}
                    onChange={(v) => form.setFieldValue("vehiculoPrincipalId", v)}
                    value={form.values.vehiculoPrincipalId}
                />

                <Group justify="space-between" mb={5} mt="md">
                    <Text size="sm" fw={500}>Remolque / Batea</Text>
                    <TextInput placeholder="Buscar..." size="xs" w={150} leftSection={<IconSearch size={12} />} value={qRemolque} onChange={(e) => setQRemolque(e.target.value)} />
                </Group>
                <ODTSelectableGrid
                    label="Remolque"
                    data={activosMapeados.filter(a => a.tipo === "Remolque").filter(a => a.nombre.toLowerCase().includes(qRemolque.toLowerCase()))}
                    onChange={(v) => form.setFieldValue("vehiculoRemolqueId", v)}
                    value={form.values.vehiculoRemolqueId} 
                />
            </Grid.Col>

            {/* COLUMNA DERECHA (ESTIMADOR DE COSTOS DE SERVICIO) */}
            <Grid.Col span={{ base: 12, md: 5 }}>
                <Paper withBorder p="md" bg="blue.0" radius="md" style={{ position: 'sticky', top: '80px' }}>
                    <Group mb="md">
                        <IconCalculator size={24} color="#1c7ed6" />
                        <Title order={4}>Análisis de Costos de la ODT</Title>
                    </Group>

                    {horasOperacionCalculadas > 0 ? (
                        <Badge color="blue" mb="sm" variant="light" size="lg">Tiempo Operativo: {horasOperacionCalculadas.toFixed(1)} Hrs</Badge>
                    ) : (
                        <Text size="xs" c="dimmed" mb="sm">Si no ingresas horas de llegada/salida, el sistema proyecta un turno estándar de 8 horas.</Text>
                    )}

                    {calcLoading ? (
                        <Center my="xl"><Loader /></Center>
                    ) : estimacion ? (
                        <>
                            <Grid gutter="xs">
                                <Grid.Col span={8}><Text size="sm">Combustible (Movilización + Operación):</Text></Grid.Col>
                                <Grid.Col span={4}><Text size="sm" ta="right">${estimacion.breakdown?.combustible?.toFixed(2)}</Text></Grid.Col>

                                <Grid.Col span={8}><Text size="sm">Mantenimiento (Rodamiento + PTO):</Text></Grid.Col>
                                <Grid.Col span={4}><Text size="sm" ta="right">${estimacion.breakdown?.mantenimiento?.toFixed(2)}</Text></Grid.Col>

                                <Grid.Col span={8}><Text size="sm">Posesión (Depreciación + Seguros):</Text></Grid.Col>
                                <Grid.Col span={4}><Text size="sm" ta="right">${estimacion.breakdown?.posesion?.toFixed(2)}</Text></Grid.Col>

                                <Grid.Col span={8}><Text size="sm">Operativos (Nómina, Peajes):</Text></Grid.Col>
                                <Grid.Col span={4}><Text size="sm" ta="right">${estimacion.breakdown?.operativos?.toFixed(2)}</Text></Grid.Col>

                                <Grid.Col span={12}><Divider my="xs" /></Grid.Col>

                                <Grid.Col span={7}><Text fw={700}>Costo Operativo Real:</Text></Grid.Col>
                                <Grid.Col span={5}><Text fw={700} ta="right" c="red.9">${estimacion.costoTotal?.toFixed(2)}</Text></Grid.Col>

                                <Grid.Col span={7}><Text size="xl" fw={900} c="green.9">TARIFA ODT:</Text></Grid.Col>
                                <Grid.Col span={5}><Text size="xl" fw={900} ta="right" c="green.9">${estimacion.precioSugerido?.toFixed(2)}</Text></Grid.Col>
                            </Grid>

                            <Alert mt="xl" color="teal" variant="filled" icon={<IconClockHour4 size={20}/>}>
                                <Group justify="space-between">
                                    <Text fw={700}>Costo Sugerido por Hora:</Text>
                                    <Text size="xl" fw={900}>
                                        ${(estimacion.precioSugerido / (horasOperacionCalculadas > 0 ? horasOperacionCalculadas : 8)).toFixed(2)} / hr
                                    </Text>
                                </Group>
                            </Alert>
                        </>
                    ) : (
                        <Text c="dimmed" ta="center" my="xl">Seleccione un vehículo principal para calcular los costos operativos de esta ODT.</Text>
                    )}
                </Paper>
            </Grid.Col>
        </Grid>

        {/* BOTONERA INFERIOR (MANTENIDA INTACTA) */}
        <Group mt="xl" justify="flex-end" style={{ position: 'sticky', bottom: 0, background: 'white', padding: '15px 0', borderTop: '1px solid #eee', zIndex: 10 }}>
          {mode === 'create' && (
            <Button size="xl" type="submit" loading={loadingInit} color="blue" leftSection={<IconTruck size={24} />}>
              Despachar Unidad (Crear ODT)
            </Button>
          )}

          {mode === 'edit' && (
            <Group>
              <Button size="lg" variant="default" onClick={() => handleSubmit(form.values)}>
                Guardar Cambios
              </Button>

              {!isFinalizada ? (
                  <Button
                    size="lg"
                    color="green"
                    leftSection={<IconCheck size={20} />}
                    onClick={() => {
                      if (!form.values.horaLlegada || !form.values.horaSalida) {
                        notifications.show({ title:"Faltan datos", message: "Ingresa horas de Llegada y Salida para finalizar", color: 'red' });
                        return;
                      }
                      const valuesClosing = { ...form.values, estado: 'Finalizada' };
                      handleSubmit(valuesClosing);
                    }}
                  >
                    Finalizar ODT
                  </Button>
              ) : (
                  <Button
                    size="lg"
                    color="orange"
                    variant="light"
                    leftSection={<IconLockOpen size={20} />}
                    onClick={() => {
                        const valuesReopening = { ...form.values, estado: 'En Curso' };
                        handleSubmit(valuesReopening);
                    }}
                  >
                    Reabrir ODT
                  </Button>
              )}
            </Group>
          )}
        </Group>
      </form>
    </Paper>
  );
}