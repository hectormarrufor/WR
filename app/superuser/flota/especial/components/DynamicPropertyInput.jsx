// app/superuser/flota/especial/components/DynamicPropertyInput.jsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  TextInput, NumberInput, Select, Checkbox, Textarea, Button, Group, Box, Title, ActionIcon, Flex, Text
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { IconPlus, IconMinus, IconTrash, IconArrowsShuffle } from '@tabler/icons-react'; // Icono para convertir
import { notifications } from '@mantine/notifications';

const formatPathToLabel = (path) => {
  const parts = path.split('.');
  return parts[parts.length - 1]
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase());
};

export function DynamicPropertyInput({
  form,
  path,
  featureOptions,
  onRemove,
  parentFeatureType,
  initialPropertyName
}) {
  const [currentFeature, setCurrentFeature] = useState(null); // La definición de la feature seleccionada (del modelo FeatureEquipoEspecial)
  const [propertyKey, setPropertyKey] = useState(initialPropertyName || ''); // El nombre de la clave de esta propiedad
  const [localValueType, setLocalValueType] = useState('string'); // Tipo de valor para propiedades personalizadas o flexibles

  const currentValue = form.getValues(path); 

  // Debug: Log al inicio de cada render
  useEffect(() => {
    // console.log(`[DynamicPropertyInput - ${path}] --- RENDER ---`);
    // console.log(`[DynamicPropertyInput - ${path}] propertyKey:`, propertyKey);
    // console.log(`[DynamicPropertyInput - ${path}] currentValue:`, currentValue);
    // console.log(`[DynamicPropertyInput - ${path}] currentFeature:`, currentFeature ? currentFeature.nombre : 'null');
    // console.log(`[DynamicPropertyInput - ${path}] localValueType:`, localValueType);
  });


  const getAvailableFeatures = useCallback(() => {
    if (!parentFeatureType) {
      return featureOptions.filter(f => f.parentFeatureId === null);
    }
    const parentFeatureDef = featureOptions.find(fOpt => fOpt.nombre === parentFeatureType);
    if (parentFeatureDef) {
      return featureOptions.filter(f => f.parentFeatureId === parentFeatureDef.id);
    }
    return [];
  }, [featureOptions, parentFeatureType]);

  const initializeValueBasedOnType = useCallback((type, valueToInitialize) => {
    const actualValue = valueToInitialize !== undefined ? valueToInitialize : form.getValues(path);

    if (actualValue === undefined || actualValue === null) {
      let defaultValue = null;
      switch (type) {
        case 'string':
          defaultValue = '';
          break;
        case 'integer':
        case 'float':
          defaultValue = 0;
          break;
        case 'boolean':
          defaultValue = false;
          break;
        case 'date':
          defaultValue = null;
          break;
        case 'jsonb_object':
          defaultValue = {};
          break;
        case 'jsonb_array':
        case 'array_string':
          defaultValue = [];
          break;
        default:
          defaultValue = '';
      }
      form.setFieldValue(path, defaultValue);
    }
  }, [form, path]);

  // Efecto para cargar la definición de la feature o marcar como nueva
  useEffect(() => {
    if (propertyKey) {
        const feature = featureOptions.find(f => f.nombre === propertyKey);
        if (feature) {
            setCurrentFeature(feature);
            setLocalValueType(feature.tipoValorEsperado); // Usar el tipo de la feature predefinida
            initializeValueBasedOnType(feature.tipoValorEsperado, currentValue);
        } else {
            // Si la clave es personalizada, la tratamos como tal.
            // El tipo ya viene de localValueType (seleccionado por el usuario o por defecto 'string')
            setCurrentFeature({ nombre: propertyKey, tipoValorEsperado: localValueType, descripcion: 'Propiedad personalizada' });
            initializeValueBasedOnType(localValueType, currentValue);
        }
    } else {
        // Cuando no hay propertyKey (recién añadida, sin nombre), resetear feature y tipo local
        setCurrentFeature(null);
        setLocalValueType('string'); // Por defecto 'string' para el Select inicial de tipo
    }
  }, [propertyKey, featureOptions, initializeValueBasedOnType, currentValue, localValueType]);


  const handleFeatureSelect = (selectedName) => {
    setPropertyKey(selectedName);
    const selectedFeature = featureOptions.find(f => f.nombre === selectedName);
    setCurrentFeature(selectedFeature);
    setLocalValueType(selectedFeature.tipoValorEsperado); // Actualizar el tipo local
    form.setFieldValue(path, null); // Limpiar con null
    initializeValueBasedOnType(selectedFeature.tipoValorEsperado, null);
  };

  const handleCreateFeature = (query) => {
    const newCustomFeature = { nombre: query, tipoValorEsperado: localValueType, descripcion: `Propiedad personalizada: ${query}` };
    setPropertyKey(query);
    setCurrentFeature(newCustomFeature);
    form.setFieldValue(path, null);
    initializeValueBasedOnType(localValueType, null);
    return { value: query, label: query }; 
  };

  const handleAddSubProperty = () => {
    // Si la propiedad actual no es un objeto o array, convertirla a jsonb_object/jsonb_array
    if (currentFeature.tipoValorEsperado !== 'jsonb_object' && currentFeature.tipoValorEsperado !== 'jsonb_array') {
        // Confirmar la conversión de tipo con el usuario o hacerlo automáticamente
        notifications.show({
            title: 'Conversión de Tipo',
            message: `Esta propiedad se convertirá en un Objeto/Lista para añadir componentes.`,
            color: 'blue',
        });
        // Cambiar el tipo de currentFeature y el valor en el formulario
        const newType = 'jsonb_object'; // Por defecto a objeto al añadir un componente
        setLocalValueType(newType);
        setCurrentFeature({ ...currentFeature, tipoValorEsperado: newType });
        form.setFieldValue(path, {}); // Inicializar como objeto vacío
    }

    const currentContainerValue = form.getValues(path) || (currentFeature?.tipoValorEsperado === 'jsonb_array' ? [] : {});
    
    if (currentFeature?.tipoValorEsperado === 'jsonb_array') {
        const updatedArray = [...currentContainerValue, null];
        form.setFieldValue(path, updatedArray);
    } else if (currentFeature?.tipoValorEsperado === 'jsonb_object') {
        let newSubKey = `Componente${Object.keys(currentContainerValue).length + 1}`;
        let counter = 0;
        while (currentContainerValue.hasOwnProperty(newSubKey)) {
          counter++;
          newSubKey = `Componente${Object.keys(currentContainerValue).length + 1 + counter}`;
        }
        const updatedObject = { ...currentContainerValue, [newSubKey]: null };
        form.setFieldValue(path, updatedObject);
    }
  };

  const handleRemoveSubProperty = (subPropertyKey) => {
    const currentContainerValue = form.getValues(path);
    if (currentFeature.tipoValorEsperado === 'jsonb_object') {
        const updatedObject = { ...currentContainerValue };
        delete updatedObject[subPropertyKey];
        form.setFieldValue(path, updatedObject);
    } else if (currentFeature.tipoValorEsperado === 'jsonb_array') {
        const updatedArray = currentContainerValue.filter((_, idx) => idx !== subPropertyKey);
        form.setFieldValue(path, updatedArray);
    }
  };

  const renderValueInput = () => {
    // Si no hay propertyKey (nueva propiedad), mostrar solo el Select de nombre/clave
    // Si hay propertyKey pero no currentFeature (aún no se ha seleccionado/creado el tipo)
    // entonces mostramos el Select de tipo
    if (!propertyKey || !currentFeature) { // Si no hay clave, o no hay feature (esperando que el usuario defina tipo)
        // Este caso solo debería ocurrir si el usuario está definiendo una nueva propiedad personalizada
        // y debe elegir su tipo.
        return (
            <Select
                label="Tipo de Valor para Propiedad Personalizada"
                placeholder="Selecciona el tipo de valor"
                data={[
                    { value: 'string', label: 'Texto' },
                    { value: 'integer', label: 'Número Entero' },
                    { value: 'float', label: 'Número Decimal' },
                    { value: 'boolean', label: 'Verdadero/Falso' },
                    { value: 'date', label: 'Fecha' },
                    { value: 'jsonb_object', label: 'Sistema/Objeto Anidado' },
                    { value: 'jsonb_array', label: 'Lista de Componentes/Elementos' },
                    { value: 'array_string', label: 'Lista de Textos (separados por coma)' },
                ]}
                value={localValueType}
                onChange={(val) => {
                    setLocalValueType(val);
                    if (propertyKey) { // Si ya hay una clave escrita, actualizamos el currentFeature con el nuevo tipo
                        setCurrentFeature({ nombre: propertyKey, tipoValorEsperado: val, descripcion: 'Propiedad personalizada' });
                        initializeValueBasedOnType(val, null);
                    }
                }}
                required
                style={{ flexGrow: 1 }}
            />
        );
    }

    // Si ya hay una currentFeature y un tipo definido, renderizar el input de valor o el contenedor
    const inputPath = path;
    const inputProps = {
      label: currentFeature.descripcion || `Valor de ${currentFeature.nombre}`,
      placeholder: `Ingresa valor para ${currentFeature.nombre}`,
      required: currentFeature.esRequerido,
      ...form.getInputProps(inputPath),
    };

    switch (currentFeature.tipoValorEsperado) {
      case 'string':
        return <TextInput {...inputProps} />;
      case 'integer':
        return <NumberInput {...inputProps} step={1} precision={0} />;
      case 'float':
        return <NumberInput {...inputProps} step={0.01} precision={2} />;
      case 'boolean':
        return (
            <Checkbox 
                label={currentFeature.descripcion || currentFeature.nombre} 
                {...form.getInputProps(inputPath, { type: 'checkbox' })} 
                checked={form.getValues(inputPath)}
            />
        );
      case 'date':
        const dateValue = form.getValues(inputPath) ? new Date(form.getValues(inputPath)) : null;
        return (
            <DatePickerInput 
                {...inputProps} 
                value={dateValue}
                onChange={(val) => form.setFieldValue(inputPath, val ? val.toISOString().split('T')[0] : null)}
                valueFormat="DD/MM/YYYY" 
            />
        );
      case 'array_string':
        const arrayStringValue = Array.isArray(form.getValues(inputPath)) ? form.getValues(inputPath).join(', ') : '';
        return (
            <Textarea
                {...inputProps}
                placeholder="Ingresa valores separados por coma (ej: cert1, cert2)"
                value={arrayStringValue}
                onChange={(event) => form.setFieldValue(inputPath, event.currentTarget.value.split(',').map(s => s.trim()))}
            />
        );
      case 'jsonb_object':
      case 'jsonb_array':
        const isObject = currentFeature.tipoValorEsperado === 'jsonb_object';
        const currentChildren = form.getValues(inputPath) || (isObject ? {} : []);

        return (
          <Box p="md" style={{ border: '1px solid #eee', borderRadius: '4px', marginTop: '10px' }}>
            <Title order={6} mb="sm">{currentFeature.nombre} {isObject ? '(Sistema/Objeto)' : '(Lista de Componentes)'}</Title>
            
            {Object.entries(currentChildren).map(([subKey, subValue], idx) => {
              const displayKey = isObject ? subKey : idx;
              const subPath = `${inputPath}.${displayKey}`;

              return (
                <Box key={subPath} mt="sm" p="sm" style={{ borderLeft: '3px solid #ccc' }}>
                  <Group justify="space-between" align="center" mb="xs">
                    <Text fw={700} size="sm">{isObject ? subKey : `Componente ${idx + 1}`}</Text>
                    <ActionIcon color="red" size="sm" onClick={() => handleRemoveSubProperty(displayKey)}>
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                  {isObject && (
                    <TextInput 
                      label="Nombre de Componente/Subsistema"
                      value={subKey}
                      onChange={(event) => {
                        notifications.show({
                            title: 'Edición de Clave',
                            message: 'Para renombrar una clave de propiedad, elimínela y añádala de nuevo.',
                            color: 'orange'
                        });
                      }}
                      disabled
                      mb="xs"
                    />
                  )}
                  <DynamicPropertyInput
                    form={form}
                    path={subPath}
                    featureOptions={featureOptions}
                    parentFeatureType={currentFeature.nombre}
                    propertyName={isObject ? subKey : null}
                    onRemove={null}
                  />
                </Box>
              );
            })}
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={handleAddSubProperty}
              variant="outline"
              fullWidth
              mt="md"
            >
              Añadir {isObject ? 'Componente/Subsistema' : 'Elemento'} a {currentFeature.nombre}
            </Button>
          </Box>
        );
      default:
        return <TextInput {...inputProps} />;
    }
  };

  return (
    <Box>
      <Group grow align="flex-end" mb="md">
        {/* Select para elegir o crear la clave (Sistema/Propiedad) */}
        {/* Se muestra si no hay una clave definida (propiedad nueva) O si la clave es personalizada */}
        {(!propertyKey || (propertyKey && currentFeature && currentFeature.descripcion === 'Propiedad personalizada')) ? (
          <Select
            label="Selecciona/Escribe el Sistema/Propiedad"
            placeholder="Elige una propiedad predefinida o escribe una nueva"
            data={getAvailableFeatures().map(f => ({ value: f.nombre, label: f.nombre }))}
            value={propertyKey}
            onChange={handleFeatureSelect}
            searchable
            clearable={!currentFeature?.esRequerido}
            allowDeselect={false} 
            required
            creatable
            getCreateLabel={(query) => `+ Crear Sistema/Propiedad: ${query}`}
            onCreate={handleCreateFeature}
            style={{ flexGrow: 1 }}
          />
        ) : ( // Si ya hay una propiedad predefinida y no es nueva/personalizada
            <TextInput
              label={`Sistema/Propiedad: ${currentFeature?.nombre}`}
              value={currentFeature?.nombre}
              readOnly
              disabled
              style={{ flexGrow: 1 }}
            />
        )}

        {/* Selector de Tipo de Valor para Propiedad Personalizada o para Conversión */}
        {/* Se muestra si:
            1. La propiedad es nueva (no tiene propertyKey definido) y se le está dando un nombre
            2. La propiedad es personalizada (descripcion === 'Propiedad personalizada') y no es un jsonb/array
            3. La propiedad NO es un jsonb_object/jsonb_array y queremos añadirle sub-propiedades
         */}
        {propertyKey && currentFeature && 
         (currentFeature.descripcion === 'Propiedad personalizada' || 
          (currentFeature.tipoValorEsperado !== 'jsonb_object' && currentFeature.tipoValorEsperado !== 'jsonb_array')) && (
            <Select
                label="Tipo de Valor"
                placeholder="Selecciona el tipo de valor"
                data={[
                    { value: 'string', label: 'Texto' },
                    { value: 'integer', label: 'Número Entero' },
                    { value: 'float', label: 'Número Decimal' },
                    { value: 'boolean', label: 'Verdadero/Falso' },
                    { value: 'date', label: 'Fecha' },
                    { value: 'jsonb_object', label: 'Sistema/Objeto Anidado' },
                    { value: 'jsonb_array', label: 'Lista de Componentes/Elementos' },
                    { value: 'array_string', label: 'Lista de Textos (separados por coma)' },
                ]}
                value={localValueType}
                onChange={(val) => {
                    setLocalValueType(val);
                    setCurrentFeature({ ...currentFeature, tipoValorEsperado: val }); // Actualizar el tipo en currentFeature
                    form.setFieldValue(path, null); // Limpiar valor para inicializar al nuevo tipo
                    initializeValueBasedOnType(val, null);
                }}
                required
                style={{ flexGrow: 1 }}
            />
        )}

        {/* Input para el valor (renderizado condicionalmente) */}
        <Box style={{ flexGrow: 3 }}>
          {renderValueInput()}
        </Box>

        {/* Botón para añadir sub-propiedad (se muestra para objetos/arrays O para convertir) */}
        {currentFeature && (currentFeature.tipoValorEsperado === 'jsonb_object' || 
                           currentFeature.tipoValorEsperado === 'jsonb_array' ||
                           (currentFeature.tipoValorEsperado !== 'jsonb_object' && currentFeature.tipoValorEsperado !== 'jsonb_array' && propertyKey)) && (
            <ActionIcon color="blue" size="lg" onClick={handleAddSubProperty} mt="xl" title="Añadir Sub-propiedad / Convertir a Objeto">
                <IconPlus size={20} />
            </ActionIcon>
        )}

        {/* Botón para eliminar esta propiedad (nivel superior o sub-propiedad directa) */}
        {onRemove && (
          <ActionIcon color="red" size="lg" onClick={onRemove} mt="xl">
            <IconTrash size={20} />
          </ActionIcon>
        )}
      </Group>
    </Box>
  );
}