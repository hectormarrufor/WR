'use client';

import { useState, useEffect, useCallback } from 'react';
import { TextInput, Select, Checkbox, Paper, Title } from '@mantine/core';
import styles from './RenderDynamicForm.module.css';

// --- Componente Recursivo Interno ---
// Se mantiene simple, solo renderiza los campos y llama a la función de actualización
// con su "ruta" o "path" (ej: 'info_motor.hp').
function RenderField({ attr, path, allData, onUpdate, readOnly }) {
  const { name, label, type, primitiveType, options, schema } = attr;
  const currentPath = path ? `${path}.${name}` : name;
  
  // Función para obtener el valor actual del estado
  const getValue = (p, data) => p.split('.').reduce((acc, part) => acc && acc[part], data);

  if (type === 'object') {
    return (
      <Paper withBorder p="md" mt="md" radius="sm" className={styles.objectContainer}>
        <Title order={5} mb="sm">{label}</Title>
        {(schema || []).map(subAttr => (
          <RenderField 
            key={subAttr.name}
            attr={subAttr}
            path={currentPath}
            allData={allData}
            onUpdate={onUpdate}
            readOnly={readOnly}
          />
        ))}
      </Paper>
    );
  }

  if (type === 'relation') {
      return (
        <Select 
            label={label} 
            mt="md" 
            placeholder={`Seleccionar ${label}`} 
            data={[] /* Lógica para cargar opciones de relación */} 
            value={getValue(currentPath, allData) || ''}
            onChange={(value) => onUpdate(currentPath, value)} 
            readOnly={readOnly}
        />
      );
  }
  
  switch(primitiveType) {
      case 'boolean':
          return (
            <Checkbox 
                label={label} 
                mt="md" 
                checked={!!getValue(currentPath, allData)}
                onChange={(e) => onUpdate(currentPath, e.currentTarget.checked)} 
                readOnly={readOnly}
            />
          );
      case 'select':
          return (
            <Select 
                label={label} 
                mt="md" 
                data={options || []} 
                value={getValue(currentPath, allData) || ''}
                onChange={(value) => onUpdate(currentPath, value)} 
                readOnly={readOnly}
            />
          );
      default:
          return (
            <TextInput 
                label={label} 
                type={primitiveType || 'text'} 
                mt="md" 
                value={getValue(currentPath, allData) || ''}
                onChange={(e) => onUpdate(currentPath, e.target.value)} 
                readOnly={readOnly}
            />
          );
  }
}


// --- Componente Principal (El que se exporta) ---
export default function RenderDynamicForm({ schema, onUpdate, initialData = {}, readOnly = false }) {
  const [dynamicData, setDynamicData] = useState(initialData);

  useEffect(() => {
    setDynamicData(initialData);
  }, [initialData]);

  // *** LA CORRECCIÓN CLAVE ESTÁ AQUÍ ***
  // Usamos `useCallback` para que esta función no se recree en cada render,
  // rompiendo así el bucle infinito.
  // La función ahora es lo suficientemente inteligente como para actualizar valores anidados.
  const handleUpdate = useCallback((path, value) => {
    setDynamicData(currentData => {
      const pathParts = path.split('.');
      const newData = JSON.parse(JSON.stringify(currentData)); // Copia profunda para evitar mutaciones
      let currentLevel = newData;

      for (let i = 0; i < pathParts.length - 1; i++) {
        const part = pathParts[i];
        if (!currentLevel[part]) {
          currentLevel[part] = {};
        }
        currentLevel = currentLevel[part];
      }

      currentLevel[pathParts[pathParts.length - 1]] = value;
      
      // Notificamos al componente padre del estado actualizado
      onUpdate(newData);
      
      return newData;
    });
  }, [onUpdate]);

  if (!schema || schema.length === 0) return null;

  return (
    <div className={styles.container}>
        <Title order={4}>Propiedades Específicas</Title>
        {schema.map(attr => (
            <RenderField 
                key={attr.name} 
                attr={attr}
                path="" // El nivel raíz no tiene path
                allData={dynamicData}
                onUpdate={handleUpdate} 
                readOnly={readOnly}
            />
        ))}
    </div>
  );
}