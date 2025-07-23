'use client';

import React from 'react';
import { TextInput, Button, Group, ActionIcon, Box, Text } from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';

// Componente recursivo para renderizar cada nivel del JSON
function JsonProperty({ data, onDataChange, path }) {
  const handleAddProperty = () => {
    // Genera una clave única temporal para el nuevo campo
    const newKey = `nuevaPropiedad_${Date.now()}`;
    const updatedData = { ...data, [newKey]: '' };
    onDataChange(path, updatedData);
  };

  const handleAddNestedObject = () => {
    const newKey = `nuevoObjeto_${Date.now()}`;
    const updatedData = { ...data, [newKey]: {} };
    onDataChange(path, updatedData);
  };

  const handleKeyChange = (oldKey, newKey) => {
    // Evita cambios si la clave es la misma, está vacía o ya existe
    if (oldKey === newKey || !newKey || Object.keys(data).includes(newKey)) {
        return;
    }
    const { [oldKey]: value, ...rest } = data;
    const updatedData = { ...rest, [newKey]: value };
    onDataChange(path, updatedData);
  };

  const handleValueChange = (key, value) => {
    const updatedData = { ...data, [key]: value };
    onDataChange(path, updatedData);
  };

  const handleDeleteProperty = (key) => {
    const { [key]: _, ...rest } = data;
    onDataChange(path, rest);
  };

  return (
    <Box pl="md" mt="sm" style={{ borderLeft: '2px solid #e0e0e0' }}>
      {Object.entries(data).map(([key, value]) => (
        <Box key={key} mb="md">
          <Group>
            <TextInput
              placeholder="Nombre de la propiedad"
              defaultValue={key.startsWith('nuevaPropiedad_') ? '' : key}
              onBlur={(e) => handleKeyChange(key, e.currentTarget.value)}
              style={{ flex: 1 }}
            />
            {typeof value === 'object' && value !== null ? (
              <Text size="sm" c="dimmed">(Objeto anidado)</Text>
            ) : (
              <TextInput
                placeholder="Valor de la propiedad"
                value={value}
                onChange={(e) => handleValueChange(key, e.currentTarget.value)}
                style={{ flex: 1 }}
              />
            )}
            <ActionIcon color="red" onClick={() => handleDeleteProperty(key)} title={`Eliminar ${key}`}>
              <IconTrash size={16} />
            </ActionIcon>
          </Group>
          {typeof value === 'object' && value !== null && (
            <JsonProperty
              data={value}
              onDataChange={onDataChange}
              path={path ? `${path}.${key}` : key}
            />
          )}
        </Box>
      ))}
      <Group mt="md">
        <Button size="xs" variant="light" onClick={handleAddProperty} leftSection={<IconPlus size={14} />}>
          Añadir Propiedad
        </Button>
        <Button size="xs" variant="light" onClick={handleAddNestedObject} leftSection={<IconPlus size={14} />}>
          Añadir Objeto Anidado
        </Button>
      </Group>
    </Box>
  );
}

// Componente principal del formulario dinámico
export function DynamicJsonForm({ value, onChange }) {
  const setNestedValue = (path, newValue) => {
    const keys = path.split('.');
    const newSpec = JSON.parse(JSON.stringify(value)); // Deep copy

    let current = newSpec;
    for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
    }
    // Reemplaza el objeto en el último nivel
    const finalKey = keys[keys.length - 1];
    const { [finalKey]: _, ...rest } = current;
    current = Object.assign(current, newValue);
    // Elimina la clave antigua si cambia
    if( !newValue.hasOwnProperty(finalKey) ){
        delete current[finalKey];
    }

    onChange(newSpec);
};
  
  const handleRootDataChange = (path, updatedData) => {
      if (!path) {
          onChange(updatedData); // Es el objeto raíz
      } else {
          // Esto es complejo, una forma simple es reconstruir
          const keys = path.split('.');
          const newState = JSON.parse(JSON.stringify(value));
          let obj = newState;
          for (let i = 0; i < keys.length -1; i++) {
              obj = obj[keys[i]];
          }
          obj[keys[keys.length -1]] = updatedData;
          onChange(newState);
      }
  };

  return (
    <Box>
      <Text fw={500} mb="sm">Estructura de Especificaciones (JSON)</Text>
      <JsonProperty
        data={value}
        onDataChange={handleRootDataChange}
        path=""
      />
    </Box>
  );
}