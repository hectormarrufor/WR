// app/superuser/flota/_components/AtributoConstructor.js
'use client';

import { useState } from 'react';
import {
  TextInput, Select, Button, Group, Box, Paper, Text, ActionIcon, Collapse,
  TagsInput, NumberInput, Checkbox, SimpleGrid, SegmentedControl, useMantineTheme, Title
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconTrash, IconPlus, IconArrowDown, IconArrowUp } from '@tabler/icons-react';
import { theme as THEME } from '@/theme';


// Helper para acceder a valores anidados en el objeto del formulario
const getDeep = (obj, path) => path.split('.').filter(Boolean).reduce((acc, part) => acc && acc[part], obj);

// --- Componente para Atributos Simples (string, number, boolean) ---
function AtributoField({ attribute, path, onRemove, onUpdate, level }) {
  const [showDetails, setShowDetails] = useState(true);
  const theme = useMantineTheme(THEME);

  // Se aplica el color de fondo basado en el nivel
  const paperColor = theme.colors.gray[level];

  const handleUpdate = (field, value) => {
    onUpdate(path, { ...attribute, [field]: value });
  };

  // ✨ NUEVA LÓGICA: Cuando se cambia el tipo de dato
  const handleDataTypeChange = (newDataType) => {
    const newValues = { dataType: newDataType };
    // Si el nuevo tipo es "Generador", pre-configuramos su estructura
    if (newDataType === 'Generador') {
      newValues.isGenerator = true;
      newValues.inputType = 'number'; // Un generador siempre es numérico
      newValues.generates = {
        prefix: '',
        label: '',
        schema: {
          id: '', // Se generará a partir del prefijo
          label: '', // Se generará a partir de la etiqueta
          dataType: 'string',
          inputType: 'text',
          selectOptions: [],
        }
      };
    } else {
      // Si se cambia a otro tipo, limpiamos las propiedades de generador
      delete newValues.isGenerator;
      delete newValues.generates;
    }
    onUpdate(path, { ...attribute, ...newValues });
  }

  const renderSelectOptionsInput = () => {
    // Un generador no tiene opciones de select, pero su schema sí puede tenerlas
    if ((attribute.inputType === 'select' || attribute.inputType === 'multiSelect') && !attribute.isGenerator) {
      return <TagsInput label="Opciones del Select" description="Presione Enter para agregar una opción." placeholder="Ej: Opción 1..." value={attribute.selectOptions || []} onChange={(value) => handleUpdate('selectOptions', value)} mt="xs" />;
    }
    return null;
  };



  const renderDefaultValueInput = () => {
    if (attribute.inputType === 'select' || attribute.inputType === 'multiSelect') return null;
    switch (attribute.dataType) {
      case 'string': return <TextInput label="Valor por Defecto" value={attribute.defaultValue || ''} onChange={(e) => handleUpdate('defaultValue', e.currentTarget.value)} mt="xs" />;
      case 'number': return <NumberInput label="Valor por Defecto" value={attribute.defaultValue || ''} onChange={(value) => handleUpdate('defaultValue', value)} mt="xs" />;
      case 'boolean': return <Checkbox label="Valor por Defecto (marcado = true)" checked={attribute.defaultValue || false} onChange={(e) => handleUpdate('defaultValue', e.currentTarget.checked)} mt="xs" />;
      default: return null;
    }
  }

  const renderRangeInputs = () => {
    if (attribute.dataType === 'number') {
      return <Group grow mt="xs"><NumberInput label="Valor Mínimo" value={attribute.min} onChange={(val) => handleUpdate('min', val)} /><NumberInput label="Valor Máximo" value={attribute.max} onChange={(val) => handleUpdate('max', val)} /></Group>;
    }
    return null;
  }

  return (
    <Paper withBorder p="md" mt="sm" shadow="xs" bg={paperColor}>
      <Group justify="space-between">
        <Text fw={500}>{attribute.label || 'Nuevo Atributo'}</Text>
        <ActionIcon color="red" onClick={onRemove}><IconTrash size={16} /></ActionIcon>
      </Group>
      <Button variant="subtle" size="xs" onClick={() => setShowDetails((p) => !p)} leftSection={showDetails ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />}>
        {showDetails ? 'Ocultar Detalles' : 'Mostrar Detalles'}
      </Button>
      <Collapse in={showDetails}>
        <SimpleGrid cols={2} mt="xs">
          <TextInput label="Label del Campo" placeholder="Ej: Tipo de Aceite" required value={attribute.label} onChange={(e) => handleUpdate('label', e.currentTarget.value)} />
          <TextInput label="ID del Atributo (en JSON)" placeholder="Ej: tipoAceite" required value={attribute.id} onChange={(e) => handleUpdate('id', e.currentTarget.value)} />
        </SimpleGrid>
        <SimpleGrid cols={2} mt="xs">
          <Select label="Tipo de Dato" placeholder="Seleccione un tipo" required value={attribute.dataType} onChange={handleDataTypeChange} data={['string', 'number', 'boolean', 'object', 'grupo', 'Generador']} />
          {attribute.dataType === 'string' && (<Select label="Tipo de Input" placeholder="Seleccione un input" value={attribute.inputType} onChange={(value) => handleUpdate('inputType', value)} data={['text', 'textarea', 'select', 'multiSelect']} />)}
        </SimpleGrid>
        {/* ✨ NUEVO: Formulario para configurar el generador */}
        {attribute.dataType === 'Generador' && (
          <Paper withBorder p="sm" mt="md" radius="sm">
            <Title order={6} mb="xs">Configuración del Generador</Title>
            <TextInput
              label="Prefijo para ID de los campos generados"
              placeholder="Ej: filtroAceite"
              value={attribute.generates?.prefix || ''}
              onChange={(e) => handleUpdate('generates', { ...attribute.generates, prefix: e.currentTarget.value })}
            />
            <TextInput
              label="Etiqueta base para los campos generados"
              placeholder="Ej: Filtro de Aceite #"
              mt="xs"
              value={attribute.generates?.label || ''}
              onChange={(e) => handleUpdate('generates', { ...attribute.generates, label: e.currentTarget.value })}
            />
            <Text fw={500} size="sm" mt="md" mb="xs">Esquema del Campo a Generar:</Text>
            <Select
              label="Tipo de Dato del campo generado"
              data={['string', 'number', 'boolean']}
              value={attribute.generates?.schema?.dataType || 'string'}
              onChange={(v) => handleUpdate('generates', { ...attribute.generates, schema: { ...attribute.generates.schema, dataType: v } })}
            />
            <Select
              label="Tipo de Input del campo generado"
              mt="xs"
              data={['text', 'textarea', 'select', 'multiSelect']}
              value={attribute.generates?.schema?.inputType || 'text'}
              onChange={(v) => handleUpdate('generates', { ...attribute.generates, schema: { ...attribute.generates.schema, inputType: v } })}
            />
          </Paper>
        )}
        {renderSelectOptionsInput()}
        {renderDefaultValueInput()}
        {renderRangeInputs()}
      </Collapse>
    </Paper>
  );
}

// --- El Constructor Principal ---
export default function AtributoConstructor({ form, pathPrefix = '', availableGroups = [], level = 0, from }) {
  const theme = useMantineTheme(THEME);
  // Se define el color para todos los elementos en este nivel de profundidad.
  const paperColor = theme.colors.gray[level];
  const fieldName = `${pathPrefix}definicion`; // <-- Definimos la ruta base una sola vez

  const addAttribute = () => {
    const currentDefinicion = getDeep(form.values, fieldName) || [];
    form.setFieldValue(fieldName, [...currentDefinicion, { key: `attr_${Date.now()}`, dataType: 'string', inputType: 'text', label: '', id: '' }]);
  };
  const removeAttribute = (index) => {
    const currentDefinicion = getDeep(form.values, fieldName) || [];
    form.setFieldValue(fieldName, currentDefinicion.filter((_, i) => i !== index));
  };

  const updateAttribute = (index, newValue) => {
    form.setFieldValue(`${fieldName}.${index}`, newValue);
  }

  const handleModeChange = (index, mode) => {
    const attributePath = `${pathPrefix}definicion.${index}`;
    const attribute = getDeep(form.values, attributePath);
    if (mode === 'define') {
      updateAttribute(index, { ...attribute, mode, refId: null, subGrupo: { key: `sub_${Date.now()}`, nombre: '', definicion: [] } });
    } else {
      updateAttribute(index, { ...attribute, mode, refId: null, subGrupo: null });
    }
  }
 const definicion = getDeep(form.values, fieldName) || [];

  // ✨ LÓGICA CORREGIDA: Esta función es para cuando se *usa* el generador (en Modelos), no para definirlo.
  // La corrección clave es usar 'fieldName' que ya definimos arriba.
  const handleGeneratorChange = (newValue, generatorIndex) => {
    const numValue = parseInt(newValue, 10) || 0;
    form.setFieldValue(fieldName, (currentDefinition) => {
      const generatorAttr = currentDefinition[generatorIndex];
      const cleanDefinition = currentDefinition.filter(attr => !(attr.generatedBy === generatorAttr.id));
      const generatedFields = [];
      for (let i = 1; i <= numValue; i++) {
        const template = generatorAttr.generates.schema;
        generatedFields.push({
          ...template,
          id: `${generatorAttr.generates.prefix}_${i}`,
          label: `${generatorAttr.generates.label}${i}`,
          key: `gen_${generatorAttr.id}_${i}_${Math.random()}`,
          generatedBy: generatorAttr.id,
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

    // Si el atributo es un generador, renderizamos su input y le añadimos el onChange especial
    // ✨ LÓGICA MEJORADA: Aquí decidimos si el atributo es un generador y si debemos mostrar su input especial
    // La condición `from === 'Modelo'` es un ejemplo, puedes cambiarla por una prop `enableGenerators`
    if (item.isGenerator && from === 'Modelo') {
      return (
        <Paper key={item.key} withBorder p="md" mt="sm" shadow="xs" bg={paperColor}>
          <NumberInput
            label={item.label}
            description="Introduce un número para generar los campos correspondientes."
            min={item.min}
            max={item.max}
            value={item.defaultValue || 0}
            onChange={(value) => {
              updateAttribute(index, { ...item, defaultValue: value });
              handleGeneratorChange(value, index);
            }}
          />
        </Paper>
      );
    }

    if (item.dataType === 'object') {
      return (
        <Paper key={item.key} withBorder p="md" mt="sm" shadow="xs" bg={paperColor}>
          <Group justify="space-between">
            <Text fw={700} c="cyan">Atributo de Objeto: {item.label || ''}</Text>
            <ActionIcon color="red" onClick={() => removeAttribute(index)}><IconTrash size={16} /></ActionIcon>
          </Group>
          <SimpleGrid cols={2} mt="xs">
            <TextInput label="Label del Objeto" placeholder="Ej: Aceite" required value={item.label} onChange={(e) => updateAttribute(index, { ...item, label: e.currentTarget.value })} />
            <TextInput label="ID del Objeto (en JSON)" placeholder="Ej: aceite" required value={item.id} onChange={(e) => updateAttribute(index, { ...item, id: e.currentTarget.value })} />
          </SimpleGrid>
          {/* Llamada recursiva, incrementando el nivel de profundidad */}
          <AtributoConstructor form={form} pathPrefix={`${pathPrefix}definicion.${index}.`} availableGroups={availableGroups} level={level + 1} />
        </Paper>
      );
    }

    if (item.dataType === 'grupo') {
      return (
        <Paper key={item.key} withBorder p="md" mt="sm" shadow="xs" bg={paperColor}>
          <Group justify="space-between">
            <Text fw={700} c="blue">Atributo de {from}: {item.label || ''}</Text>
            <ActionIcon color="red" onClick={() => removeAttribute(index)}><IconTrash size={16} /></ActionIcon>
          </Group>
          <SimpleGrid cols={2} mt="xs">
            <TextInput label="Label del Campo" placeholder="Ej: Motor" required value={item.label} onChange={(e) => updateAttribute(index, { ...item, label: e.currentTarget.value })} />
            <TextInput label="ID del Atributo (en JSON)" placeholder="Ej: motor" required value={item.id} onChange={(e) => updateAttribute(index, { ...item, id: e.currentTarget.value })} />
          </SimpleGrid>
          {from == "Grupo" && <SegmentedControl fullWidth mt="md" value={item.mode || 'none'} onChange={(v) => handleModeChange(index, v)} data={[{ label: 'Seleccionar Existente', value: 'select' }, { label: "Definir nueva Categoria", value: 'define' }]} />}
          <Collapse in={item.mode === 'select'}>
            <Select label="Seleccionar un grupo existente" placeholder="Elija un grupo" data={availableGroups.map(g => ({ value: g.id.toString(), label: g.nombre }))} value={item.refId} onChange={(v) => updateAttribute(index, { ...item, refId: v })} mt="xs" />
          </Collapse>
          <Collapse in={item.mode === 'define'}>
            {/* El contenedor del sub-grupo también incrementa el nivel */}
            <Paper withBorder p="md" mt="md" bg={theme.colors.gray[level]}>
              <TextInput label={from == "Categoria" ? "Nombre de la nueva Sub-Categoria" : "Nombre del Nuevo Sub-Grupo"} placeholder={from == "Categoria" ? "Ej: MOTOR_CAMIONETA" : "Ej: MOTOR_VEHICULO"} required value={item.subGrupo?.nombre || ''} onChange={(e) => updateAttribute(index, { ...item, subGrupo: { ...item.subGrupo, nombre: e.currentTarget.value } })} />
              {/* Llamada recursiva, incrementando el nivel de profundidad */}
              <AtributoConstructor from="Categoria" form={form} pathPrefix={`${pathPrefix}definicion.${index}.subGrupo.`} availableGroups={availableGroups} level={level + 1} />
            </Paper>
          </Collapse>
        </Paper>
      );
    }

    // Para atributos simples, pasamos el nivel actual al componente AtributoField
    return <AtributoField key={item.key} attribute={item} path={`${pathPrefix}definicion.${index}`} onRemove={() => removeAttribute(index)} onUpdate={(path, value) => form.setFieldValue(path, value)} level={level} />;
  });

  return (
    <Box mt="lg">
      <Text size="lg" fw={500}>{level === 0 ? 'Definición de Atributos' : ''}</Text>
      {fields && fields.length > 0 ? fields : <Text c="dimmed" mt="md">Aún no se han definido atributos para {level > 0 ? 'este sub-nivel' : 'el grupo principal'}.</Text>}
      <Button leftSection={<IconPlus size={14} />} onClick={addAttribute} mt="md">
        Añadir Atributo
      </Button>
    </Box>
  );
}