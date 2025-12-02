"use client";

import { useState, useEffect } from "react";
import { TextInput, Textarea, Button, Paper, Title, Center, SimpleGrid, Box, Divider, Card, Avatar, Group, Text } from "@mantine/core";
import { useAuth } from "@/hooks/useAuth";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { DateInput, TimeInput } from "@mantine/dates";
import '@mantine/dates/styles.css';
import ODTSelectableGrid from "./ODTSelectableGrid";
import { AsyncComboBox } from "../inventario/consumibles/AsyncCombobox";
import ClienteSelect from "./ClienteSelect";
import { SelectClienteConCreacion } from "../contratos/SelectClienteConCreacion";


export default function ODTForm({ mode, odtId }) {
  const [isMobile, setIsMobile] = useState(false);
  const { nombre } = useAuth();
  const [empleados, setEmpleados] = useState();
  const [activos, setActivos] = useState();
  const [clientes, setClientes] = useState();

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);

    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const form = useForm({
    initialValues: {
      nroODT: "",
      fecha: "",
      descripcionServicio: "",
      horaLlegada: "",
      horaSalida: "",
      clienteId: "",
      vehiculosPrincipales: [],
      vehiculosRemolque: [],
      choferes: [],
      ayudantes: [],
    },
    // 'validate' es el lugar para TODAS las funciones de validación.
    validate: {
      nroODT: (value) => { value.trim() === 4 ? null : "El numero de ODT es de 4 caracteres" },
      fecha: (value) => { fecha.trim() > 0 ? null : "debe ingresar la fecha de ODT" },
      horaLlegada: (value) => { horaLlegada.trim() > 0 ? null : "debe ingresar la hora de llegada de la ODT" },
      horaSalida: (value) => { horaSalida.trim() > 0 ? null : "debe ingresar la hora de salida de la ODT" },

    },
  });

  useEffect(() => {
    notifications.show({ title: "solicitando datos" })
    try {
      fetch(`/api/rrhh/empleados`)
        .then((res) => res.json())
        .then((data) => setEmpleados(data));
      fetch(`/api/gestionMantenimiento/activos`)
        .then((res) => res.json())
        .then((data) => setActivos(data));
      fetch(`/api/contratos/clientes`)
        .then((res) => res.json())
        .then((data) => setClientes(data));
    }
    catch (error) {
      notifications.show({ title: "No se pudo cargar los datos" })
    }
  }, [])



  useEffect(() => {
    console.log(form.values);

  }, [form])

  

  useEffect(() => {
    if (mode === "edit" && odtId) {
      fetch(`/api/odts/${odtId}`)
        .then((res) => res.json())
        .then((data) => form.setValues(data));
    }
  }, [mode, odtId]);

  const handleSubmit = async () => {
    const url = mode === "create" ? "/api/odts" : `/api/odts/${odtId}`;
    const method = mode === "create" ? "POST" : "PUT";

    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form.values),
    });
  };

  if (!empleados || !activos) return (
    <Center h="94vh">
      <Paper centered>
        <Title>Cargando</Title>
      </Paper>
    </Center>
  )

  return (
    <Paper mt={70}>
      <Title centered justify="center" align="center" order={3}>Nueva ODT, registrada por: {nombre}</Title>
      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
        <SimpleGrid cols={isMobile ? 1 : 2} spacing="lg" padding="lg">
          <SelectClienteConCreacion form={form} fieldName="clienteId" label="Cliente" placeholder='Selecciona un cliente' disabled={false} />

          



          <TextInput label="Nro ODT"  {...form.getInputProps("nroODT")} />
          <DateInput label="Fecha de ODT" valueFormat="DD/MM/YYYY"  {...form.getInputProps('fecha')} />
          <Textarea label="Descripción del servicio" {...form.getInputProps('descripcionServicio')} />
          <TimeInput
            label="Hora de llegada"
            format="24" // formato de 24 horas
            {...form.getInputProps('horaLlegada')}
          />
          <TimeInput label="Hora de Salida"
            format="24" // formato de 24 horas
            {...form.getInputProps('horaSalida')}
          />
          {/* Aquí puedes añadir selects para cliente, vehículos y empleados */}
          <Box>
            <ODTSelectableGrid
              label="Choferes"
              data={empleados.map(e => ({
                id: e.id,
                nombre: e.nombre + " " + e.apellido,
                imagen: e.imagen,
                puestos: e.puestos,
              }))}
              onChange={(values) => form.setFieldValue("choferes", values)}
            />
            <Divider my="sm" />
          </Box>
          <Box>
            <ODTSelectableGrid
              label="Ayudantes"
              data={empleados.map(e => ({
                id: e.id,
                nombre: e.nombre + " " + e.apellido,
                imagen: e.imagen,
                puestos: e.puestos,
              }))}
              onChange={(values) => form.setFieldValue("ayudantes", values)}
            />
            <Divider my="sm" />
          </Box>
          <Box>
            <ODTSelectableGrid
              label="Vehículos Principales"
              data={activos.map(v => ({
                id: v.id,
                nombre: v.modelo.nombre + v.datosPersonalizados.placa,
                imagen: v.imagen,
              }))}
              onChange={(values) => form.setFieldValue("vehiculosPrincipales", values)}
            />
            <Divider my="sm" />
          </Box>
          <Box>
            <ODTSelectableGrid
              label="Vehículos Principales"
              data={activos.map(v => ({
                id: v.id,
                nombre: v.modelo.nombre + v.datosPersonalizados.placa,
                imagen: v.imagen,
              }))}
              onChange={(values) => form.setFieldValue("vehiculosRemolque", values)}
            />
            <Divider my="sm" />
          </Box>
        </SimpleGrid>
        <Button type="submit">{mode === "create" ? "Crear ODT" : "Actualizar ODT"}</Button>
      </form>
    </Paper>
  );
}