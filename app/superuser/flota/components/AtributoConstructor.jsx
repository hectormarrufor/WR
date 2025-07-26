// app/superuser/flota/_components/AtributoConstructor.js
'use client';

import { useState, memo, useCallback } from 'react'; // Importamos memo y useCallback
import {
  TextInput, Select, Button, Group, Box, Paper, Text, ActionIcon, Collapse,
  TagsInput, NumberInput, Checkbox, SimpleGrid, SegmentedControl, useMantineTheme
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconTrash, IconPlus, IconArrowDown, IconArrowUp } from '@tabler/icons-react';
import {theme as THEME} from '@/theme'; // Asegúrate de que la ruta sea correcta

const getDeep = (obj, path) => path.split('.').filter(Boolean).reduce((acc, part) => acc && acc[part], obj);

// --- Componente AtributoField "Memoizado" ---
// Envolvemos el componente con React.memo. Ahora solo se renderizará de nuevo si sus props cambian.
const MemoizedAtributoField = memo(function AtributoField({ attribute, path, onRemove, onUpdate, level }) {
  const [showDetails, setShowDetails] = useState(true);
  const theme = useMantineTheme(THEME);
  const paperColor = theme.colors.gray[Math.min(level, 9)];

  // ... (el resto del código de AtributoField es idéntico al de la versión anterior)
  const handleUpdate = (field, value) => {
    onUpdate(path, { ...attribute, [field]: value });
  };
  
  const renderSelectOptionsInput = () => {
    if (attribute.inputType === 'select' || attribute.inputType === 'multiSelect') {
      return <TagsInput label="Opciones del Select" description="Presione Enter para agregar una opción." placeholder="Ej: Opción 1..." value={attribute.selectOptions || []} onChange={(value) => handleUpdate('selectOptions', value)} mt="xs" />;
    }
    return null;
  };

  const renderDefaultValueInput = () => {
    if (attribute.inputType === 'select' || attribute.inputType === 'multiSelect') return null;
    switch(attribute.dataType) {
      case 'string': return <TextInput label="Valor por Defecto" value={attribute.defaultValue || ''} onChange={(e) => handleUpdate('defaultValue', e.currentTarget.value)} mt="xs" />;
      case 'number': return <NumberInput label="Valor por Defecto" value={attribute.defaultValue || ''} onChange={(value) => handleUpdate('defaultValue', value)} mt="xs" />;
      case 'boolean': return <Checkbox label="Valor por Defecto (marcado = true)" checked={attribute.defaultValue || false} onChange={(e) => handleUpdate('defaultValue', e.currentTarget.checked)} mt="xs" />;
      default: return null;
    }
  }

  const renderRangeInputs = () => {
    if(attribute.dataType === 'number') {
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
      <Button variant="subtle" size="xs" onClick={() => setShowDetails((p) => !p)} leftSection={showDetails ? <IconArrowUp size={14}/> : <IconArrowDown size={14}/>}>
        {showDetails ? 'Ocultar Detalles' : 'Mostrar Detalles'}
      </Button>
      <Collapse in={showDetails}>
        <SimpleGrid cols={2} mt="xs">
          <TextInput label="Label del Campo" placeholder="Ej: Tipo de Aceite" required value={attribute.label} onChange={(e) => handleUpdate('label', e.currentTarget.value)} />
          <TextInput label="ID del Atributo (en JSON)" placeholder="Ej: tipoAceite" required value={attribute.id} onChange={(e) => handleUpdate('id', e.currentTarget.value)} />
        </SimpleGrid>
        <SimpleGrid cols={2} mt="xs">
          <Select label="Tipo de Dato" placeholder="Seleccione un tipo" required value={attribute.dataType} onChange={(value) => handleUpdate('dataType', value)} data={['string', 'number', 'boolean', 'object', 'grupo']} />
          {attribute.dataType === 'string' && (<Select label="Tipo de Input" placeholder="Seleccione un input" value={attribute.inputType} onChange={(value) => handleUpdate('inputType', value)} data={['text', 'textarea', 'select', 'multiSelect']} />)}
        </SimpleGrid>
        {renderSelectOptionsInput()}
        {renderDefaultValueInput()}
        {renderRangeInputs()}
      </Collapse>
    </Paper>
  );
});

// --- El Constructor Principal (también memoizado) ---
export default memo(function AtributoConstructor({ form, pathPrefix = '', availableGroups = [], level = 0 }) {
  const theme = useMantineTheme();
  const paperColor = theme.colors.gray[Math.min(level, 9)];

  // --- OPTIMIZACIÓN: Funciones envueltas en useCallback ---
  // Estas funciones ahora mantendrán la misma referencia entre renders,
  // a menos que sus dependencias (form, pathPrefix) cambien.
  const addAttribute = useCallback(() => {
    const definicionPath = `${pathPrefix}definicion`;
    const currentDefinicion = getDeep(form.values, definicionPath) || [];
    form.setFieldValue(definicionPath, [...currentDefinicion, { key: `attr_${Date.now()}`, id: '', label: '', dataType: 'string', inputType: 'text', selectOptions: [], defaultValue: '', min: undefined, max: undefined, mode: 'none', refId: null, subGrupo: null, definicion: [] }]);
  }, [form, pathPrefix]);

  const removeAttribute = useCallback((index) => {
    const definicionPath = `${pathPrefix}definicion`;
    const currentDefinicion = getDeep(form.values, definicionPath) || [];
    form.setFieldValue(definicionPath, currentDefinicion.filter((_, i) => i !== index));
  }, [form, pathPrefix]);
  
  const updateAttribute = useCallback((index, newValue) => {
    form.setFieldValue(`${pathPrefix}definicion.${index}`, newValue);
  }, [form, pathPrefix]);

  const handleModeChange = useCallback((index, mode) => {
    const attributePath = `${pathPrefix}definicion.${index}`;
    const attribute = getDeep(form.values, attributePath);
    if (mode === 'define') {
      updateAttribute(index, { ...attribute, mode, refId: null, subGrupo: { key: `sub_${Date.now()}`, nombre: '', definicion: [] } });
    } else {
      updateAttribute(index, { ...attribute, mode, refId: null, subGrupo: null });
    }
  }, [updateAttribute, pathPrefix, form.values]);

  const definicion = getDeep(form.values, `${pathPrefix}definicion`) || [];

  const fields = definicion.map((item, index) => {
    
    if (item.dataType === 'object') {
      //... (código para 'object' sin cambios)
      return (
        <Paper key={item.key} withBorder p="md" mt="sm" shadow="xs" bg={paperColor}>
            <Group justify="space-between">
              <Text fw={700} c="cyan">Atributo de Objeto: {item.label || ''}</Text>
              <ActionIcon color="red" onClick={() => removeAttribute(index)}><IconTrash size={16} /></ActionIcon>
            </Group>
            <SimpleGrid cols={2} mt="xs">
              <TextInput label="Label del Objeto" placeholder="Ej: Aceite" required value={item.label} onChange={(e) => updateAttribute(index, { ...item, label: e.currentTarget.value })}/>
              <TextInput label="ID del Objeto (en JSON)" placeholder="Ej: aceite" required value={item.id} onChange={(e) => updateAttribute(index, { ...item, id: e.currentTarget.value })}/>
            </SimpleGrid>
            <AtributoConstructor form={form} pathPrefix={`${pathPrefix}definicion.${index}.`} availableGroups={availableGroups} level={level + 1} />
        </Paper>
      );
    }
    
    if (item.dataType === 'grupo') {
      //... (código para 'grupo' sin cambios)
      return (
        <Paper key={item.key} withBorder p="md" mt="sm" shadow="xs" bg={paperColor}>
            <Group justify="space-between">
                <Text fw={700} c="blue">Atributo de Grupo: {item.label || ''}</Text>
                 <ActionIcon color="red" onClick={() => removeAttribute(index)}><IconTrash size={16} /></ActionIcon>
            </Group>
             <SimpleGrid cols={2} mt="xs">
                <TextInput label="Label del Campo" placeholder="Ej: Motor" required value={item.label} onChange={(e) => updateAttribute(index, { ...item, label: e.currentTarget.value })}/>
                <TextInput label="ID del Atributo (en JSON)" placeholder="Ej: motor" required value={item.id} onChange={(e) => updateAttribute(index, { ...item, id: e.currentTarget.value })}/>
            </SimpleGrid>
            <SegmentedControl fullWidth mt="md" value={item.mode || 'none'} onChange={(v) => handleModeChange(index, v)} data={[{ label: 'Seleccionar Existente', value: 'select' },{ label: 'Definir Nuevo Grupo', value: 'define' }]}/>
            <Collapse in={item.mode === 'select'}>
              <Select label="Seleccionar un grupo existente" placeholder="Elija un grupo" data={availableGroups.map(g => ({ value: g.id.toString(), label: g.nombre }))} value={item.refId} onChange={(v) => updateAttribute(index, { ...item, refId: v })} mt="xs"/>
            </Collapse>
            <Collapse in={item.mode === 'define'}>
              <Paper withBorder p="md" mt="md" bg={theme.colors.gray[Math.min(level + 1, 9)]}>
                  <TextInput label="Nombre del Nuevo Sub-Grupo" placeholder="Ej: MOTOR_VEHICULO" required value={item.subGrupo?.nombre || ''} onChange={(e) => updateAttribute(index, { ...item, subGrupo: { ...item.subGrupo, nombre: e.currentTarget.value } })}/>
                  <AtributoConstructor form={form} pathPrefix={`${pathPrefix}definicion.${index}.subGrupo.`} availableGroups={availableGroups} level={level + 1}/>
              </Paper>
            </Collapse>
        </Paper>
      );
    }
    
    // Usamos el componente memoizado para los atributos simples
    return <MemoizedAtributoField key={item.key} attribute={item} path={`${pathPrefix}definicion.${index}`} onRemove={() => removeAttribute(index)} onUpdate={updateAttribute} level={level} />;
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
});