'use client';

import { useState, useEffect } from 'react';
import { 
  Paper, Group, Stack, Text, Select, 
  TextInput, NumberInput, Badge, Divider, 
  SimpleGrid, Tooltip, ActionIcon, Loader, Switch, ThemeIcon
} from '@mantine/core';
import { 
  IconBucket, IconTrash, IconDatabase, IconBarcode, 
  IconCircleDot, IconFilter, IconEngine, IconBolt 
} from '@tabler/icons-react';

// Helpers
const esFungible = (cat) => ['aceite', 'refrigerante', 'grasa', 'liquido', 'combustible'].includes((cat || '').toLowerCase());
const exigeSerial = (cat) => ['neumatico', 'bateria', 'extintor'].includes((cat || '').toLowerCase());

// Helper visual para iconos
const getIconoCategoria = (cat) => {
    const c = (cat || '').toLowerCase();
    if (c.includes('aceite') || c.includes('liquido')) return IconBucket;
    if (c.includes('filtro')) return IconFilter;
    if (c.includes('neumatico') || c.includes('caucho')) return IconCircleDot;
    if (c.includes('bateria') || c.includes('elect')) return IconBolt;
    return IconEngine;
};

export default function ComponenteInstaller({ subsistema, inventarioGlobal, instalaciones, onChange }) {
  return (
    <Paper p="md" withBorder bg="gray.0" radius="md">
      {/* Título del Subsistema (Ej: MOTOR) */}
      <Group mb="md">
         <IconEngine size={20} style={{ opacity: 0.5 }} />
         <Text fw={800} size="sm" tt="uppercase" c="dimmed">{subsistema.nombre}</Text>
      </Group>

      <Stack gap="md">
        {subsistema.listaRecomendada.map((regla) => {
          const instalacionActual = instalaciones.find(i => i.recomendacionId === regla.id) || null;
          return (
            <InstallerRow 
              key={regla.id}
              regla={regla}
              inventarioGlobal={inventarioGlobal} 
              value={instalacionActual}
              onChange={(newVal) => {
                const others = instalaciones.filter(i => i.recomendacionId !== regla.id);
                onChange(newVal ? [...others, newVal] : others);
              }}
            />
          );
        })}
      </Stack>
    </Paper>
  );
}

function InstallerRow({ regla, inventarioGlobal, value, onChange }) {
  const cantidadRequerida = parseFloat(regla.cantidad);
  const isFungible = esFungible(regla.categoria);
  const isSerialized = exigeSerial(regla.categoria);
  const Icono = getIconoCategoria(regla.categoria);

  const [opcionesCompatibles, setOpcionesCompatibles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modoManual, setModoManual] = useState(false);

  useEffect(() => {
    const fetchCompatibles = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/inventario/compatibles?recomendacionId=${regla.id}`);
        const result = await res.json();
        if (result.success) setOpcionesCompatibles(result.data || []);
      } catch (err) { console.error(err); } 
      finally { setLoading(false); }
    };
    if (regla.id) fetchCompatibles();
  }, [regla.id]);

  const dataToShow = modoManual ? inventarioGlobal : opcionesCompatibles;
  
  // Extraemos seriales usando el alias correcto 'serializados' que definiste
  // Nota: El backend los manda dentro de "serialesDisponibles" porque lo mapeamos en el route.js
  const selectedProduct = dataToShow.find(p => p.value === value?.consumibleId?.toString());
  const listaSeriales = selectedProduct?.serialesDisponibles || [];

  const handleProductSelect = (consumibleId) => {
    if (!consumibleId) { onChange(null); return; }
    onChange({
      subsistemaPlantillaId: regla.subsistemaId,
      recomendacionId: regla.id,
      consumibleId: consumibleId,
      cantidad: isFungible ? cantidadRequerida : 1,
      seriales: isSerialized ? Array(Math.ceil(cantidadRequerida)).fill('') : [],
      esFungible: isFungible,
      esSerializado: isSerialized
    });
  };

  const handleSerialSelect = (index, val) => {
    const newSeriales = [...(value.seriales || [])];
    newSeriales[index] = val;
    onChange({ ...value, seriales: newSeriales });
  };

  return (
    <Paper p="sm" withBorder bg="white" shadow="xs">
      {/* --- ENCABEZADO MEJORADO --- */}
      <Group justify="space-between" mb="sm" align="flex-start">
        <Group align="center">
            <ThemeIcon size="lg" variant="light" color={isFungible ? 'cyan' : 'blue'}>
                <Icono size={20} />
            </ThemeIcon>
            <div>
                {/* AQUI ESTA EL LABEL QUE FALTABA */}
                <Text fw={700} size="sm" tt="capitalize">
                    {regla.categoria} 
                </Text>
                <Text size="xs" c="dimmed">
                    {regla.valorCriterio || 'Estándar'} • Requeridos: {cantidadRequerida}
                </Text>
            </div>
        </Group>

        <Group gap={5}>
            <Tooltip label={modoManual ? "Volver a sugerencias" : "Ver todo el inventario"}>
                <Switch 
                    size="xs" onLabel="ALL" offLabel="AUTO" 
                    checked={modoManual} 
                    onChange={(e) => setModoManual(e.currentTarget.checked)} 
                    color="orange" 
                />
            </Tooltip>
            {value && (
              <ActionIcon color="red" variant="subtle" onClick={() => onChange(null)}>
                <IconTrash size={16} />
              </ActionIcon>
            )}
        </Group>
      </Group>

      {/* SELECTOR */}
      <Select 
        label="Componente a Instalar" // Label explícito
        placeholder={loading ? "Buscando compatibles..." : "Seleccionar de almacén..."}
        data={dataToShow}
        searchable clearable size="xs" mb="xs"
        value={value?.consumibleId?.toString() || null}
        onChange={handleProductSelect}
        rightSection={loading ? <Loader size={12} /> : null}
        leftSection={!modoManual && opcionesCompatibles.length > 0 && <IconDatabase size={12} color="green"/>}
      />

      {/* INPUTS */}
      {value && (
        <>
          <Divider my="xs" label="Detalles de Instalación" labelPosition="center" />
          
          {isFungible ? (
             <Group grow>
                <NumberInput 
                    label="Cantidad Real Despachada" 
                    description={`Sugerido: ${cantidadRequerida}`}
                    size="xs" suffix=" Lts"
                    value={value.cantidad}
                    onChange={(val) => onChange({ ...value, cantidad: val })}
                />
             </Group>
          ) : (
            <SimpleGrid cols={isSerialized ? 2 : 3} spacing="xs">
              {Array.from({ length: Math.ceil(cantidadRequerida) }).map((_, idx) => {
                const serialesUsados = value.seriales.filter((s, i) => i !== idx && s);
                const disponibles = listaSeriales.filter(s => !serialesUsados.includes(s.value));

                return isSerialized ? (
                    <Select
                        key={idx}
                        label={`Serial Posición #${idx + 1}`}
                        placeholder="Seleccionar Serial"
                        size="xs" searchable clearable
                        data={disponibles}
                        value={value.seriales?.[idx] || null}
                        onChange={(val) => handleSerialSelect(idx, val)}
                        leftSection={<IconBarcode size={12} />}
                        disabled={listaSeriales.length === 0}
                    />
                ) : (
                    <TextInput key={idx} label={`Posición #${idx + 1}`} placeholder="N/A" size="xs" disabled />
                );
              })}
            </SimpleGrid>
          )}
        </>
      )}
    </Paper>
  );
}