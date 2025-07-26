'use client';

import { TextInput, Select, Checkbox, Paper, Title, ActionIcon, Group, Tooltip, Button, Text, Switch, Stack, MultiSelect, TagsInput } from '@mantine/core';
import { IconTrash, IconPlus, IconLink } from '@tabler/icons-react';
import styles from './AtributoConstructor.module.css';

// --- Componente para una sola propiedad (no anidada) ---
function AtributoItem({
  attr, value, onSchemaChange, onDataChange, onRemove, onAddNested, gruposDisponibles, isInherited
}) {
  const handleSchemaUpdate = (field, val) => onSchemaChange({ ...attr, [field]: val });
  const handleDataUpdate = (val) => onDataChange(val);
  const isValueDisabled = isInherited && value !== undefined;

  // Si es un objeto, la lógica se maneja en la lista padre
  if (attr.type === 'object') {
    return (
      <AtributoList
        level={1}
        atributos={attr.schema || []}
        data={value || {}}
        onSchemaChange={(newSchema) => handleSchemaUpdate('schema', newSchema)}
        onDataChange={handleDataUpdate}
        parentHeader={{
          label: attr.label, name: attr.name,
          onUpdate: (headerData) => onSchemaChange({ ...attr, ...headerData }),
          onRemove: onRemove
        }}
        gruposDisponibles={gruposDisponibles}
        isInherited={isInherited}
      />
    );
  }

  return (
    <div className={styles.itemWrapper}>
      <Group justify="space-between" wrap="nowrap" align="flex-start">
        <TextInput
          placeholder="Etiqueta para el usuario (ej: Serial de Carrocería)"
          value={attr.label}
          onChange={(e) => handleSchemaUpdate('label', e.currentTarget.value)}
          style={{ flex: 1 }}
        />
        <Group gap="xs" justify="flex-end" className={styles.actionsGroup}>
          <Tooltip label="Convertir en Sub-grupo"><ActionIcon color="blue" variant="light" onClick={onAddNested}><IconPlus size={16} /></ActionIcon></Tooltip>
          <Tooltip label="Eliminar Propiedad"><ActionIcon color="red" variant="light" onClick={onRemove}><IconTrash size={16} /></ActionIcon></Tooltip>
        </Group>
      </Group>

      <div className={styles.detailsContainer}>
        {/* Columna de Valor */}
        <div className={styles.valueContainer}>
          {attr.primitiveType === 'boolean' ? <Checkbox mt="xs" label="Valor" checked={!!value} onChange={(e) => handleDataUpdate(e.currentTarget.checked)} disabled={isValueDisabled} />
          : attr.primitiveType === 'select' ? <Select data={attr.options || []} value={value || ''} onChange={handleDataUpdate} searchable disabled={isValueDisabled} />
          : attr.primitiveType === 'multiselect' ? <MultiSelect data={attr.options || []} value={value || []} onChange={handleDataUpdate} searchable disabled={isValueDisabled} />
          : <TextInput value={value || ''} onChange={(e) => handleDataUpdate(e.target.value)} disabled={isValueDisabled} placeholder="Valor (opcional)" />}
        </div>
        
        {/* Columna de Estructura */}
        {!isInherited && (
          <div className={styles.structureColumn}>
            <TextInput size="xs" placeholder="ID único (ej: serial_carroceria)" value={attr.name} onChange={(e) => handleSchemaUpdate('name', e.currentTarget.value)} />
            <Select size="xs" data={['text', 'number', 'date', 'boolean', 'select', 'multiselect']} value={attr.primitiveType || 'text'} onChange={(value) => handleSchemaUpdate('primitiveType', value)} />
            {(attr.primitiveType === 'select' || attr.primitiveType === 'multiselect') && (
              <TagsInput size="xs" placeholder="Opciones (Enter)" value={attr.options || []} onChange={(options) => handleSchemaUpdate('options', options)} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Componente de Lista y Recursión ---
function AtributoList({
  atributos, data, onSchemaChange, onDataChange, level, parentHeader, gruposDisponibles, isInherited
}) {
    const handleAddProperty = () => {
        const newSchema = [...(atributos || []), { name: `propiedad${(atributos || []).length}`, label: 'Nueva Propiedad', type: 'primitive', primitiveType: 'text', isNew: true }];
        onSchemaChange(newSchema);
    };
    const handleUpdateItemSchema = (index, newAttr) => {
        const newSchema = [...atributos]; newSchema[index] = newAttr;
        onSchemaChange(newSchema);
    };
    const handleUpdateItemData = (index, newValue) => {
        const propertyName = atributos[index].name;
        const newData = { ...data, [propertyName]: newValue };
        onDataChange(newData);
    };
    const handleRemoveItem = (index) => {
        const propertyNameToRemove = atributos[index].name;
        const newSchema = atributos.filter((_, i) => i !== index);
        const { [propertyNameToRemove]: removed, ...restData } = (data || {});
        onSchemaChange(newSchema);
        onDataChange(restData);
    };
    const handleAddNested = (index) => {
        const newSchema = [...atributos];
        const target = newSchema[index];
        target.type = 'object';
        if (!target.schema) target.schema = [];
        target.schema.push({ name: 'nuevaSubPropiedad', label: 'Nueva Sub-propiedad', type: 'primitive', primitiveType: 'text', isNew: true });
        onSchemaChange(newSchema);
    };
    const levelClass = styles[`level${level}`] || styles.levelDefault;
    return (
        <Paper withBorder p="md" mt="md" radius="md" shadow="xs" className={`${styles.listContainer} ${levelClass}`}>
            {parentHeader && (
                <div className={styles.parentHeaderContainer}>
                    <Stack align="center" gap={0} style={{ flex: 1 }}>
                        <TextInput variant="unstyled" placeholder={parentHeader.isMain ? "Nombre del Grupo" : "Título del Sub-grupo"} value={parentHeader.label} onChange={parentHeader.onLabelChange} classNames={{ input: parentHeader.isMain ? styles.mainTitleInput : styles.titleInput }} />
                        {!parentHeader.isMain && <TextInput variant="unstyled" placeholder="ID del Sub-grupo" value={parentHeader.name} onChange={parentHeader.onNameChange} classNames={{ input: styles.idInput }} />}
                        {parentHeader.isMain && <Text size="sm" c="dimmed">Define la plantilla base para este tipo de activo</Text>}
                    </Stack>
                    {level > 0 && (<Tooltip label="Eliminar Grupo Completo"><ActionIcon color="red" variant="filled" onClick={parentHeader.onRemove} className={styles.headerDeleteButton}><IconTrash size={16} /></ActionIcon></Tooltip>)}
                </div>
            )}
            
            {(atributos || []).map((attr, index) => {
                if (attr.type === 'object') {
                    return (
                        <AtributoList
                            key={index}
                            atributos={attr.schema || []}
                            data={data?.[attr.name] || {}}
                            onSchemaChange={(newSchema) => handleUpdateItemSchema(index, { ...attr, schema: newSchema })}
                            onDataChange={(newData) => handleUpdateItemData(index, newData)}
                            level={level + 1}
                            parentHeader={{
                                label: attr.label, name: attr.name,
                                onLabelChange: (e) => handleUpdateItemSchema(index, { ...attr, label: e.target.value }),
                                onNameChange: (e) => handleUpdateItemSchema(index, { ...attr, name: e.target.value }),
                                onRemove: () => handleRemoveItem(index),
                            }}
                            gruposDisponibles={gruposDisponibles}
                            isInherited={isInherited || attr.isInherited}
                        />
                    );
                }
                return (
                    <AtributoItem
                        key={index}
                        attr={attr}
                        value={data?.[attr.name]}
                        onSchemaChange={(newAttr) => handleUpdateItemSchema(index, newAttr)}
                        onDataChange={(newValue) => handleUpdateItemData(index, newValue)}
                        onRemove={() => handleRemoveItem(index)}
                        onAddNested={() => handleAddNested(index)}
                        gruposDisponibles={gruposDisponibles}
                        isInherited={isInherited || attr.isInherited}
                    />
                );
            })}
            <Group mt="md" justify="center">
                <Button size="xs" variant="light" leftSection={<IconPlus size={14} />} onClick={handleAddProperty}>Añadir Propiedad</Button>
            </Group>
        </Paper>
    );
}

// --- Componente Principal (Wrapper) ---
export default function AtributoConstructor({ value, onUpdate, gruposDisponibles, isInherited = false }) {
    const { definicion_formulario, valores_predeterminados, nombre } = value || {};

    const handleSchemaChange = (newSchema) => onUpdate({ ...value, definicion_formulario: { atributos_especificos: newSchema } });
    const handleDataChange = (newData) => onUpdate({ ...value, valores_predeterminados: newData });

    return (
        <div className={styles.constructorWrapper}>
            <AtributoList
                atributos={definicion_formulario?.atributos_especificos || []}
                data={valores_predeterminados || {}}
                onSchemaChange={handleSchemaChange}
                onDataChange={handleDataChange}
                level={0}
                parentHeader={{
                    label: nombre,
                    isMain: true,
                    onLabelChange: (e) => onUpdate({ ...value, nombre: e.target.value }),
                }}
                gruposDisponibles={gruposDisponibles}
                isInherited={isInherited}
            />
        </div>
    );
}