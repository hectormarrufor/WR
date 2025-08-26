'use client';

import { useState, useEffect } from 'react';
import {
  Container, Title, NumberInput, Button, Group, Card, Text, Divider, TextInput
} from '@mantine/core';

export default function NuevaEstimacionPage() {
  const [nombre, setNombre] = useState('');
  const [params, setParams] = useState(null);
  const [totalGastosMensuales, setTotalGastosMensuales] = useState(0)
  const [inputs, setInputs] = useState({
    chutoKm: 0,
    lowboyKm: 0,
    vacuumHr: 0,
    montacargaHr: 0,
    resguardoHr: 0
  });
  const [result, setResult] = useState(null);


  useEffect(() => {
    fetch('/api/fixed-expenses')
    .then(res => res.json())
    .then(data => setTotalGastosMensuales(data.map(g => g.montoMensual).reduce((a,b) => a + b, 0)));
    fetch('/api/cost-parameters')
      .then((res) => res.json())
      .then((data) => setParams(data));
  }, []);

  useEffect(() => {
    console.log(totalGastosMensuales);

  }, [totalGastosMensuales])
  

  const handleChange = (field, value) => {
    setInputs((prev) => ({ ...prev, [field]: value }));
  };

  const guardarEstimacion = async () => {
  if (!result || !nombre) return;

  const payload = {
    name: nombre,
    ...inputs,
    totalCost: result.total,
    breakdown: result
  };

  await fetch('/api/cost-estimates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  alert('Estimación guardada exitosamente');
};

  const calcularEstimacion = () => {
    if (!params) return;

    const {
      chutoKm,
      lowboyKm,
      vacuumHr,
      montacargaHr,
      resguardoHr
    } = inputs;

    const {
      fuelPrice,
      operatorRate,
      resguardoRate,
      posesionRate,
      manoObraFija,
      manoObraVariable,
      mantenimientoMensual,
      administrativosMensual
    } = params;

    const chutoCost = chutoKm ? (chutoKm / 2.5) * fuelPrice : 0;
    const lowboyCost = lowboyKm ? (lowboyKm / 2.5) * fuelPrice : 0;
    const vacuumCost = vacuumHr * manoObraVariable;
    const montacargaCost = montacargaHr * manoObraVariable;
    const resguardoCost = resguardoHr * resguardoRate;

    const posesionCost = posesionRate / 100 * (chutoCost + lowboyCost); // simplificado
    const mantenimientoCost = mantenimientoMensual / 10; // suponiendo 10 servicios al mes
    const administrativosCost = administrativosMensual / 10;
    const manoObraFijaCost = manoObraFija / 10;

    const total =
      chutoCost +
      lowboyCost +
      vacuumCost +
      montacargaCost +
      resguardoCost +
      posesionCost +
      mantenimientoCost +
      administrativosCost +
      manoObraFijaCost;

    setResult({
      chutoCost,
      lowboyCost,
      vacuumCost,
      montacargaCost,
      resguardoCost,
      posesionCost,
      mantenimientoCost,
      administrativosCost,
      manoObraFijaCost,
      total
    });
  };

  return (
    <Container size="md" py="xl">
      <Title order={2} mb="lg">Estimar nuevo costo</Title>

      <Card withBorder shadow="sm" padding="lg">
        <Title order={4} mb={0}>Nombre de la estimacion:</Title>
        <TextInput  value={nombre} onChange={(e) => setNombre(e.target.value)} mb="md" />
        <Divider mb="md" />
        <Group grow mb="md">
          <NumberInput label="Km recorridos por chuto" value={inputs.chutoKm} onChange={(val) => handleChange('chutoKm', val)} min={0} />
          <NumberInput label="Km recorridos por lowboy" value={inputs.lowboyKm} onChange={(val) => handleChange('lowboyKm', val)} min={0} />
        </Group>
        <Group grow mb="md">
          <NumberInput label="Horas de uso de vacuum" value={inputs.vacuumHr} onChange={(val) => handleChange('vacuumHr', val)} min={0} />
          <NumberInput label="Horas de uso de montacargas" value={inputs.montacargaHr} onChange={(val) => handleChange('montacargaHr', val)} min={0} />
        </Group>
        <NumberInput label="Horas de resguardo y vigilancia" value={inputs.resguardoHr} onChange={(val) => handleChange('resguardoHr', val)} min={0} mt="md" />

        <Button fullWidth mt="xl" onClick={calcularEstimacion}>Calcular estimación</Button>
      </Card>

      {result && (
        <Card mt="xl" withBorder shadow="sm" padding="lg">
          <Title order={4} mb="sm">Resultado</Title>
          <Text>🛻 Chuto: ${result.chutoCost.toFixed(2)}</Text>
          <Text>🚚 Lowboy: ${result.lowboyCost.toFixed(2)}</Text>
          <Text>🧯 Vacuum: ${result.vacuumCost.toFixed(2)}</Text>
          <Text>🏗️ Montacargas: ${result.montacargaCost.toFixed(2)}</Text>
          <Text>🔐 Resguardo: ${result.resguardoCost.toFixed(2)}</Text>
          <Text>📦 Posesión: ${result.posesionCost.toFixed(2)}</Text>
          <Text>🛠️ Mantenimiento: ${result.mantenimientoCost.toFixed(2)}</Text>
          <Text>📋 Administrativos: ${result.administrativosCost.toFixed(2)}</Text>
          <Text>👷 Mano de obra fija: ${result.manoObraFijaCost.toFixed(2)}</Text>
          <Divider my="sm" />
          <Text fw={700}>💰 Total estimado: ${result.total.toFixed(2)}</Text>
        </Card>
      )}

     

      <Button fullWidth mt="md" onClick={guardarEstimacion}>
        Guardar estimación
      </Button>

    </Container>
  );
}