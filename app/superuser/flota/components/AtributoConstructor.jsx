'use client';

import { useState } from 'react';
import {
  TextInput, Select, Button, Group, Box, Paper, Text, ActionIcon, Collapse,
  TagsInput, NumberInput, Checkbox, SimpleGrid, SegmentedControl, useMantineTheme, Title,
  Switch
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconTrash, IconPlus, IconArrowDown, IconArrowUp, IconSettings, IconForms } from '@tabler/icons-react';
import { theme as THEME } from '@/theme';


const getDeep = (obj, path) => path.split('.').filter(Boolean).reduce((acc, part) => acc && acc[part], obj);

// --- Componente para DEFINIR Atributos (Modo Grupo/Categoría) ---
function AtributoField({ attribute, path, onUpdate, level }) {
  const [showDetails, setShowDetails] = useState(true);
  const theme = useMantineTheme(THEME);
  const paperColor = theme.colors.gray[level];

  const handleUpdate = (field, value) => {
    onUpdate(path, { ...attribute, [field]: value });
  };

  const handleDataTypeChange = (newDataType) => {
    const newValues = { dataType: newDataType };
    if (newDataType === 'object') { newValues.definicion = []; }
    if (newDataType === 'Generador') {
      newValues.isGenerator = true;
      newValues.inputType = 'number';
      newValues.generates = { prefix: '', label: '', schema: { id: '', label: '', dataType: 'string', inputType: 'text', selectOptions: [] } };
    } else {
      delete newValues.isGenerator;
      delete newValues.generates;
    }
    onUpdate(path, { ...attribute, ...newValues });
  }

  const renderSelectOptionsInput = () => {
    if ((attribute.inputType === 'select' || attribute.inputType === 'multiSelect') && !attribute.isGenerator) {
      return <TagsInput label="Opciones del Select" description="Presione Enter para agregar una opción." placeholder="Ej: Opción 1..." defaultValue={attribute.selectOptions || []} onBlur={(e) => handleUpdate('selectOptions', e.currentTarget.value.split(','))} mt="xs" />;
    }
    return null;
  };

  const renderDefaultValueInput = () => {
    if (attribute.inputType === 'select' || attribute.inputType === 'multiSelect') return null;
    switch (attribute.dataType) {
      case 'string': return <TextInput label="Valor por Defecto" defaultValue={attribute.defaultValue || ''} onBlur={(e) => handleUpdate('defaultValue', e.currentTarget.value)} mt="xs" />;
      case 'number': return <NumberInput label="Valor por Defecto" defaultValue={attribute.defaultValue || ''} onBlur={(e) => handleUpdate('defaultValue', e.currentTarget.value)} mt="xs" />;
      case 'boolean': return <Checkbox label="Valor por Defecto (marcado = true)" defaultChecked={attribute.defaultValue || false} onChange={(e) => handleUpdate('defaultValue', e.currentTarget.checked)} mt="xs" />;
      default: return null;
    }
  }

  const renderRangeInputs = () => {
    if (attribute.dataType === 'number') {
      return <Group grow mt="xs"><NumberInput label="Valor Mínimo" defaultValue={attribute.min} onBlur={(e) => handleUpdate('min', e.currentTarget.value)} /><NumberInput label="Valor Máximo" defaultValue={attribute.max} onBlur={(e) => handleUpdate('max', e.currentTarget.value)} /></Group>;
    }
    return null;
  }


  return (
    <Collapse in={showDetails}>
      <SimpleGrid cols={2} mt="xs">
        <TextInput label="Label del Campo" placeholder="Ej: Tipo de Aceite" required defaultValue={attribute.label} onBlur={(e) => handleUpdate('label', e.currentTarget.value)} />
        <TextInput label="ID del Atributo (en JSON)" placeholder="Ej: tipoAceite" required defaultValue={attribute.id} onBlur={(e) => handleUpdate('id', e.currentTarget.value)} />
      </SimpleGrid>
      <SimpleGrid cols={2} mt="xs">
        <Select label="Tipo de Dato" placeholder="Seleccione un tipo" required value={attribute.dataType} onChange={handleDataTypeChange} data={['string', 'number', 'boolean', 'object', 'grupo', 'Generador']} />
        {attribute.dataType === 'string' && (<Select label="Tipo de Input" placeholder="Seleccione un input" value={attribute.inputType} onChange={(value) => handleUpdate('inputType', value)} data={['text', 'textarea', 'select', 'multiSelect']} />)}
      </SimpleGrid>
      {attribute.dataType === 'Generador' && (
        <Paper withBorder p="sm" mt="md" radius="sm">
          <Title order={6} mb="xs">Configuración del Generador</Title>
          <TextInput label="Prefijo para ID" placeholder="Ej: filtroAceite" defaultValue={attribute.generates?.prefix} onBlur={(e) => handleUpdate('generates', { ...attribute.generates, prefix: e.currentTarget.value })} />
          <TextInput label="Etiqueta base" placeholder="Ej: Filtro de Aceite #" mt="xs" defaultValue={attribute.generates?.label} onBlur={(e) => handleUpdate('generates', { ...attribute.generates, label: e.currentTarget.value })} />
          <Text fw={500} size="sm" mt="md" mb="xs">Esquema del Campo a Generar:</Text>
          <Select label="Tipo de Dato" data={['string', 'number', 'boolean']} value={attribute.generates?.schema?.dataType} onChange={(v) => handleUpdate('generates', { ...attribute.generates, schema: { ...attribute.generates.schema, dataType: v } })} />
          <Select label="Tipo de Input" mt="xs" data={['text', 'textarea', 'select', 'multiSelect']} value={attribute.generates?.schema?.inputType} onChange={(v) => handleUpdate('generates', { ...attribute.generates, schema: { ...attribute.generates.schema, inputType: v } })} />
        </Paper>
      )}
      {renderSelectOptionsInput()}
      {renderDefaultValueInput()}
      {renderRangeInputs()}
    </Collapse>
  );
}

// --- Componente para RELLENAR Atributos (Modo Modelo/Activo) ---
function AtributoInput({ attribute, path, onUpdate }) {
  switch (attribute.inputType) {
    case 'select':
      return <Select label={attribute.label} data={attribute.selectOptions || []} defaultValue={attribute.defaultValue} onBlur={(e) => onUpdate(path, { ...attribute, defaultValue: e.currentTarget.value })} />;
    case 'multiSelect':
      return <TagsInput label={attribute.label} description="Presione Enter para agregar un valor." placeholder="Añadir..." defaultValue={attribute.defaultValue || []} onBlur={(e) => onUpdate(path, { ...attribute, defaultValue: e.currentTarget.value.split(',') })} />;
    case 'image':
      return <Text size="sm" c="dimmed">Campo de Imagen (se mostrará en el formulario de Activos)</Text>;
    case 'number':
      return <NumberInput label={attribute.label} min={attribute.min} max={attribute.max} defaultValue={attribute.defaultValue} onBlur={(e) => onUpdate(path, { ...attribute, defaultValue: e.currentTarget.value })} />;
    default:
      return <TextInput label={attribute.label} defaultValue={attribute.defaultValue} onBlur={(e) => onUpdate(path, { ...attribute, defaultValue: e.currentTarget.value })} />;
  }
}


export default function AtributoConstructor({ form, pathPrefix = '', availableGroups = [], level = 0, from }) {
  const theme = useMantineTheme();
  const paperColor = theme.colors.gray[level];
  const fieldName = `${pathPrefix}definicion`;

  const addAttribute = () => {
    const currentDefinicion = getDeep(form.values, fieldName) || [];
    form.setFieldValue(fieldName, [...currentDefinicion, { key: `attr_${Date.now()}`, dataType: 'string', inputType: 'text', label: '', id: '' }]);
  };
  const removeAttribute = (index) => {
    const currentDefinicion = getDeep(form.values, fieldName) || [];
    form.setFieldValue(fieldName, currentDefinicion.filter((_, i) => i !== index));
  };
  const updateAttribute = (path, newValue) => { form.setFieldValue(path, newValue); };
  const handleModeChange = (index, mode) => {
    const attributePath = `${pathPrefix}definicion.${index}`;
    const attribute = getDeep(form.values, attributePath);
    if (mode === 'define') {
      updateAttribute(index, { ...attribute, mode, refId: null, subGrupo: { key: `sub_${Date.now()}`, nombre: '', definicion: [] } });
    } else {
      updateAttribute(index, { ...attribute, mode, refId: null, subGrupo: null });
    }
  };
  const definicion = getDeep(form.values, fieldName) || [];

  const handleGeneratorChange = (newValue, generatorIndex) => {
    const numValue = parseInt(newValue, 10) || 0;
    form.setFieldValue(fieldName, (currentDefinition) => {
      let newDefinition = [...currentDefinition];
      const generatorAttr = newDefinition[generatorIndex];

      // ✨ CORRECCIÓN 1: Actualizamos el valor del generador en la misma operación
      newDefinition[generatorIndex] = { ...generatorAttr, defaultValue: numValue };

      const cleanDefinition = newDefinition.filter(attr => !(attr.generatedBy === generatorAttr.id));
      const generatedFields = [];
      for (let i = 1; i <= numValue; i++) {
        const template = generatorAttr.generates.schema;
        generatedFields.push({
          ...template,
          id: `${generatorAttr.generates.prefix}_${i}`,
          label: `${generatorAttr.generates.label} ${i}`,
          key: `gen_${generatorAttr.id}_${i}_${Math.random()}`,
          generatedBy: generatorAttr.id,
          // Importante: le asignamos el modo 'input' por defecto
          renderMode: 'input',
        });
      }
      const finalDefinition = [
        ...cleanDefinition.slice(0, generatorIndex + 1),
        ...generatedFields,
        ...cleanDefinition.slice(generatorIndex + 1)
      ];
      return finalDefinition;
    });
  };

  const fields = definicion.map((item, index) => {
    const currentPath = `${fieldName}.${index}`;
    const renderMode = item.renderMode || 'define';

    // Para los tipos contenedores (objeto o grupo), la lógica es una
    if (item.dataType === 'object' || item.dataType === 'grupo') {
      return (
        <Paper key={item.key} withBorder p="md" mt="sm" shadow="xs" bg={paperColor}>
          <Group justify="space-between">
            <Text fw={700} c={item.dataType === 'object' ? 'cyan' : 'blue'}>{item.dataType === 'object' ? 'Atributo de Objeto: ' : `Atributo de ${from}: `}{item.label || ''}</Text>
            <ActionIcon color="red" onClick={() => removeAttribute(index)}><IconTrash size={16} /></ActionIcon>
          </Group>
          {/* Mostramos los campos de definición solo si el modo es 'define' */}
          <Collapse in={renderMode === 'define'}>
            <SimpleGrid cols={2} mt="xs">
              <TextInput label={`Label del ${item.dataType}`} defaultValue={item.label} onBlur={(e) => updateAttribute(currentPath, { ...item, label: e.currentTarget.value })} />
              <TextInput label={`ID del ${item.dataType} (en JSON)`} defaultValue={item.id} onBlur={(e) => updateAttribute(currentPath, { ...item, id: e.currentTarget.value })} />
            </SimpleGrid>
            {item.dataType === 'grupo' && from === "Grupo" && (
              <>
                <SegmentedControl fullWidth mt="md" value={item.mode || 'select'} onChange={(v) => handleModeChange(index, v)} data={[{ label: 'Seleccionar Existente', value: 'select' }, { label: "Definir Nuevo", value: 'define' }]} />
                <Collapse in={item.mode === 'select'}><Select data={availableGroups.map(g => ({ value: g.id.toString(), label: g.nombre }))} value={item.refId?.toString()} onChange={(v) => updateAttribute(currentPath, { ...item, refId: v })} mt="xs" /></Collapse>
              </>
            )}
          </Collapse>

          {/* La llamada recursiva siempre se hace para ver a los hijos */}
          <AtributoConstructor
            form={form}
            pathPrefix={`${currentPath}${item.dataType === 'grupo' ? '.subGrupo.' : '.'}`}
            availableGroups={availableGroups}
            level={level + 1}
            from={from === "Grupo" ? "Categoria" : from}
          />
        </Paper>
      );
    }

    // Para los tipos simples (string, number, generador, etc.)
    return (
      <Paper key={item.key} withBorder p="md" mt="sm" shadow="xs" bg={paperColor}>
        <Group justify="space-between">
          <Text fw={500}>{item.label || 'Nuevo Atributo'}</Text>
          <Group gap="xs">
            {from !== 'Grupo' && (
              <Switch
                checked={renderMode === 'input'}
                onChange={(event) => updateAttribute(currentPath, { ...item, renderMode: event.currentTarget.checked ? 'input' : 'define' })}
                size="sm"
                onLabel={<IconForms size={12} />}
                offLabel={<IconSettings size={12} />}
              />
            )}
            <ActionIcon color="red" onClick={() => removeAttribute(index)}><IconTrash size={16} /></ActionIcon>
          </Group>
        </Group>

        <Collapse in={renderMode === 'define'}>
          <AtributoField attribute={item} path={currentPath} onRemove={() => removeAttribute(index)} onUpdate={updateAttribute} level={level} />
        </Collapse>
        <Collapse in={renderMode === 'input'}>
          <Box mt="md">
            {item.isGenerator ? (
              <NumberInput
                label={item.label}
                description="Introduce un número para generar los campos correspondientes."
                min={item.min ? Number(item.min) : undefined}
                max={item.max ? Number(item.max) : undefined}
                defaultValue={item.defaultValue || 0}
                onChange={(value) => handleGeneratorChange(value, index)}
              />
            ) : (
              <AtributoInput attribute={item} path={currentPath} onUpdate={updateAttribute} />
            )}
            
          </Box>
        </Collapse>

      </Paper>
    );
  });

  return (
    <Box mt="lg">
      <Text size="lg" fw={500}>{level === 0 ? 'Definición de Atributos' : ''}</Text>
      {fields && fields.length > 0 ? fields : <Text c="dimmed" mt="md">Aún no se han definido atributos.</Text>}
      {/* ✨ CORRECCIÓN 2: El botón "Añadir Atributo" ahora siempre es visible */}
      <Button leftSection={<IconPlus size={14} />} onClick={addAttribute} mt="md">
        Añadir Atributo
      </Button>
    </Box>
  );
}