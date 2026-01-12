'use client';

import { useState, useEffect } from 'react';
import { 
  Paper, Group, Stack, Text, Select, NumberInput, Badge, 
  ActionIcon, Tooltip, Switch, Table, Button, Autocomplete, 
  SimpleGrid, TextInput, Divider 
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { 
  IconTrash, IconScan, IconPlus, IconHistory, IconSettings 
} from '@tabler/icons-react';
import { AsyncCatalogComboBox } from '@/app/components/CatalogCombobox';
import ConsumibleCreatorModal from '../../modelos/components/ConsumibleCreatorModal';

// Helpers
const esFungible = (cat) => {
    const c = (cat || '').toLowerCase();
    return ['aceite', 'refrigerante', 'grasa', 'liquido', 'combustible', 'filtro', 'bombillo', 'fusible', 'tornillo', 'abrazadera'].some(f => c.includes(f));
};

const exigeSerial = (cat) => {
    const c = (cat || '').toLowerCase();
    return ['neumatico', 'caucho', 'bateria', 'extintor', 'alternador', 'arranque', 'turbo', 'motor'].some(s => c.includes(s));
};

export default function ComponenteInstaller({ subsistema, inventarioGlobal, instalaciones, onChange, form }) {
  return (
    <Paper p="md" withBorder bg="gray.0" radius="md">
      <Text fw={700} size="sm" mb="sm" tt="uppercase" c="dimmed">{subsistema.nombre}</Text>
      <Stack gap="lg">
        {subsistema.listaRecomendada.map((regla) => {
          // Buscamos la instalación actual
          const instalacionActual = instalaciones.find(i => i.recomendacionId === regla.id) || null;
          
          // CALCULAMOS EL ÍNDICE GLOBAL para poder usar AsyncCatalogComboBox
          // Necesitamos saber en qué posición del array 'instalacionesIniciales' está este objeto
          const globalIndex = instalaciones.findIndex(i => i.recomendacionId === regla.id);

          return (
            <InstallerRow 
              key={regla.id}
              regla={regla}
              inventarioGlobal={inventarioGlobal}
              value={instalacionActual}
              
              // Pasamos datos para construir rutas del form
              form={form} 
              formBasePath={globalIndex >= 0 ? `instalacionesIniciales.${globalIndex}` : null}

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

function InstallerRow({ regla, inventarioGlobal, value, onChange, form, formBasePath }) {
  const cantidadRequerida = parseFloat(regla.cantidad);
  const isFungible = esFungible(regla.categoria);
  const modoInterfaz = (exigeSerial(regla.categoria) && !isFungible) ? 'serializado' : 'fungible';

  const [opcionesCompatibles, setOpcionesCompatibles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modoManual, setModoManual] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const fetchCompatibles = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/inventario/compatibles?recomendacionId=${regla.id}`);
        const result = await res.json();
        if (result.success) setOpcionesCompatibles(result.data || []);
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    if (regla.id) fetchCompatibles();
  }, [regla.id]);

  const dataToShow = modoManual ? inventarioGlobal : opcionesCompatibles;

  // -- HANDLERS --
  const handleProductoCreado = (nuevoConsumible) => {
    const nuevoItem = {
        value: nuevoConsumible.id.toString(),
        label: `${nuevoConsumible.nombre} (Nuevo)`,
        categoria: nuevoConsumible.categoria,
        stockActual: 0, 
        serialesDisponibles: [],
        raw: nuevoConsumible
    };
    setOpcionesCompatibles((prev) => [nuevoItem, ...prev]);
    setModalOpen(false);
  };

  const handleFungibleChange = (updates) => {
    const current = value || {
        subsistemaPlantillaId: regla.subsistemaId,
        recomendacionId: regla.id,
        consumibleId: null,
        cantidad: cantidadRequerida,
        origen: 'externo', 
        esFungible: true,
        esSerializado: false
    };
    onChange({ ...current, ...updates });
  };

  const handleSlotUpdates = (index, updates) => {
    const base = value || {
        subsistemaPlantillaId: regla.subsistemaId,
        recomendacionId: regla.id,
        esFungible: false,
        esSerializado: true,
        detalles: Array(Math.ceil(cantidadRequerida)).fill({})
    };
    const nuevosDetalles = [...(base.detalles || [])];
    if (!nuevosDetalles[index]) nuevosDetalles[index] = {};
    nuevosDetalles[index] = { ...nuevosDetalles[index], ...updates };
    onChange({ ...base, detalles: nuevosDetalles });
  };

  return (
    <Paper p="xs" withBorder bg="white">
      <Group justify="space-between" mb="xs">
        <Group gap="xs">
          <Badge variant="light" color={modoInterfaz === 'fungible' ? 'cyan' : 'blue'}>{regla.categoria}</Badge>
          <Text size="sm" fw={500}>{regla.valorCriterio || 'Estándar'} <span style={{color: '#868e96'}}>• Req: {cantidadRequerida}</span></Text>
        </Group>
        <Group gap={5}>
             <Tooltip label="Ver todo el inventario">
                <Switch size="xs" label="TODO" checked={modoManual} onChange={(e) => setModoManual(e.currentTarget.checked)} />
             </Tooltip>
             {value && <ActionIcon color="red" variant="subtle" size="xs" onClick={() => onChange(null)}><IconTrash size={12}/></ActionIcon>}
        </Group>
      </Group>

      {modoInterfaz === 'fungible' ? (
        // UI FUNGIBLE
        <Group align="flex-end">
             <div style={{ flex: 1, display: 'flex', gap: 4 }}>
                <Select 
                    placeholder={loading ? "Buscando..." : "Seleccionar Producto..."} 
                    data={dataToShow} searchable size="xs" style={{ flex: 1 }}
                    value={value?.consumibleId?.toString() || null}
                    onChange={(val) => handleFungibleChange({ consumibleId: val })}
                />
                <ActionIcon variant="default" size="30px" onClick={() => setModalOpen(true)}><IconPlus size={16} /></ActionIcon>
            </div>
            <NumberInput 
                placeholder="Cant." size="xs" min={0} w={80}
                value={value?.cantidad || cantidadRequerida}
                onChange={(val) => handleFungibleChange({ cantidad: val })}
            />
        </Group>
      ) : (
        // UI SERIALIZADA
        <Table withTableBorder withColumnBorders size="xs">
            <Table.Thead>
                <Table.Tr>
                    <Table.Th w={30}>#</Table.Th>
                    <Table.Th>Producto</Table.Th>
                    <Table.Th>Serial</Table.Th>
                </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
                {Array.from({ length: Math.ceil(cantidadRequerida) }).map((_, idx) => {
                    const slotData = value?.detalles?.[idx] || {};
                    const selectedProdId = slotData.consumibleId?.toString();
                    const productoObj = dataToShow.find(p => p.value === selectedProdId);
                    
                    const todosLosSeriales = (productoObj?.serialesDisponibles || []).map(s => s.value);
                    let serialesFiltrados = todosLosSeriales;

                    if (selectedProdId) {
                        const serialesUsadosEnOtros = (value?.detalles || [])
                            .filter((d, i) => i !== idx && d.consumibleId?.toString() === selectedProdId && d.serial)
                            .map(d => d.serial);
                        serialesFiltrados = todosLosSeriales.filter(s => !serialesUsadosEnOtros.includes(s));
                    }

                    return (
                        <>
                            {/* FILA PRINCIPAL */}
                            <Table.Tr key={`row-${idx}`} bg={slotData.esNuevo ? 'var(--mantine-color-orange-0)' : undefined}>
                                <Table.Td>{idx + 1}</Table.Td>
                                <Table.Td>
                                    <Group gap={4} wrap="nowrap">
                                        <Select 
                                            variant="unstyled" placeholder="Seleccionar Marca..." 
                                            data={dataToShow} searchable clearable style={{ flex: 1 }}
                                            value={selectedProdId || null}
                                            onChange={(val) => handleSlotUpdates(idx, { consumibleId: val, serial: '', esNuevo: false })}
                                        />
                                        <ActionIcon variant="subtle" color="blue" size="xs" onClick={() => setModalOpen(true)}><IconPlus size={14} /></ActionIcon>
                                    </Group>
                                </Table.Td>
                                <Table.Td>
                                    <Autocomplete 
                                        variant="unstyled"
                                        placeholder={selectedProdId ? "Escanear..." : "-"}
                                        data={serialesFiltrados}
                                        disabled={!selectedProdId}
                                        value={slotData.serial || ''}
                                        onChange={(val) => {
                                            const existe = todosLosSeriales.includes(val);
                                            const esNuevo = !!val && !existe;
                                            handleSlotUpdates(idx, { serial: val, esNuevo: esNuevo });
                                        }}
                                        rightSection={slotData.esNuevo ? <Badge size="xs" color="orange">NUEVO</Badge> : (selectedProdId && <IconScan size={12} color="gray"/>)}
                                    />
                                </Table.Td>
                            </Table.Tr>

                            {/* FILA EXPANDIBLE: DETALLE NUEVO SERIAL */}
                            {slotData.esNuevo && (
                                <Table.Tr key={`detail-${idx}`}>
                                    <Table.Td colSpan={3} p={0}>
                                        <DetalleNuevoSerial 
                                            data={slotData}
                                            form={form} 
                                            // Construimos la ruta base para este slot específico
                                            // Ej: instalacionesIniciales.0.detalles.2
                                            pathPrefix={formBasePath ? `${formBasePath}.detalles.${idx}` : null}
                                            
                                            onUpdate={(newData) => handleSlotUpdates(idx, newData)}
                                        />
                                    </Table.Td>
                                </Table.Tr>
                            )}
                        </>
                    );
                })}
            </Table.Tbody>
        </Table>
      )}

      <ConsumibleCreatorModal 
         opened={modalOpen}
         onClose={() => setModalOpen(false)}
         onSuccess={handleProductoCreado}
         initialValues={{ categoria: regla.categoria, stockMinimo: 0 }}
      />
    </Paper>
  );
}

// --- SUBCOMPONENTE CON TU ASYNC CATALOG COMBOBOX ---
function DetalleNuevoSerial({ data, onUpdate, form, pathPrefix }) {
    const historial = data.historialRecauchado || [];

    const handleChange = (field, val) => {
        onUpdate({ [field]: val });
    };

    const addRecauchado = () => {
        const nuevoHistorial = [
            ...historial,
            { fecha: new Date(), costo: 0, tallerId: null, tallerNombre: '' }
        ];
        onUpdate({ 
            historialRecauchado: nuevoHistorial,
            esRecauchado: true 
        });
    };

    const removeRecauchado = (rIndex) => {
        const nuevoHistorial = [...historial];
        nuevoHistorial.splice(rIndex, 1);
        onUpdate({ 
            historialRecauchado: nuevoHistorial,
            esRecauchado: nuevoHistorial.length > 0 
        });
    };

    // Para inputs simples usamos el onUpdate local
    const updateRecauchadoSimple = (rIndex, field, val) => {
        const nuevoHistorial = [...historial];
        nuevoHistorial[rIndex] = { ...nuevoHistorial[rIndex], [field]: val };
        onUpdate({ historialRecauchado: nuevoHistorial });
    };

    return (
        <Paper p="sm" bg="gray.1" radius={0} withBorder style={{ borderTop: 'none' }}>
            <Stack gap="xs">
                <Text size="xs" fw={700} c="orange" tt="uppercase">
                    Configuración de Carga Inicial
                </Text>
                
                <SimpleGrid cols={3}>
                    <DatePickerInput 
                        label="Fecha Compra" size="xs" 
                        value={data.fechaCompra || new Date()} 
                        onChange={(d) => handleChange('fechaCompra', d)}
                    />
                    <DatePickerInput 
                        label="Garantía" size="xs" placeholder="Opcional"
                        value={data.fechaVencimientoGarantia} 
                        onChange={(d) => handleChange('fechaVencimientoGarantia', d)}
                    />
                     <Select
                        label="Estado Físico" size="xs"
                        data={['Nuevo', 'Usado', 'Dañado']}
                        defaultValue="Nuevo"
                        onChange={(v) => handleChange('estadoFisico', v)}
                    />
                </SimpleGrid>

                <Divider my={4} label="Recauchado / Renovación" labelPosition="left" />

                <Group>
                    <Button 
                        size="xs" variant="light" color="blue" 
                        leftSection={<IconHistory size={14}/>}
                        onClick={addRecauchado}
                    >
                        Agregar Historial Recauchado
                    </Button>
                </Group>

                {historial.map((rec, rIndex) => (
                    <Paper key={rIndex} withBorder p="xs" bg="white">
                        <Group justify="flex-end">
                            <ActionIcon color="red" variant="subtle" size="xs" onClick={() => removeRecauchado(rIndex)}>
                                <IconTrash size={12}/>
                            </ActionIcon>
                        </Group>
                        <SimpleGrid cols={3}>
                            <DatePickerInput 
                                label="Fecha" size="xs" value={rec.fecha}
                                onChange={(d) => updateRecauchadoSimple(rIndex, 'fecha', d)}
                            />
                            <TextInput 
                                label="Costo" size="xs" type="number" value={rec.costo}
                                onChange={(e) => updateRecauchadoSimple(rIndex, 'costo', e.target.value)}
                            />
                            
                            {/* AQUI ESTA TU COMBOBOX INTEGRADO */}
                            {form && pathPrefix ? (
                                <AsyncCatalogComboBox
                                    label="Taller"
                                    placeholder="Seleccionar..."
                                    catalogo="talleres"
                                    form={form}
                                    // Construimos la ruta dinámica: 
                                    // Ej: instalacionesIniciales.0.detalles.2.historialRecauchado.0.tallerNombre
                                    fieldKey={`${pathPrefix}.historialRecauchado.${rIndex}.tallerNombre`}
                                    idFieldKey={`${pathPrefix}.historialRecauchado.${rIndex}.tallerId`}
                                />
                            ) : (
                                <TextInput label="Taller (Error Path)" disabled value="Error" />
                            )}

                        </SimpleGrid>
                    </Paper>
                ))}
            </Stack>
        </Paper>
    );
}