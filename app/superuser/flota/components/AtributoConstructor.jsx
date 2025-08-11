'use client';

import { useState, useEffect } from 'react';
import {
  TextInput, Select, Button, Group, Box, Paper, Text, ActionIcon, Collapse,
  TagsInput, NumberInput, Checkbox, SimpleGrid, SegmentedControl, useMantineTheme, Title,
  Switch,
  MultiSelect,
  Modal,
  Grid,
  Stack
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

export function AtributoValorizador({ attribute, path, onUpdate, from }) {
  const [consumibles, setConsumibles] = useState([]);
  const [modalOpened, setModalOpened] = useState(false);
  const [viscosidades, setViscosidades] = useState([]);

  const fetchConsumibles = async (tipo) => {
    if (tipo) {
      try {
        const response = await fetch(`/api/inventario/consumibles?tipo=${tipo}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (Array.isArray(data)) {
          setConsumibles(data.map(c => ({
            value: c.id.toString(),
            label: `${c.nombre} (${c.marca && `Marca: ${c.marca}`}, ${c.codigoParte && `Código: ${c.codigoParte}`})`
          })));
        } else {
          console.error("La API de consumibles no devolvió un array:", data);
          setConsumibles([]);
        }
      } catch (error) {
        console.error("Error al obtener consumibles:", error);
        setConsumibles([]);
      }
    } else {
      setConsumibles([]);
    }
  };

  useEffect(() => {
    // Este useEffect se dispara cuando el tipo de consumible cambia
    if (attribute.isConsumible) {
      if (['Filtro', 'Bujia', 'Sensor', 'Bateria', 'Otro'].includes(attribute.consumibleType)) {
        // Llamamos a la API con el tipo específico
        fetchConsumibles(attribute.consumibleType);
      }
      if (attribute.consumibleType === 'Aceite') {
        // Asumiendo que tienes una API para obtener sugerencias de viscosidades
        fetch('/api/inventario/sugerencias?campo=viscosidad')
          .then(res => res.json())
          .then(res => Array.isArray(res) ? setViscosidades(res.map(v => ({ value: v, label: v }))) : setViscosidades([]))
          .catch(err => console.error("Error fetching viscosidades:", err));
      }
    }
  }, [attribute.isConsumible, attribute.consumibleType]);

  const handleConsumibleCreado = async (nuevoConsumible) => {
    // Al crear un nuevo consumible, volvemos a cargar la lista para que se actualice
    await fetchConsumibles(attribute.consumibleType);
    setModalOpened(false);
    const currentSelection = getDeep(attribute, 'compatibilidad.consumibleIds') || [];
    const newSelection = [...currentSelection, nuevoConsumible.id.toString()];
    onUpdate(path, { ...attribute, compatibilidad: { mode: 'directa', consumibleIds: newSelection } });
  };

  // Si no es un consumible, mostramos los inputs regulares
  if (!attribute.isConsumible) {
    if (attribute.dataType === 'string' && attribute.inputType === 'text') {
      return <TextInput label={attribute.label} placeholder={attribute.label} defaultValue={attribute.defaultValue} onBlur={(e) => onUpdate(path, { ...attribute, defaultValue: e.currentTarget.value })} />;
    }
    if (attribute.dataType === 'string' && attribute.inputType === 'textarea') {
      return <Textarea label={attribute.label} placeholder={attribute.label} defaultValue={attribute.defaultValue} onBlur={(e) => onUpdate(path, { ...attribute, defaultValue: e.currentTarget.value })} />;
    }
    // Añade más tipos de input según sea necesario
    return <Text size="sm" c="dimmed">{`Tipo de dato: ${attribute.dataType}`}</Text>;
  }

  return (
    <Paper withBorder p="sm" mt="xs" radius="sm">
      <Text fw={500} size="sm">{attribute.label}</Text>
      <Text size="xs" c="dimmed" mb="sm">Define las especificaciones o repuestos compatibles.</Text>

      {/* --- LÓGICA ESPECÍFICA PARA CADA TIPO DE CONSUMIBLE --- */}

      {/* Caso: Aceite */}
      {attribute.consumibleType === 'Aceite' && (
        <Stack>
          <Group grow>
            <Select
              label="Tipo de Aceite Requerido"
              data={['Mineral', 'Semi-sintético', 'Sintético']}
              value={getDeep(attribute, 'compatibilidad.propiedades.tipoAceite') || ''}
              onChange={(value) => onUpdate(path, { ...attribute, compatibilidad: { mode: 'porPropiedades', propiedades: { ...getDeep(attribute, 'compatibilidad.propiedades'), tipoAceite: value } } })}
            />
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
              value={getDeep(attribute, 'compatibilidad.propiedades.viscosidad') || ''}
              onChange={(value) => onUpdate(path, { ...attribute, compatibilidad: { mode: 'porPropiedades', propiedades: { ...getDeep(attribute, 'compatibilidad.propiedades'), viscosidad: value } } })}
            />
          </Group>
          <NumberInput
            label="Cantidad de Aceite (Litros)"
            description="Valor predeterminado para el cambio"
            placeholder="Ej: 8.5" precision={2} min={0} step={0.1}
            value={getDeep(attribute, 'defaultValue.cantidadLitros') || ''}
            onChange={(value) => onUpdate(path, { ...attribute, defaultValue: { ...getDeep(attribute, 'defaultValue'), cantidadLitros: value } })}
          />
          <Grid>
            <Grid.Col span={4}>
              <NumberInput
                label="Intervalo de Cambio (Km)"
                placeholder="5000" min={0}
                value={getDeep(attribute, 'defaultValue.intervaloKm') || ''}
                onChange={(value) => onUpdate(path, { ...attribute, defaultValue: { ...getDeep(attribute, 'defaultValue'), intervaloKm: value } })}
              />
            </Grid.Col>
            <Grid.Col span={4}>
              <NumberInput
                label="Intervalo de Cambio (Horas)"
                placeholder="250" min={0}
                value={getDeep(attribute, 'defaultValue.intervaloHoras') || ''}
                onChange={(value) => onUpdate(path, { ...attribute, defaultValue: { ...getDeep(attribute, 'defaultValue'), intervaloHoras: value } })}
              />
            </Grid.Col>
            <Grid.Col span={4}>
              <NumberInput
                label="Intervalo de Cambio (Meses)"
                placeholder="12" min={0}
                value={getDeep(attribute, 'defaultValue.intervaloMeses') || ''}
                onChange={(value) => onUpdate(path, { ...attribute, defaultValue: { ...getDeep(attribute, 'defaultValue'), intervaloMeses: value } })}
              />
            </Grid.Col>
          </Grid>
          <Text size="xs" c="dimmed">La fecha y los últimos cambios se registrarán en la instancia de Activo.</Text>
        </Stack>
      )}

      {/* Caso: Neumático */}
      {attribute.consumibleType === 'Neumatico' && (
        <TagsInput
          label="Medidas de Neumático Compatibles"
          description="Añade las medidas compatibles (ej: 295/80R22.5)"
          placeholder="Escribe una medida y presiona Enter"
          defaultValue={getDeep(attribute, 'compatibilidad.propiedades.medidas') || []}
          onBlur={(e) => onUpdate(path, { ...attribute, compatibilidad: { mode: 'porPropiedades', propiedades: { medidas: e.currentTarget.value.split(',').map(s => s.trim()) } } })}
          mt="sm"
        />
      )}
      
      {/* Caso: Correa */}
      {attribute.consumibleType === 'Correa' && (
        <TagsInput
          label="Códigos de Correa Compatibles"
          description="Añade los códigos de parte de las correas (ej: 6PK1035)"
          placeholder="Escribe un código y presiona Enter"
          defaultValue={getDeep(attribute, 'compatibilidad.propiedades.codigos') || []}
          onBlur={(e) => onUpdate(path, { ...attribute, compatibilidad: { mode: 'porPropiedades', propiedades: { codigos: e.currentTarget.value.split(',').map(s => s.trim()) } } })}
          mt="sm"
        />
      )}

      {/* Caso: Filtro, Bujía, Sensor, Batería, Otro */}
      {['Filtro', 'Bujia', 'Sensor', 'Bateria', 'Otro'].includes(attribute.consumibleType) && (
        <Group align="flex-end" grow>
          <MultiSelect
            label={`Consumibles Compatibles (${attribute.consumibleType})`}
            description="Selecciona los ítems de tu inventario que son compatibles."
            data={consumibles} searchable placeholder="Busca y selecciona..."
            value={getDeep(attribute, 'compatibilidad.consumibleIds') || []}
            onChange={(values) => onUpdate(path, { ...attribute, compatibilidad: { mode: 'directa', consumibleIds: values } })}
          />
          <ActionIcon size="lg" variant="filled" onClick={() => setModalOpened(true)}><IconPlus /></ActionIcon>
        </Group>
      )}

      {/* Caso: Manguera (Objeto abstracto) */}
      {attribute.consumibleType === 'Manguera' && (
        <Textarea
          label="Notas sobre Mangueras"
          description="Este es un campo abstracto. Registre cualquier nota relevante aquí."
          defaultValue={getDeep(attribute, 'defaultValue.notas') || ''}
          onBlur={(e) => onUpdate(path, { ...attribute, defaultValue: { notas: e.currentTarget.value } })}
          minRows={2}
          mt="sm"
        />
      )}

      {/* Modal para crear un nuevo consumible desde la misma página */}
      <Modal opened={modalOpened} onClose={() => setModalOpened(false)} title={`Crear Nuevo ${attribute.consumibleType}`} size="xl">
        <ConsumibleForm initialData={{ tipo: attribute.consumibleType, stock: 0 }} onSuccess={handleConsumibleCreado} />
      </Modal>
    </Paper>
  );
}

// --- Componente para DEFINIR Atributos (Modo Grupo/Categoría) ---
export function AtributoField({ attribute, path, onUpdate, level }) {
  const [isConsumible, setIsConsumible] = useState(!!attribute.consumibleType);

  useEffect(() => {
    setIsConsumible(!!attribute.consumibleType);
  }, [attribute.consumibleType]);

  const handleLabelBlur = (e) => {
    const newLabel = e.currentTarget.value;
    const newId = toCamelCase(newLabel);
    onUpdate(path, { ...attribute, label: newLabel, id: newId });
  };

  const handleIsConsumibleChange = (checked) => {
    setIsConsumible(checked);
    if (checked) {
      // Al convertir a consumible, reseteamos los campos de tipo de dato regular
      onUpdate(path, { ...attribute, isConsumible: true, dataType: null, inputType: null });
    } else {
      // Al volver a regular, reseteamos el tipo de consumible
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
          data={['Aceite', 'Filtro', 'Correa', 'Neumatico', 'Manguera', 'Bateria', 'Bombillo', 'Sensor', 'Bujia', 'Pastillas de Freno', 'Repuesto', 'Otro']}
          value={attribute.consumibleType || ''}
          onChange={(value) => onUpdate(path, { ...attribute, consumibleType: value })}
        />
        {attribute.consumibleType === 'Manguera' && (
          <Text size="xs" c="dimmed" mt="xs">Este es un campo abstracto. Se registrará la información en el momento del mantenimiento.</Text>
        )}
      </Collapse>

      <Collapse in={!isConsumible} mt="xs">
        <SimpleGrid cols={2}>
          <Select label="Tipo de Dato" value={attribute.dataType} onChange={(v) => onUpdate(path, { ...attribute, dataType: v })} data={['string', 'number', 'boolean', 'object', 'grupo']} />
          {attribute.dataType === 'string' && <Select label="Tipo de Input" value={attribute.inputType} onChange={(v) => onUpdate(path, { ...attribute, inputType: v })} data={['text', 'textarea', 'select', 'multiSelect', 'image']} />}
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