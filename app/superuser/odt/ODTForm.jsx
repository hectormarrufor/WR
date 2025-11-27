"use client";

import { useState, useEffect } from "react";
import { TextInput, Textarea, Button, Paper, Title } from "@mantine/core";
import { useAuth } from "@/hooks/useAuth";
import { useForm } from "@mantine/form";

export default function ODTForm({ mode, odtId }) {
  const { nombre } = useAuth();
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
      nroODT: (value) => {value.trim() === 4 ? null : "El numero de ODT es de 4 caracteres"},
      fecha: (value) => {fecha.trim() > 0 ? null : "debe ingresar la fecha de ODT"},
      horaLlegada: (value) => {horaLlegada.trim() > 0 ? null : "debe ingresar la hora de llegada de la ODT"},
      horaSalida: (value) => {horaSalida.trim() > 0 ? null : "debe ingresar la hora de salida de la ODT"},

    },
  });

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
      body: JSON.stringify(form),
    });
  };

  return (
    <Paper mt={70}>
      <Title centered justify="center" align="center" order={3}>Nueva ODT, registrada por: {nombre}</Title>
      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>

        <TextInput label="Nro ODT" value={form.nroODT} onChange={(e) => setForm({ ...form, nroODT: e.target.value })} />
        <TextInput label="Fecha" type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
        <Textarea label="Descripción del servicio" value={form.descripcionServicio} onChange={(e) => setForm({ ...form, descripcionServicio: e.target.value })} />
        <TextInput label="Hora llegada" type="time" value={form.horaLlegada} onChange={(e) => setForm({ ...form, horaLlegada: e.target.value })} />
        <TextInput label="Hora salida" type="time" value={form.horaSalida} onChange={(e) => setForm({ ...form, horaSalida: e.target.value })} />
        {/* Aquí puedes añadir selects para cliente, vehículos y empleados */}
        
        <Button type="submit">{mode === "create" ? "Crear ODT" : "Actualizar ODT"}</Button>
      </form>
    </Paper>
  );
}