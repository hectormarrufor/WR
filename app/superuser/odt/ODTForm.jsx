"use client";

import { useState, useEffect } from "react";
import { TextInput, Textarea, Button, Paper } from "@mantine/core";

export default function ODTForm({ mode, odtId }) {
  const [form, setForm] = useState({
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
  });

  useEffect(() => {
    if (mode === "edit" && odtId) {
      fetch(`/api/odts/${odtId}`)
        .then((res) => res.json())
        .then((data) => setForm(data));
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