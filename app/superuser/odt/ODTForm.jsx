"use client";

import { useState, useEffect, useMemo } from "react";
import { TextInput, Textarea, Button, Paper, Title, Center, SimpleGrid, Box, Divider } from "@mantine/core";
import { useAuth } from "@/hooks/useAuth";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { DateInput, TimeInput } from "@mantine/dates";
import '@mantine/dates/styles.css';
import ODTSelectableGrid from "./ODTSelectableGrid";
import { SelectClienteConCreacion } from "../contratos/SelectClienteConCreacion";
import { useRouter } from "next/navigation";

export default function ODTForm({ mode = "create", odtId }) {
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);
  const { nombre } = useAuth();
  
  // Inicializamos como arrays vacíos para evitar errores de .map antes de cargar
  const [empleados, setEmpleados] = useState([]);
  const [activos, setActivos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const form = useForm({
    initialValues: {
      nroODT: "",
      fecha: null,
      descripcionServicio: "",
      horaLlegada: "",
      horaSalida: "",
      clienteId: "",
      vehiculosPrincipales: [],
      vehiculosRemolque: [],
      choferes: [],
      ayudantes: [],
    },
    validate: {
      // Corregidas las validaciones para que usen el 'value' recibido
      nroODT: (value) => (value?.trim().length === 4 ? null : "El número de ODT debe ser de 4 caracteres"),
      fecha: (value) => (value ? null : "Debe ingresar la fecha de ODT"),
      horaLlegada: (value) => (value ? null : "Debe ingresar la hora de llegada"),
      horaSalida: (value) => (value ? null : "Debe ingresar la hora de salida"),
    },
  });

  useEffect(() => {
    const cargarDatosIniciales = async () => {
      try {
        const [resEmp, resAct, resCli] = await Promise.all([
          fetch(`/api/rrhh/empleados`).then(r => r.json()),
          fetch(`/api/gestionMantenimiento/activos`).then(r => r.json()),
          fetch(`/api/contratos/clientes`).then(r => r.json())
        ]);

        setEmpleados(resEmp || []);
        setActivos(resAct.success ? resAct.data : []);
        setClientes(resCli || []);
      } catch (error) {
        notifications.show({ title: "Error", message: "No se pudieron cargar los datos", color: "red" });
      }
    };

    cargarDatosIniciales();
  }, []);

  useEffect(() => {
    if (mode === "edit" && odtId) {
      fetch(`/api/odts/${odtId}`)
        .then((res) => res.json())
        .then((data) => form.setValues({ ...data, fecha: new Date(data.fecha) }));
    }
  }, [mode, odtId]);

  // --- REFACTORIZACIÓN DE MAPEO DE ACTIVOS ---
  // Usamos useMemo para no procesar la lista en cada render
  const activosMapeados = useMemo(() => {
    return activos.map(v => {
      let nombreDisplay = v.codigoInterno;
      let placa = "";

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
        imagen: v.imagen,
        tipo: v.tipoActivo
      };
    });
  }, [activos]);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const url = mode === "create" ? "/api/odts" : `/api/odts/${odtId}`;
      const method = mode === "create" ? "POST" : "PUT";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) throw new Error("Error en la respuesta del servidor");

      notifications.show({
        title: mode === "create" ? "ODT creada" : "ODT actualizada",
        color: "green",
      });
      router.push("/superuser/odt");
    } catch (error) {
      notifications.show({ title: "Error", message: error.message, color: "red" });
    } finally {
      setLoading(false);
    }
  };

  // Evitamos renderizar hasta que los datos mínimos estén
  if (loading && activos.length === 0) return (
    <Center h="94vh"><Loader size="xl" /></Center>
  );

  return (
    <Paper mt={70} p="md">
      <Title align="center" order={3} mb="lg">
        {mode === "create" ? "Nueva ODT" : "Editar ODT"}, registrada por: {nombre}
      </Title>
      
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
          <SelectClienteConCreacion form={form} fieldName="clienteId" label="Cliente" placeholder='Selecciona un cliente' />

          <TextInput label="Nro ODT" placeholder="0000" {...form.getInputProps("nroODT")} />
          
          <DateInput label="Fecha de ODT" valueFormat="DD/MM/YYYY" placeholder="Seleccione fecha" {...form.getInputProps('fecha')} />
          
          <Textarea label="Descripción del servicio" placeholder="Detalles del trabajo..." {...form.getInputProps('descripcionServicio')} />
          
          <TimeInput label="Hora de llegada" {...form.getInputProps('horaLlegada')} />
          
          <TimeInput label="Hora de Salida" {...form.getInputProps('horaSalida')} />

          {/* Sección de Personal */}
          <Box>
            <ODTSelectableGrid
              label="Choferes"
              data={empleados.map(e => ({
                id: e.id,
                nombre: `${e.nombre} ${e.apellido}`,
                imagen: e.imagen,
                puestos: e.puestos,
              }))}
              onChange={(values) => form.setFieldValue("choferes", values)}
              value={form.values.choferes}
            />
            <Divider my="sm" />
          </Box>

          <Box>
            <ODTSelectableGrid
              label="Ayudantes"
              data={empleados.map(e => ({
                id: e.id,
                nombre: `${e.nombre} ${e.apellido}`,
                imagen: e.imagen,
                puestos: e.puestos,
              }))}
              onChange={(values) => form.setFieldValue("ayudantes", values)}
              value={form.values.ayudantes}
            />
            <Divider my="sm" />
          </Box>

          {/* Sección de Activos Refactorizada */}
          <Box>
            <ODTSelectableGrid
              label="Vehículos Principales (Chutos/Camiones)"
              data={activosMapeados.filter(a => a.tipo === "Vehiculo")}
              onChange={(values) => form.setFieldValue("vehiculosPrincipales", values)}
              value={form.values.vehiculosPrincipales}
            />
            <Divider my="sm" />
          </Box>

          <Box>
            <ODTSelectableGrid
              label="Remolques / Equipos"
              data={activosMapeados.filter(a => a.tipo === "Remolque")}
              onChange={(values) => form.setFieldValue("vehiculosRemolque", values)}
              value={form.values.vehiculosRemolque}
            />
            <Divider my="sm" />
          </Box>
        </SimpleGrid>

        <Button fullWidth size="md" mt="xl" loading={loading} type="submit">
          {mode === "create" ? "Crear ODT" : "Actualizar ODT"}
        </Button>
      </form>
    </Paper>
  );
}