'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TextInput, Select, Button, Paper, Title, SimpleGrid, Group, Alert, Loader, Checkbox } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';

// Función Helper para fusionar y de-duplicar las definiciones de formulario
const mergeFormDefinitions = (grupos) => {
  const mergedDefinition = { atributos_especificos: [] };
  const seenNames = new Set();

  grupos.forEach(grupo => {
    const def = grupo.definicion_formulario;
    if (def?.atributos_especificos) {
      def.atributos_especificos.forEach(attr => {
        if (!seenNames.has(attr.name)) {
          mergedDefinition.atributos_especificos.push(attr);
          seenNames.add(attr.name);
        }
      });
    }
  });
  return mergedDefinition;
};


export default function FormularioCrearActivo() {
  const router = useRouter();

  const [categorias, setCategorias] = useState([]);
  const [selectedCategoria, setSelectedCategoria] = useState(null);
  const [mergedFormSchema, setMergedFormSchema] = useState({ atributos_especificos: [] });
  
  const [coreData, setCoreData] = useState({ nombre: '', codigo: '' });
  const [dynamicData, setDynamicData] = useState({});

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Carga inicial de las categorías con sus grupos asociados
    const fetchCategorias = async () => {
      // Necesitarás un endpoint que devuelva las categorías y sus grupos anidados
      const res = await fetch('/api/gestionMantenimiento/categorias-con-grupos'); 
      const data = await res.json();
      setCategorias(data.map(c => ({ value: c.id.toString(), label: c.nombre, ...c })));
    };
    fetchCategorias();
  }, []);

  const handleCategoriaChange = (value) => {
    const categoria = categorias.find(c => c.value === value);
    setSelectedCategoria(categoria);
    setDynamicData({});
    
    if (categoria && categoria.grupos) {
      const merged = mergeFormDefinitions(categoria.grupos);
      setMergedFormSchema(merged);
    } else {
      setMergedFormSchema({ atributos_especificos: [] });
    }
  };
  
  const handleDynamicDataChange = (name, value, type) => {
    setDynamicData(prev => ({ ...prev, [name]: type === 'boolean' ? value : value }));
  };

  const renderDynamicFields = () => {
    return mergedFormSchema.atributos_especificos.map(attr => {
      if (attr.type === 'boolean') {
        return <Checkbox key={attr.name} label={attr.label} onChange={(e) => handleDynamicDataChange(attr.name, e.currentTarget.checked, 'boolean')} />;
      }
      return (
        <TextInput
          key={attr.name}
          label={attr.label}
          name={attr.name}
          type={attr.type || 'text'}
          onChange={(e) => handleDynamicDataChange(attr.name, e.currentTarget.value, attr.type)}
        />
      );
    });
  };

  const handleSubmit = async (e) => {
    // Lógica de envío similar a la anterior, usando el endpoint /activos-compuestos
  };

  return (
    <Paper withBorder shadow="md" p="xl" radius="md">
      <Title order={2} mb="xl">Registrar Activo</Title>
      <form onSubmit={handleSubmit}>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
          <Select
            label="Categoría del Activo"
            placeholder="Seleccione una categoría"
            data={categorias}
            onChange={handleCategoriaChange}
            searchable
            required
          />
          <div></div> {/* Espaciador */}
          <TextInput label="Nombre del Activo" name="nombre" onChange={(e) => setCoreData(prev => ({ ...prev, nombre: e.target.value }))} required />
          <TextInput label="Código / Identificador" name="codigo" onChange={(e) => setCoreData(prev => ({ ...prev, codigo: e.target.value }))} required />
        </SimpleGrid>

        {selectedCategoria && (
          <>
            <Title order={4} mt="xl" mb="md">Propiedades de "{selectedCategoria.label}"</Title>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
              {renderDynamicFields()}
            </SimpleGrid>
          </>
        )}

        <Group justify="flex-end" mt="xl">
          <Button variant="default" onClick={() => router.back()}>Cancelar</Button>
          <Button type="submit" loading={loading}>Crear Activo</Button>
        </Group>
      </form>
    </Paper>
  );
}