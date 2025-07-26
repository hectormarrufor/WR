'use client';

import { useState, useEffect } from 'react';
import { TextInput, Select, Checkbox, Paper, Title, Button, Group, ActionIcon, Tooltip } from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import styles from './FormularioInstancia.module.css';

// Componente recursivo que renderiza cada campo y su entrada de valor
function CampoInstancia({
  attr, // El "plano" del campo
  value, // El valor actual del campo
  onDataChange, // Función para actualizar el valor
  onSchemaChange, // Función para añadir/quitar campos en este nivel
  allGrupos
}) {
  
  if (attr.type === 'object' || attr.type === 'relation') {
    const subSchema = (attr.type === 'relation')
      ? allGrupos.find(g => g.nombre === attr.relatedGrupo)?.definicion_formulario?.atributos_especificos || []
      : attr.schema || [];
      
    return (
      <Paper withBorder p="md" mt="md" radius="sm" className={styles.objectContainer}>
        <Title order={5} mb="sm">{attr.label}</Title>
        <FormularioInstancia
          schema={subSchema}
          data={value || {}}
          onDataChange={onDataChange}
          // onSchemaChange={onSchemaChange} // Deshabilitamos cambiar la ESTRUCTURA de los hijos heredados
          allGrupos={allGrupos}
        />
      </Paper>
    );
  }

  // Renderizado para campos primitivos
  switch(attr.primitiveType) {
    case 'boolean':
      return <Checkbox mt="md" label={attr.label} checked={!!value} onChange={(e) => onDataChange(e.currentTarget.checked)} />;
    case 'select':
      return <Select mt="md" label={attr.label} data={attr.options || []} value={value || ''} onChange={onDataChange} />;
    default:
      return <TextInput mt="md" label={attr.label} type={attr.primitiveType || 'text'} value={value || ''} onChange={(e) => onDataChange(e.currentTarget.value)} />;
  }
}


// Componente principal que maneja la lógica
export default function FormularioInstancia({ schema, data, onDataChange, onSchemaChange, allGrupos }) {

  const handleAddProperty = () => {
    // Esta función permite añadir nuevas propiedades a la instancia
    const newPropName = `prop_personalizada_${(schema || []).length + 1}`;
    const newSchema = [...(schema || []), {
        name: newPropName,
        label: 'Nueva Propiedad',
        type: 'primitive',
        primitiveType: 'text',
        isInstanceSpecific: true // Marcador para saber que esta no es heredada
    }];
    onSchemaChange(newSchema);
  };

  if (!schema) return null;

  return (
    <div className={styles.container}>
      {schema.map((attr, index) => (
        <CampoInstancia
          key={attr.name}
          attr={attr}
          value={data?.[attr.name]}
          onDataChange={(newValue) => {
            const newData = { ...data, [attr.name]: newValue };
            onDataChange(newData);
          }}
          onSchemaChange={(newSubSchema) => {
             // Lógica para actualizar el schema si se añaden campos a un sub-grupo
             const newSchema = [...schema];
             newSchema[index].schema = newSubSchema;
             onSchemaChange(newSchema);
          }}
          allGrupos={allGrupos}
        />
      ))}
      <Group mt="md">
        <Button size="xs" variant="light" leftSection={<IconPlus size={14} />} onClick={handleAddProperty}>
          Añadir Propiedad Específica
        </Button>
      </Group>
    </div>
  );
}