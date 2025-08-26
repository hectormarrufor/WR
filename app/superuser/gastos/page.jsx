'use client';

import { useState, useEffect } from 'react';
import {
  Container, Title, TextInput, NumberInput, Select, Button, Table, Group, Divider,
  Paper
} from '@mantine/core';

export default function GastosPage() {
  const [gastos, setGastos] = useState([]);
  const [nuevo, setNuevo] = useState({
    nombre: '',
    categoria: '',
    montoMensual: 0,
    fechaInicio: new Date().toISOString().split('T')[0]
  });

  const categorias = ['Servicios básicos', 'Impuestos', 'Tecnología', 'Vehículos de apoyo', 'Profesionales', 'Otros'];

  useEffect(() => {
    fetch('/api/fixed-expenses')
      .then((res) => res.json())
      .then(setGastos);
  }, []);

  const handleCrear = async () => {
    const res = await fetch('/api/fixed-expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nuevo)
    });
    const creado = await res.json();
    setGastos((prev) => [...prev, creado]);
    setNuevo({ nombre: '', categoria: '', montoMensual: 0, fechaInicio: new Date().toISOString().split('T')[0] });
  };

  const handleEditar = async (id, monto) => {
    await fetch('/api/fixed-expenses', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, montoMensual: !monto ? 0 : monto })
    });
    setGastos((prev) =>
      prev.map((g) => (g.id === id ? { ...g, montoMensual: !monto ? 0 : monto } : g))
    );
  };

  const handleEliminar = async (id) => {
    await fetch('/api/fixed-expenses', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    setGastos((prev) => prev.filter((g) => g.id !== id));
  };

  return (
    <Container size="md" py="xl">
      <Paper  shadow="xl" p="xl" >
          <Title order={2} mb="lg">Gestión de gastos fijos</Title>
          <Divider label="Registrar nuevo gasto" mb="md" />
          <Group grow mb="lg">
            <TextInput label="Nombre" value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.currentTarget.value })} />
            <Select label="Categoría" data={categorias} value={nuevo.categoria} onChange={(val) => setNuevo({ ...nuevo, categoria: val })} />
            <NumberInput label="Monto mensual ($)" value={nuevo.montoMensual} onChange={(val) => setNuevo({ ...nuevo, montoMensual: val })} />
          </Group>
          <Button onClick={handleCrear}>Agregar gasto</Button>
          <Divider label="Gastos activos" mt="xl" mb="md" />
          <Table striped highlightOnHover>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Categoría</th>
                <th>Monto mensual ($)</th>
                <th>Editar</th>
                <th>Eliminar</th>
              </tr>
            </thead>
            <tbody>
              {gastos.map((g) => (
                <tr key={g.id}>
                  <td>{g.nombre}</td>
                  <td>{g.categoria}</td>
                  <td>{g.montoMensual.toFixed(2)}</td>
                  <td>
                    <NumberInput
                      value={g.montoMensual}
                      onChange={(val) => handleEditar(g.id, val)}
                      hideControls
                      size="xs"
                    />
                  </td>
                  <td>
                    <Button size="xs" color="red" onClick={() => handleEliminar(g.id)}>Eliminar</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
      </Paper>
    </Container>
  );
}