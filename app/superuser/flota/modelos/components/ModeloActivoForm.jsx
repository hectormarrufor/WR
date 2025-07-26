'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TextInput, Select, Button, Paper, Title, Group, Alert, Loader, Text } from '@mantine/core';
import RenderDynamicForm from '../../components/RenderDynamicForm';
import styles from './ModeloActivoForm.module.css'; // Asegúrate de tener estilos adecuados

// Función Helper para fusionar las definiciones de formulario (Grupos + Categoría)
const mergeFormDefinitions = (categoria) => {
    if (!categoria) return { atributos_especificos: [] };
    const mergedDefinition = { atributos_especificos: [] };
    const seenNames = new Set();

    (categoria.grupos || []).forEach(grupo => {
        (grupo.definicion_formulario?.atributos_especificos || []).forEach(attr => {
            if (!seenNames.has(attr.name)) {
                mergedDefinition.atributos_especificos.push(attr);
                seenNames.add(attr.name);
            }
        });
    });
    // Añadir/Sobrescribir con las propiedades de la categoría
    (categoria.definicion_formulario_propia?.atributos_especificos || []).forEach(attr => {
        if (!seenNames.has(attr.name)) {
            mergedDefinition.atributos_especificos.push(attr);
            seenNames.add(attr.name);
        }
    });
    return mergedDefinition;
};


export default function ModeloActivoForm({ modeloId = null }) {
  const router = useRouter();
  const [formData, setFormData] = useState({ nombre: '', categoriaId: '', propiedades_definidas: {} });
  const [categorias, setCategorias] = useState([]);
  const [selectedCategoria, setSelectedCategoria] = useState(null);
  const [mergedSchema, setMergedSchema] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const isEditing = !!modeloId;

  useEffect(() => {
    const fetchInitialData = async () => {
        const catRes = await fetch('/api/gestionMantenimiento/categorias');
        const catData = await catRes.json();
        setCategorias(catData.map(c => ({ value: c.id.toString(), label: c.nombre })));
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (isEditing) {
        const fetchModelo = async () => {
            setLoading(true);
            const res = await fetch(`/api/gestionMantenimiento/modelos-activos/${modeloId}`);
            const data = await res.json();
            setFormData({
                nombre: data.nombre,
                categoriaId: data.categoriaId.toString(),
                propiedades_definidas: data.propiedades_definidas || {}
            });
            setSelectedCategoria(data.CategoriaActivo);
            const merged = mergeFormDefinitions(data.CategoriaActivo);
            setMergedSchema(merged);
            setLoading(false);
        };
        fetchModelo();
    }
  }, [modeloId, isEditing]);


  const handleCategoriaChange = async (value) => {
    setFormData(prev => ({ ...prev, categoriaId: value, propiedades_definidas: {} }));
    const res = await fetch(`/api/gestionMantenimiento/categorias/${value}`);
    const data = await res.json();
    setSelectedCategoria(data);
    const merged = mergeFormDefinitions(data);
    setMergedSchema(merged);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const url = isEditing ? `/api/gestionMantenimiento/modelos-activos/${modeloId}` : '/api/gestionMantenimiento/modelos-activos';
    const method = isEditing ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
        if (!response.ok) throw new Error('Error al guardar el modelo');
        alert(`Modelo ${isEditing ? 'actualizado' : 'creado'} con éxito.`);
        router.push('/superuser/flota/modelos');
    } catch (err) {
        setError(err.message);
    } finally {
        setLoading(false);
    }
  };
  
  if (loading && isEditing) return <Loader />;

  return (
    <Paper withBorder shadow="md" p="xl" radius="md" maw={800} mx="auto">
      <Title order={2} mb="xl" ta="center">{isEditing ? 'Editar Modelo de Activo' : 'Crear Nuevo Modelo'}</Title>
      <form onSubmit={handleSubmit}>
        <TextInput label="Nombre del Modelo" placeholder="Ej: Silverado 2024" value={formData.nombre} onChange={(e) => setFormData({...formData, nombre: e.currentTarget.value})} required />
        <Select
          label="Categoría"
          placeholder="Seleccione la categoría a la que pertenece este modelo"
          data={categorias}
          value={formData.categoriaId}
          onChange={handleCategoriaChange}
          searchable
          mt="md"
          required
          disabled={isEditing}
        />
        
        {mergedSchema && (
            <RenderDynamicForm 
                schema={mergedSchema.atributos_especificos}
                onUpdate={(data) => setFormData({...formData, propiedades_definidas: data})}
                initialData={formData.propiedades_definidas}
            />
        )}
        
        <Group justify="flex-end" mt="xl">
          <Button variant="default" onClick={() => router.back()}>Cancelar</Button>
          <Button type="submit" loading={loading}>{isEditing ? 'Guardar Cambios' : 'Crear Modelo'}</Button>
        </Group>
      </form>
    </Paper>
  );
}