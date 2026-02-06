"use client";

import { useState, useEffect, useMemo } from "react";
import { TextInput, Textarea, Button, Paper, Title, Center, SimpleGrid, Box, Divider, Group, Loader, Badge, Text } from "@mantine/core";
import { useAuth } from "@/hooks/useAuth";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { DateInput, TimeInput } from "@mantine/dates";
import { IconArrowLeft, IconSearch, IconTruck } from "@tabler/icons-react";
import { format, addDays, parseISO } from "date-fns";
import '@mantine/dates/styles.css';
import ODTSelectableGrid from "./ODTSelectableGrid";
import { SelectClienteConCreacion } from "../contratos/SelectClienteConCreacion";
import { useRouter } from "next/navigation";

// --- HELPERS DE FECHAS ---

// Crea un objeto Date base
const createDateTime = (fechaDate, horaString) => {
  if (!fechaDate || !horaString) return null;
  const d = new Date(fechaDate);
  const [hours, minutes] = horaString.split(':').map(Number);
  d.setHours(hours, minutes, 0, 0);
  return d;
};

// Lógica inteligente para la fecha de FIN
// Si horaSalida es menor que horaLlegada (ej: 08:00 < 15:00), asumimos día siguiente.
const calculateEndDateTime = (fechaDate, horaLlegadaStr, horaSalidaStr) => {
  if (!fechaDate || !horaLlegadaStr || !horaSalidaStr) return null;

  let end = createDateTime(fechaDate, horaSalidaStr);
  const start = createDateTime(fechaDate, horaLlegadaStr);

  // Si la salida es "menor" a la entrada, es el día siguiente
  if (end < start) {
    end = addDays(end, 1);
  }
  return end;
};

// --- HELPERS DE ESTADO Y ORDENAMIENTO ---

const getEstadoConfig = (estado, tipo = 'empleado') => {
  // Definimos colores según el Enum
  const colors = {
    // Empleados
    'Activo': 'green',
    'Vacaciones': 'cyan',
    'Reposo Medico': 'red',
    'Permiso': 'orange',
    'Suspendido': 'gray',
    'Inactivo': 'gray',
    'Retirado': 'dark',
    // Activos
    'Operativo': 'green',
    'En Mantenimiento': 'orange',
    'Inactivo': 'gray',
    'Desincorporado': 'red'
  };
  return { color: colors[estado] || 'gray', label: estado };
};

// Función de ordenamiento: Prioridad a los disponibles (Verdes), luego el resto
const sortPorDisponibilidad = (a, b) => {
  const priority = ['Activo', 'Operativo'];
  const aEsPrioritario = priority.includes(a.estadoRaw);
  const bEsPrioritario = priority.includes(b.estadoRaw);

  if (aEsPrioritario && !bEsPrioritario) return -1; // a va primero
  if (!aEsPrioritario && bEsPrioritario) return 1;  // b va primero
  return 0; // igual prioridad
};


export default function ODTForm({ mode = "create", odtId }) {
  const router = useRouter();
  const { nombre, apellido, userId } = useAuth();

  const [empleados, setEmpleados] = useState([]);
  const [activos, setActivos] = useState([]);
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
      cliente: null,
      choferEntradaBase: null,
      choferSalidaBase: null,
      ayudanteEntradaBase: null,
      ayudanteSalidaBase: null,
      salidaActivosBase: null,  // <--- NUEVO
      llegadaActivosBase: null, // <--- NUEVO
    },
    validate: {
      fecha: (value) => (value ? null : "Fecha requerida"),
      // NOTA: Eliminamos la validación que impedía salida < llegada
    },
  });

  // 1. Carga Inicial
  useEffect(() => {
    const cargarDatosIniciales = async () => {
      try {
        const [resEmp, resAct] = await Promise.all([
          fetch(`/api/rrhh/empleados`).then(r => r.json()),
          fetch(`/api/gestionMantenimiento/activos`).then(r => r.json()),
        ]);
        setEmpleados(resEmp || []);
        setActivos(resAct.success ? resAct.data : []);
      } catch (error) { notifications.show({ title: "Error", message: "Error cargando datos", color: "red" }); }
      finally { setLoadingInit(false); }
    };
    cargarDatosIniciales();
  }, []);

  // 2. Modo Edición
  useEffect(() => {
    if (mode === "edit" && odtId) {
      fetch(`/api/odts/${odtId}`).then(r => r.json()).then(data => {
        // Ajustar fecha para evitar UTC issues, usar la fecha local que viene
        // data.fecha suele ser YYYY-MM-DD
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
        });
      });
    }
  }, [mode, odtId]);

  // 3. Listener Disponibilidad (Fetch)
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


  // --- MAPEO DE DATOS CON BADGES Y ORDENAMIENTO ---

  const empleadosMapeados = useMemo(() => {
    return empleados
      .map(e => {
        const config = getEstadoConfig(e.estado);
        return {
          id: e.id,
          nombre: `${e.nombre} ${e.apellido}`,
          imagen: e.imagen,
          puestos: e.puestos,
          estadoRaw: e.estado, // Para ordenar
          badge: config.label, // Para mostrar
          badgeColor: config.color // Para mostrar
        };
      })
      .sort(sortPorDisponibilidad);
  }, [empleados]);

  const activosMapeados = useMemo(() => {
    return activos
      .map(v => {
        let nombreDisplay = v.codigoInterno;
        let placa = "";
        if (v.vehiculoInstancia) {
          nombreDisplay = `${v.vehiculoInstancia.plantilla.marca} ${v.vehiculoInstancia.plantilla.modelo}`;
          placa = v.vehiculoInstancia.placa;
        } else if (v.remolqueInstancia) {
          nombreDisplay = `${v.remolqueInstancia.plantilla.marca} ${v.remolqueInstancia.plantilla.modelo}`;
          placa = v.remolqueInstancia.placa;
        } else if (v.maquinaInstancia) {
          nombreDisplay = `${v.maquinaInstancia.plantilla.marca} ${v.maquinaInstancia.plantilla.modelo}`;
          placa = v.maquinaInstancia.placa;
        }

        const config = getEstadoConfig(v.estado, 'activo');

        return {
          id: v.id,
          nombre: `${nombreDisplay} (${placa})`,
          imagen: v.imagen,
          tipo: v.tipoActivo,
          estadoRaw: v.estado,
          badge: config.label,
          badgeColor: config.color
        };
      })
      .sort(sortPorDisponibilidad);
  }, [activos]);


  // --- VALIDACIONES ---

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
    // 1. Calculamos los rangos de la NUEVA ODT
    // Usamos la función que detecta cross-day
    const newStart = createDateTime(values.fecha, values.horaLlegada);
    const newEnd = calculateEndDateTime(values.fecha, values.horaLlegada, values.horaSalida);

    if (!newStart || !newEnd) return null;

    for (const odt of dayOdts) {
      if (mode === "edit" && String(odt.id) === String(odtId)) continue;

      // 2. Calculamos los rangos de la ODT EXISTENTE
      // IMPORTANTE: 'odt.fecha' viene de la BD (String YYYY-MM-DD)
      // Debemos parsear esa fecha base, no usar values.fecha, porque 'odt' puede ser de ayer
      const [y, m, d] = odt.fecha.split('-').map(Number);
      const fechaBaseOdt = new Date(y, m - 1, d); // Mes es 0-indexado en JS Date

      const existingStart = createDateTime(fechaBaseOdt, odt.horaLlegada?.substring(0, 5));
      const existingEnd = calculateEndDateTime(fechaBaseOdt, odt.horaLlegada?.substring(0, 5), odt.horaSalida?.substring(0, 5));

      // 3. Chequeo de solapamiento
      const haySolapamientoTiempo = (newStart < existingEnd && newEnd > existingStart);

      if (haySolapamientoTiempo) {
        // Construimos mensaje de error detallado
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

      // --- CAMBIO AQUÍ: SANITIZACIÓN DE DATOS ---
      // Convertimos cadenas vacías "" a null para que PostgreSQL no falle
      const payload = {
        ...values,
        nombreCreador: nombre + " " + apellido,
        userId,
        fecha: format(values.fecha, 'yyyy-MM-dd'),

        // Limpiamos las horas: Si es "" o undefined, mandamos null
        horaLlegada: values.horaLlegada || null,
        horaSalida: values.horaSalida || null,

        choferEntradaBase: values.choferEntradaBase || null,
        choferSalidaBase: values.choferSalidaBase || null,

        ayudanteEntradaBase: values.ayudanteEntradaBase || null,
        ayudanteSalidaBase: values.ayudanteSalidaBase || null,
      };
      // ------------------------------------------

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Error en servidor");
      notifications.show({ title: "Éxito", message: "Guardado correctamente", color: "green" });
      router.push("/superuser/odt");
    } catch (e) {
      notifications.show({ title: "Error", message: e.message, color: "red" });
    }
  };


  if (loadingInit) return <Center h="94vh"><Loader size="xl" /></Center>;

  return (
    <Paper mt={70} p="md">
      <Group mb="lg">
        <Button variant="default" size="xs" onClick={() => router.back()}><IconArrowLeft size={18} /></Button>
        <Title order={3} style={{ flex: 1, textAlign: 'center' }}>
          {mode === "create" ? "Nueva ODT" : "Editar ODT"}
        </Title>
        <Box w={34} />
      </Group>

      <form onSubmit={form.onSubmit(handleSubmit)}>
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
          <Textarea label="Descripción" {...form.getInputProps('descripcionServicio')} />
          <Divider my="md" />
          <Divider my="md" />
          <TimeInput
            label="Salida de Base"
            description="Salida del portón de la base"
            {...form.getInputProps('salidaActivosBase')}
          />
          <TimeInput
            label="Retorno a Base"
            description="Entrada al portón de la base"
            {...form.getInputProps('llegadaActivosBase')}
          />
          <TimeInput
            label="Llegada a contacto con cliente"
            description={mode === 'create' ? "(Opcional al despachar)" : ""}
            {...form.getInputProps('horaLlegada')}
          />
          <TimeInput
            label="Fin de contacto con cliente"
            description={mode === 'create' ? "(Opcional al despachar)" : ""}
            {...form.getInputProps('horaSalida')}
          />
          <Divider my="md" />
          <Divider my="md" />

          {/* --- CHOFER --- */}
          <Box>
            <Group justify="space-between" mb={5}>
              <Text size="sm" fw={500}>Chofer</Text>
              <TextInput placeholder="Buscar..." size="xs" w={150} leftSection={<IconSearch size={12} />}
                value={qChofer} onChange={(e) => setQChofer(e.target.value)} />
            </Group>
            <ODTSelectableGrid
              label="Chofer"
              data={empleadosMapeados
                .filter(e => e.puestos?.some(p => p.nombre.toLowerCase().includes("chofer")))
                .filter(e => e.nombre.toLowerCase().includes(qChofer.toLowerCase()))}
              onChange={(v) => form.setFieldValue("choferId", v)}
              value={form.values.choferId}
            />
            {form.values.choferId && (
              <Group grow mt="xs">
                <TimeInput
                  label="Entrada Base"
                  size="xs"
                  {...form.getInputProps('choferEntradaBase')}
                />
                <TimeInput
                  label="Salida Base"
                  size="xs"
                  {...form.getInputProps('choferSalidaBase')}
                />
              </Group>
            )}
            <Divider my="sm" />
          </Box>

          {/* --- AYUDANTE --- */}
          <Box>
            <Group justify="space-between" mb={5}>
              <Text size="sm" fw={500}>Ayudante</Text>
              <TextInput placeholder="Buscar..." size="xs" w={150} leftSection={<IconSearch size={12} />}
                value={qAyudante} onChange={(e) => setQAyudante(e.target.value)} />
            </Group>
            <ODTSelectableGrid
              label="Ayudante"
              data={empleadosMapeados
                .filter(e => e.puestos?.some(p => p.nombre.toLowerCase().includes("ayudante")))
                .filter(e => e.nombre.toLowerCase().includes(qAyudante.toLowerCase()))}
              onChange={(v) => form.setFieldValue("ayudanteId", v)}
              value={form.values.ayudanteId}
            />
            {form.values.ayudanteId && (
              <Group grow mt="xs">
                <TimeInput
                  label="Entrada Base"
                  size="xs"
                  {...form.getInputProps('ayudanteEntradaBase')}
                />
                <TimeInput
                  label="Salida Base"
                  size="xs"
                  {...form.getInputProps('ayudanteSalidaBase')}
                />
              </Group>
            )}
            <Divider my="sm" />
          </Box>

          {/* --- VEHICULO --- */}
          <Box>
            <Group justify="space-between" mb={5}>
              <Text size="sm" fw={500}>Vehículo Principal</Text>
              <TextInput placeholder="Buscar..." size="xs" w={150} leftSection={<IconSearch size={12} />}
                value={qVehiculo} onChange={(e) => setQVehiculo(e.target.value)} />
            </Group>
            <ODTSelectableGrid
              label="Vehículo"
              data={activosMapeados
                .filter(a => a.tipo === "Vehiculo")
                .filter(a => a.nombre.toLowerCase().includes(qVehiculo.toLowerCase()))}
              onChange={(v) => form.setFieldValue("vehiculoPrincipalId", v)}
              value={form.values.vehiculoPrincipalId}
            />
            <Divider my="sm" />
          </Box>

          {/* --- REMOLQUE --- */}
          <Box>
            <Group justify="space-between" mb={5}>
              <Text size="sm" fw={500}>Remolque</Text>
              <TextInput placeholder="Buscar..." size="xs" w={150} leftSection={<IconSearch size={12} />}
                value={qRemolque} onChange={(e) => setQRemolque(e.target.value)} />
            </Group>
            <ODTSelectableGrid
              label="Remolque"
              data={activosMapeados
                .filter(a => a.tipo === "Remolque")
                .filter(a => a.nombre.toLowerCase().includes(qRemolque.toLowerCase()))}
              onChange={(v) => form.setFieldValue("vehiculoRemolqueId", v)}
              value={form.values.vehiculoRemolqueId} />
            <Divider my="sm" />
          </Box>

          {/* --- MAQUINARIA --- */}
          <Box>
            <Group justify="space-between" mb={5}>
              <Text size="sm" fw={500}>Maquinaria</Text>
              <TextInput placeholder="Buscar..." size="xs" w={150} leftSection={<IconSearch size={12} />}
                value={qMaquinaria} onChange={(e) => setQMaquinaria(e.target.value)} />
            </Group>
            <ODTSelectableGrid
              label="Maquinaria"
              data={activosMapeados
                .filter(a => a.tipo === "Maquina")
                .filter(a => a.nombre.toLowerCase().includes(qMaquinaria.toLowerCase()))}
              onChange={(v) => form.setFieldValue("maquinariaId", v)}
              value={form.values.maquinariaId} />
            <Divider my="sm" />
          </Box>

        </SimpleGrid>



        {/* BOTONERA INTELIGENTE */}
        <Group mt="xl" justify="flex-end">

          {/* CASO 1: MODO CREACIÓN (Despacho) */}
          {mode === 'create' && (
            <Button
              size="md"
              type="submit"
              loading={loadingInit}
              color="blue"
              leftSection={<IconTruck size={20} />}
            >
              Despachar Unidad (Abrir ODT)
            </Button>
          )}

          {/* CASO 2: EDICIÓN DE ODT EN CURSO */}
          {mode === 'edit'
          // &&           form.values.estado === 'En Curso' 
          && (
            <Group>
              <Button
                variant="default"
                onClick={() => handleSubmit(form.values)} // Guarda cambios sin cerrar
              >
                Guardar Cambios
              </Button>
              <Button
                color="green"
                leftSection={<IconCheck size={20} />}
                onClick={() => {
                  // Validación manual antes de cerrar
                  if (!form.values.horaLlegada || !form.values.horaSalida) {
                    notifications.show({ message: "Debes ingresar las horas para finalizar", color: 'red' });
                    return;
                  }
                  // Forzamos el cambio de estado y enviamos
                  form.setFieldValue('estado', 'Finalizada');
                  // Usamos un timeout pequeño para asegurar que el estado se actualizó o pasamos el valor directo
                  const valuesClosing = { ...form.values, estado: 'Finalizada' };
                  handleSubmit(valuesClosing);
                }}
              >
                Finalizar ODT (Cerrar)
              </Button>
            </Group>
          )}

          {/* CASO 3: ODT YA FINALIZADA (Solo ver/editar correcciones) */}
          {mode === 'edit' 
          // && form.values.estado === 'Finalizada' 
          && (
            <Button type="submit" color="blue">Actualizar Datos</Button>
          )}
        </Group>
      </form>
    </Paper>
  );
}