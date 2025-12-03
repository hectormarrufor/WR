'use client';

import { useState, useEffect } from 'react';
import {
  Container, Title, NumberInput, Button, Group, Card, Text, Divider, TextInput,
  Modal,
  Select,
  Image,
  Flex
} from '@mantine/core';
// import { roundTo, monthsBack, weightedAverage } from '@/app/handlers/mediaPonderadaServicios';

export default function NuevaEstimacionPage() {
  const [modalActivo, setModalActivo] = useState(false);
  const [categoria, setCategoria] = useState(null);
  const [categoriaFiltro, setCategoriaFiltro] = useState(null);
  const [activos, setActivos] = useState([]);
  const [renglones, setRenglones] = useState([]);
  const [divisorManual, setDivisorManual] = useState(null);
  const [serviciosMes, setServiciosMes] = useState(1);
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
    fetch('/api/gestionMantenimiento/activos')
      .then(res => res.json())
      .then(res => {
        console.log(res);
        setActivos(res);
        setCategoriaFiltro(res.map(a => a.modelo.categoria.nombre) || null);
      });

    fetch('/api/fletes')
      .then(res => res.json())
      .then((data) => {
        setServiciosMes(data.length || 1);
      });
    fetch('/api/fixed-expenses')
      .then(res => res.json())
      .then(data => setTotalGastosMensuales(data.map(g => g.montoMensual).reduce((a, b) => a + b, 0)));
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

  const confirmarActivo = (activo) => {
    const mensaje = `¿Deseas seleccionar el activo ${activo.modelo.nombre} (${activo.datosPersonalizados.placa}) con valor $${activo.valor}?`;
    if (window.confirm(mensaje)) {
      setRenglones((prev) => [...prev, activo]);
      setModalActivo(false);
    }
  };


  const calcularEstimacion = () => {
    if (!params) return;

    const divisor = divisorManual || serviciosMes;
    const rateEstructural = totalGastosMensuales / divisor;

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
      manoObraFijaCost +
      rateEstructural;

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
      rateEstructural,
      total
    });
  };

  return (
    <Container size="md" py="xl">

      <Card   shadow="sm" padding="lg">
        {/* <Group position="apart" mb="md">
          <Button onClick={() => window.alert(monthsBack(3))}>calcular 3 meses atras</Button>
          <Button onClick={() => window.alert(roundTo((weightedAverage([1, 3, 30])), 3))}>calcular media ponderada</Button>
        </Group> */}

        <Title align="center" order={2} mb="lg">Estimar nuevo costo de flete</Title>
        <Title order={4} mb={0}>Nombre de la estimacion:</Title>
        <TextInput value={nombre} onChange={(e) => setNombre(e.target.value)} mb="md" />
        <Divider mb="md" />
        <Title order={4} mt="xl">Activos seleccionados para estimación</Title>
        {renglones.map((r, index) => (
          <Card key={r.id} shadow="sm" padding="md"   mb="md">
            <Flex>
              <Image src={`${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/${r.imagen}?${Date.now()}`} height={150} mx={20} radius={10} alt={r.modelo.nombre} />
              <Group>
                <Text fw={700}>Activo {index + 1}</Text>
                <Text>{r.modelo.nombre} - {r.datosPersonalizados.placa}</Text>
                <Text>Valor: ${r.valor}</Text>
                <Group grow mt="sm">
                  <NumberInput
                    label="Km a recorrer"
                    value={r.kmRecorridos || 0}
                    onChange={(val) => {
                      const actualizados = [...renglones];
                      actualizados[index].kmRecorridos = val;
                      setRenglones(actualizados);
                    }}
                    min={0}
                  />
                  <NumberInput
                    label="Horas estacionarias"
                    value={r.horasEstacionarias || 0}
                    onChange={(val) => {
                      const actualizados = [...renglones];
                      actualizados[index].horasEstacionarias = val;
                      setRenglones(actualizados);
                    }}
                    min={0}
                  />
                </Group>
              </Group>
            </Flex>
          </Card>
        ))}

        <Button onClick={() => setModalActivo(true)}>Agregar activo</Button>

        {/* <Group grow mb="md">
          <NumberInput label="Km recorridos por chuto" value={inputs.chutoKm} onChange={(val) => handleChange('chutoKm', val)} min={0} />
          <NumberInput label="Km recorridos por lowboy" value={inputs.lowboyKm} onChange={(val) => handleChange('lowboyKm', val)} min={0} />
        </Group>
        <Group grow mb="md">
          <NumberInput label="Horas de uso de vacuum" value={inputs.vacuumHr} onChange={(val) => handleChange('vacuumHr', val)} min={0} />
          <NumberInput label="Horas de uso de montacargas" value={inputs.montacargaHr} onChange={(val) => handleChange('montacargaHr', val)} min={0} />
        </Group> */}
        <NumberInput mb="md" label="Horas de resguardo y vigilancia" value={inputs.resguardoHr} onChange={(val) => handleChange('resguardoHr', val)} min={0} mt="md" />
        <NumberInput

          label="Divisor para prorrateo de gastos fijos"
          value={divisorManual ?? serviciosMes}
          onChange={(val) => setDivisorManual(val)}
          description="Estimado automáticamente según cantidad de fletes previos. Puedes modificarlo manualmente."
          min={1}
        />


        <Button fullWidth mt="xl" onClick={calcularEstimacion}>Calcular estimación</Button>
      </Card>

      {result && (
        <Card mt="xl"   shadow="sm" padding="lg">
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
          <Text>💼 Gastos fijos prorrateados: ${result.rateEstructural.toFixed(2)}</Text>

          <Divider my="sm" />
          <Text fw={700}>💰 Total estimado: ${result.total.toFixed(2)}</Text>
        </Card>
      )}



      <Button fullWidth mt="md" onClick={guardarEstimacion}>
        Guardar estimación
      </Button>

      <Modal
        opened={modalActivo}
        onClose={() => setModalActivo(false)}
        title="Agregar activo"
        size="80%"
        centered
      >
        <Select
          label="Filtrar por categoría"
          data={['chuto', 'lowboy', 'montacargas', 'camioneta']}
          value={categoria}
          onChange={setCategoria}
        />

        <Group>
          {activos
            // .filter(a => a.categoria === categoria)
            .map((a) => (
              <Card key={a.id} shadow="sm" padding="md"  >
                <Image src={`${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/${a.imagen}?${Date.now()}`} height={100} alt={a.modelo.nombre} />
                <Text>{a.modelo.nombre}</Text>
                {a.datosPersonalizados.placa && <Text>Placa: {a.datosPersonalizados.placa}</Text>}
                <Text>Codigo de Activo: {a.codigoActivo}</Text>
                <Text>Valor: ${a.valor || 10000}</Text>
                <Button onClick={() => confirmarActivo(a)}>Seleccionar</Button>
              </Card>
            ))}
        </Group>
      </Modal>
    </Container>
  );
}