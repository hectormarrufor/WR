'use client';

import { useState, useEffect } from 'react';
import {
  TextInput, Select, Button, Group, Box, Paper, Text, ActionIcon, Collapse,
  TagsInput, NumberInput, Checkbox, SimpleGrid, SegmentedControl, useMantineTheme, Title,
  Switch,
  MultiSelect,
  Modal,
  Grid
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconTrash, IconPlus, IconArrowDown, IconArrowUp, IconSettings, IconForms } from '@tabler/icons-react';
import { theme as THEME } from '@/theme';
import ConsumibleForm from '../../inventario/consumibles/ConsumibleForm'; // Asegúrate que la ruta sea correcta


const getDeep = (obj, path) => path.split('.').filter(Boolean).reduce((acc, part) => acc && acc[part], obj);

const toCamelCase = (str) => {
  if (!str) return '';
  const stringWithoutStopWords = str.replace(/\b(de|del|la|el|los|las)\b/gi, '');
  return stringWithoutStopWords
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) =>
      index === 0 ? word.toLowerCase() : word.toUpperCase()
    )
    .replace(/\s+/g, '');
};

// --- Componente para RELLENAR Atributos (Modo Modelo/Activo) ---
export function AtributoValorizador({ attribute, path, onUpdate, from }) {
  const [consumibles, setConsumibles] = useState([]);
  const [modalOpened, setModalOpened] = useState(false);
  const [viscosidades, setViscosidades] = useState([])

  // El modo de compatibilidad se guarda en el propio atributo
  const compatibilidadMode = attribute.compatibilidad?.mode || 'directa';

  const fetchConsumibles = async () => {
    if (attribute.consumibleType) {
      const response = await fetch(`/api/inventario/consumibles?tipo=${attribute.consumibleType}`);
      const data = await response.json();
      if (Array.isArray(data)) {
        setConsumibles(data.map(c => ({
          value: c.id.toString(),
          label: `${c.nombre} ` //(${c.marca && `Marca: ${c.marca}`}, ${c.codigoParte && `Código: ${c.codigoParte}`}, ${c.especificaciones?.viscosidad && `Viscosidad: ${c.especificaciones.viscosidad}`}, ${c.especificaciones?.tipo && `Tipo: ${c.especificaciones.tipo}`})
        })));
      } else {
        // Si no es un array (ej. un objeto de error), dejamos la lista vacía.
        console.log("La API de consumibles no devolvió un array:", data);
        setConsumibles([]);
      }
    }
  };

  useEffect(() => {
    fetchConsumibles();
    if (attribute.consumibleType === 'Aceite') {
      fetch('/api/inventario/sugerencias?campo=viscosidad').then(res => res.json()).then(res => Array.isArray(res) ? setViscosidades(res) : setViscosidades([]));
    }
  }, [attribute.consumibleType]);

  const handleConsumibleCreado = async (nuevoConsumible) => {
    await fetchConsumibles();
    setModalOpened(false);
    const currentSelection = attribute.compatibilidad?.consumibleIds || [];
    const newSelection = [...currentSelection, nuevoConsumible.id.toString()];
    onUpdate(path, { ...attribute, compatibilidad: { ...attribute.compatibilidad, mode: 'directa', consumibleIds: newSelection } });
  };

  if (!attribute.consumibleType) {
    return <TextInput label={attribute.label} defaultValue={attribute.defaultValue} onBlur={(e) => onUpdate(path, { ...attribute, defaultValue: e.currentTarget.value })} />;
  }

  return (
    <Paper withBorder p="sm" mt="xs" radius="sm">
      <Text fw={500} size="sm">{attribute.label}</Text>
      <Text size="xs" c="dimmed" mb="sm">Define las especificaciones o repuestos compatibles.</Text>

      {/* --- LÓGICA CONTEXTUAL --- */}

      {['Correa', 'Bombillo', 'Mangueras'].includes(attribute.consumibleType) && (
        <TagsInput
          label={`Código Universal de ${attribute.consumibleType}`}
          description="Añade los códigos de parte universales."
          placeholder="Escribe un código y presiona Enter"
          defaultValue={attribute.compatibilidad?.codigos || []}
          onBlur={(e) => onUpdate(path, { ...attribute, compatibilidad: { mode: 'porCodigo', codigos: e.currentTarget.value.split(',').map(s => s.trim()) } })}
        />
      )}

      {['Filtro', 'Repuesto', 'Sensores', 'Bujia', 'Pastillas de Freno', 'Bateria'].includes(attribute.consumibleType) && (
        <Group align="flex-end" grow>
          <MultiSelect
            label="Consumibles Específicos Compatibles"
            description="Selecciona los ítems de tu inventario que son compatibles."
            data={consumibles} searchable placeholder="Busca y selecciona..."
            value={attribute.compatibilidad?.consumibleIds || []}
            onChange={(values) => onUpdate(path, { ...attribute, compatibilidad: { mode: 'directa', consumibleIds: values } })}
          />
          <ActionIcon size="lg" variant="filled" onClick={() => setModalOpened(true)}><IconPlus /></ActionIcon>
        </Group>
      )}

      {attribute.consumibleType === 'Aceite' && (
        <Grid>
          <Grid.Col span={6}>
            <Select label="Tipo de Aceite Requerido" data={['Mineral', 'Semi-sintético', 'Sintético']}
              value={attribute.compatibilidad?.propiedades?.tipoAceite || ''}
              onChange={(value) => onUpdate(path, { ...attribute, compatibilidad: { mode: 'porPropiedades', propiedades: { ...attribute.compatibilidad?.propiedades, tipoAceite: value } } })}
            />
          </Grid.Col>
          <Grid.Col span={6}>
            <Select
              label="Viscosidad Requerida"
              placeholder="Ej: 15W40"
              data={viscosidades} searchable creatable
              getCreateLabel={(query) => `+ Añadir "${query}"`}
              onCreate={(query) => {
                const newItem = { value: query, label: query };
                setViscosidades((current) => [...current, newItem]);
                return newItem;
              }}
              defaultValue={attribute.compatibilidad?.propiedades?.viscosidad || ''}
              onChange={(value) => onUpdate(path, { ...attribute, compatibilidad: { mode: 'porPropiedades', propiedades: { ...attribute.compatibilidad?.propiedades, viscosidad: value } } })}
            />
          </Grid.Col>
        </Grid>
      )}

      {attribute.consumibleType === 'Neumatico' && (
        <TagsInput
          label="Medidas de Neumático Compatibles"
          description="Añade las medidas compatibles (ej: 295/80R22.5)"
          placeholder="Escribe una medida y presiona Enter"
          defaultValue={attribute.compatibilidad?.propiedades?.medidas || []}
          onBlur={(e) => onUpdate(path, { ...attribute, compatibilidad: { mode: 'porPropiedades', propiedades: { medidas: e.currentTarget.value.split(',').map(s => s.trim()) } } })}
          mt="sm"
        />
      )}

      <Modal opened={modalOpened} onClose={() => setModalOpened(false)} title={`Crear Nuevo ${attribute.consumibleType}`} size="xl">
        <ConsumibleForm initialData={{ tipo: attribute.consumibleType, stock: 0 }} onSuccess={handleConsumibleCreado} />
      </Modal>
    </Paper>
  );
}

// --- Componente para DEFINIR Atributos (Modo Grupo/Categoría) ---
function AtributoField({ attribute, path, onRemove, onUpdate, level }) {
  const [isConsumible, setIsConsumible] = useState(!!attribute.consumibleType);

  const handleLabelBlur = (e) => {
    const newLabel = e.currentTarget.value;
    const newId = toCamelCase(newLabel);
    onUpdate(path, { ...attribute, label: newLabel, id: newId });
  }

  const handleIsConsumibleChange = (checked) => {
    setIsConsumible(checked);
    if (checked) {
        onUpdate(path, { ...attribute, isConsumible: true, dataType: null, inputType: null });
    } else {
        onUpdate(path, { ...attribute, isConsumible: false, consumibleType: null });
    }
  };

  return (
    <Box>
      <SimpleGrid cols={2} mt="xs">
        <TextInput label="Label del Campo" required defaultValue={attribute.label} onBlur={handleLabelBlur} />
        <TextInput label="ID del Atributo (en JSON)" required key={attribute.id} defaultValue={attribute.id} onBlur={(e) => onUpdate(path, { ...attribute, id: e.currentTarget.value })} />
      </SimpleGrid>
      
      <Switch
        label="¿Este atributo es un consumible/repuesto?"
        checked={isConsumible}
        onChange={(event) => handleIsConsumibleChange(event.currentTarget.checked)}
        mt="md"
      />

      <Collapse in={isConsumible} mt="xs">
        <Select
          label="Tipo de Consumible"
          placeholder="Selecciona el tipo de repuesto"
          data={['Aceite', 'Filtro', 'Correa', 'Neumatico', 'Mangueras', 'Bateria', 'Bombillo', 'Sensor', 'Bujia', 'Pastillas de Freno', 'Repuesto']}
          value={attribute.consumibleType || ''}
          onChange={(value) => onUpdate(path, { ...attribute, consumibleType: value })}
        />
      </Collapse>

      <Collapse in={!isConsumible} mt="xs">
         <SimpleGrid cols={2}>
            <Select label="Tipo de Dato" value={attribute.dataType} onChange={(v) => onUpdate(path, {...attribute, dataType: v})} data={['string', 'number', 'boolean', 'object', 'grupo']} />
            {attribute.dataType === 'string' && <Select label="Tipo de Input" value={attribute.inputType} onChange={(v) => onUpdate(path, {...attribute, inputType: v})} data={['text', 'textarea', 'select', 'multiSelect', 'image']} />}
        </SimpleGrid>
      </Collapse>
    </Box>
  );
}

// --- El Constructor Principal ---
export default function AtributoConstructor({ form, pathPrefix = '', availableGroups = [], level = 0, from }) {
  const theme = useMantineTheme();
  const paperColor = theme.colors.gray[level];
  const fieldName = `${pathPrefix}definicion`;
  const definicion = getDeep(form.values, fieldName) || [];

  const addAttribute = () => {
    const currentDefinicion = getDeep(form.values, fieldName) || [];
    const defaultRenderMode = from === 'Modelo' ? 'input' : 'define';
    form.setFieldValue(fieldName, [...currentDefinicion, { key: `attr_${Date.now()}`, dataType: 'string', inputType: 'text', label: '', id: '', renderMode: defaultRenderMode }]);
  };
  const removeAttribute = (index) => {
    const currentDefinicion = getDeep(form.values, fieldName) || [];
    form.setFieldValue(fieldName, currentDefinicion.filter((_, i) => i !== index));
  };
  const updateAttribute = (path, newValue) => { form.setFieldValue(path, newValue); };

  const handleModeChange = (attributePath, mode) => {
    const attribute = getDeep(form.values, attributePath);
    if (mode === 'define') {
      const parentGroupName = form.values.nombre || 'GRUPO';
      const attributeLabel = attribute.label || 'SUBGRUPO';
      const newSubGroupName = `${attributeLabel.toUpperCase().replace(/\s+/g, '_')}_${parentGroupName.toUpperCase().replace(/\s+/g, '_')}`;
      form.setFieldValue(attributePath, { ...attribute, mode, refId: null, subGrupo: { key: `sub_${Date.now()}`, nombre: newSubGroupName, definicion: [] } });
    } else {
      form.setFieldValue(attributePath, { ...attribute, mode, refId: null, subGrupo: null });
    }
  };

  const fields = definicion.map((item, index) => {
    const currentPath = `${fieldName}.${index}`;
    const renderMode = item.renderMode || 'define';

    if (item.dataType === 'object' || item.dataType === 'grupo') {
      return (
        <Paper key={item.key} withBorder p="md" mt="sm" shadow="xs" bg={paperColor}>
          <Group justify="space-between">
            <Text fw={700} c={item.dataType === 'object' ? 'cyan' : 'blue'}>{item.dataType === 'object' ? 'Atributo de Objeto: ' : `Atributo de ${from}: `}{item.label || ''}</Text>
            <ActionIcon color="red" onClick={() => removeAttribute(index)}><IconTrash size={16} /></ActionIcon>
          </Group>

          {/* Campos para definir el propio contenedor (Label, ID) */}
          <SimpleGrid cols={2} mt="xs">
            <TextInput
              label={`Label del ${item.dataType}`} defaultValue={item.label}
              onBlur={(e) => {
                const newLabel = e.currentTarget.value;
                const newId = toCamelCase(newLabel);
                let updatedItem = { ...item, label: newLabel, id: newId };
                if (item.mode === 'define' && item.subGrupo) {
                  const parentGroupName = form.values.nombre || 'GRUPO';
                  const newSubGroupName = `${newLabel.toUpperCase().replace(/\s+/g, '_')}_${parentGroupName.toUpperCase().replace(/\s+/g, '_')}`;
                  updatedItem.subGrupo = { ...item.subGrupo, nombre: newSubGroupName };
                }
                updateAttribute(currentPath, updatedItem);
              }}
            />
            <TextInput label={`ID del ${item.dataType} (en JSON)`} key={item.id} defaultValue={item.id} onBlur={(e) => updateAttribute(currentPath, { ...item, id: e.currentTarget.value })} />
          </SimpleGrid>

          {/* Lógica específica para Grupos (Seleccionar/Definir) */}
          {from === "Grupo" && item.dataType === 'grupo' && (
            <>
              <SegmentedControl fullWidth mt="md" value={item.mode || 'select'} onChange={(v) => handleModeChange(currentPath, v)} data={[{ label: 'Seleccionar Existente', value: 'select' }, { label: "Definir Nuevo", value: 'define' }]} />
              <Collapse in={item.mode === 'select'}>
                <Select data={availableGroups.map(g => ({ value: g.id.toString(), label: g.nombre }))} value={item.refId?.toString()} onChange={(v) => updateAttribute(currentPath, { ...item, refId: v })} mt="xs" />
              </Collapse>
            </>
          )}

          {/* Contenedor para los hijos, que se muestra si es 'object' o si es 'grupo' en modo 'define' */}
          <Collapse in={item.dataType === 'object' || item.mode === 'define'}>
            <Paper withBorder p="md" mt="md" bg={theme.colors.gray[level + 1]}>
              {item.dataType === 'grupo' && (
                <TextInput
                  label={`Nombre del Nuevo Sub-${from}`}
                  required key={item.subGrupo?.nombre} defaultValue={item.subGrupo?.nombre || ''}
                  onBlur={(e) => {
                    const formattedValue = e.currentTarget.value.toUpperCase().replace(/\s+/g, '_');
                    updateAttribute(currentPath, { ...item, subGrupo: { ...item.subGrupo, nombre: formattedValue } });
                  }}
                />
              )}
              {/* LA ÚNICA LLAMADA RECURSIVA, EN EL LUGAR CORRECTO */}
              <AtributoConstructor
                from={from === "Grupo" ? "Categoria" : from}
                form={form}
                pathPrefix={`${currentPath}${item.dataType === 'grupo' ? '.subGrupo.' : '.'}`}
                availableGroups={availableGroups}
                level={level + 2}
              />
            </Paper>
          </Collapse>
        </Paper>
      );
    }

    return (
      <Paper key={item.key} withBorder p="md" mt="sm" shadow="xs" bg={paperColor}>
        <Group justify="space-between">
          <Text fw={500}>{item.label || 'Nuevo Atributo'}</Text>
          <Group gap="xs">
            {from !== 'Grupo' && (
              <Switch
                checked={renderMode === 'input'}
                onChange={(event) => updateAttribute(currentPath, { ...item, renderMode: event.currentTarget.checked ? 'input' : 'define' })}
                size="sm" onLabel={<IconForms size={12} />} offLabel={<IconSettings size={12} />}
              />
            )}
            <ActionIcon color="red" onClick={() => removeAttribute(index)}><IconTrash size={16} /></ActionIcon>
          </Group>
        </Group>
        <Collapse in={renderMode === 'define'}>
          <Paper withBorder p="sm" mt="md" radius="sm">
            <AtributoField attribute={item} path={currentPath} onUpdate={updateAttribute} level={level} />
          </Paper>
        </Collapse>
        <Collapse in={renderMode === 'input'}>
          <Box mt="md">
            <AtributoValorizador attribute={item} path={currentPath} onUpdate={updateAttribute} from={from} />
          </Box>
        </Collapse>
      </Paper>
    );
  });

  return (
    <Box mt="lg">
      <Title order={4} mb="sm">{level === 0 ? 'Definición de Atributos' : ''}</Title>
      {fields && fields.length > 0 ? fields : <Text c="dimmed" mt="md">No se han definido atributos.</Text>}
      <Button leftSection={<IconPlus size={14} />} onClick={addAttribute} mt="md">
        Añadir Atributo
      </Button>
    </Box>
  );
}