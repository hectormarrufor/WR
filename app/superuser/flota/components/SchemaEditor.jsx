'use client';

import { TextInput, Select, Checkbox, Paper, Title, ActionIcon, Group, Tooltip, Button, Text } from '@mantine/core';
import { IconTrash, IconPlus } from '@tabler/icons-react';
import styles from './SchemaEditor.module.css'; // Usaremos un CSS module dedicado

// Componente recursivo interno
function SchemaField({
  schema,
  data,
  path = '',
  onSchemaChange,
  onDataChange
}) {
  const handleSchemaUpdate = (index, field, value) => {
    const newSchema = [...schema];
    newSchema[index] = { ...newSchema[index], [field]: value };
    onSchemaChange(newSchema);
  };

  const handleDataUpdate = (name, value) => {
    onDataChange({ ...data, [name]: value });
  };
  
  const handleAddProperty = () => {
    onSchemaChange([...schema, { name: `nuevaPropiedad${schema.length + 1}`, label: 'Nueva Propiedad', type: 'primitive', primitiveType: 'text' }]);
  };

  const handleRemoveProperty = (indexToRemove) => {
    const newSchema = schema.filter((_, index) => index !== indexToRemove);
    const propertyNameToRemove = schema[indexToRemove].name;
    const { [propertyNameToRemove]: removed, ...restData } = data;
    onSchemaChange(newSchema);
    onDataChange(restData);
  };

  return (
    <>
      {schema.map((attr, index) => {
        const currentPath = path ? `${path}.${attr.name}` : attr.name;
        
        if (attr.type === 'object') {
          return (
            <Paper key={currentPath} withBorder p="md" mt="md" radius="sm" className={styles.objectContainer}>
              <Group justify="space-between">
                <TextInput
                  placeholder="ID del Sub-grupo"
                  value={attr.name}
                  onChange={(e) => handleSchemaUpdate(index, 'name', e.target.value)}
                  className={styles.idInput}
                />
                 <TextInput
                  placeholder="Título del Sub-grupo"
                  value={attr.label}
                  onChange={(e) => handleSchemaUpdate(index, 'label', e.target.value)}
                  className={styles.titleInput}
                />
                 <ActionIcon color="red" onClick={() => handleRemoveProperty(index)}><IconTrash size={16} /></ActionIcon>
              </Group>
              <SchemaField
                schema={attr.schema || []}
                data={data[attr.name] || {}}
                path={currentPath}
                onSchemaChange={(newSubSchema) => handleSchemaUpdate(index, 'schema', newSubSchema)}
                onDataChange={(newSubData) => handleDataUpdate(attr.name, newSubData)}
              />
            </Paper>
          );
        }

        // Renderizado para campos primitivos
        return (
            <Paper key={currentPath} withBorder p="sm" mt="xs" radius="sm" className={styles.itemContainer}>
                <Group grow>
                    <TextInput placeholder="Etiqueta" value={attr.label} onChange={(e) => handleSchemaUpdate(index, 'label', e.target.value)} />
                    
                    {/* --- CAMPO PARA EL VALOR PREDETERMINADO --- */}
                    {attr.primitiveType === 'boolean' ? (
                        <Checkbox checked={!!data[attr.name]} onChange={(e) => handleDataUpdate(attr.name, e.currentTarget.checked)} label="Valor por defecto" />
                    ) : (
                        <TextInput
                            placeholder="Valor por defecto"
                            value={data[attr.name] || ''}
                            onChange={(e) => handleDataUpdate(attr.name, e.target.value)}
                        />
                    )}

                    <ActionIcon color="red" onClick={() => handleRemoveProperty(index)}><IconTrash size={16} /></ActionIcon>
                </Group>
            </Paper>
        );
      })}
      <Group justify="center" mt="md">
        <Button size="xs" variant="light" leftSection={<IconPlus size={14}/>} onClick={handleAddProperty}>
            Añadir Propiedad
        </Button>
      </Group>
    </>
  );
}

// Componente principal que envuelve la lógica
export default function SchemaEditor({ schema, data, onSchemaChange, onDataChange }) {
  if (!schema) return null;

  return (
    <div className={styles.container}>
      <SchemaField
        schema={schema}
        data={data}
        onSchemaChange={onSchemaChange}
        onDataChange={onDataChange}
      />
    </div>
  );
}