'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TextInput, Textarea, MultiSelect, Button, Paper, Title, Group, Alert, Loader, Divider, Text } from '@mantine/core';
import AtributoConstructor from './AtributoConstructor';
import styles from './CategoriaForm.module.css';

// Función Helper para fusionar las definiciones de los grupos (robusta)
const mergeFormDefinitions = (schemas) => {
    const merged = { atributos_especificos: [] };
    const seen = new Set();
    (schemas || []).forEach(schema => {
        (schema.atributos_especificos || []).forEach(attr => {
            if (!seen.has(attr.name)) {
                seen.add(attr.name);
                // Copia profunda para evitar mutaciones accidentales
                merged.atributos_especificos.push(JSON.parse(JSON.stringify(attr)));
            }
        });
    });
    return merged;
};

export default function CategoriaForm({ categoriaId = null }) {
  const router = useRouter();
  
  // Estados para los datos básicos de la categoría
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [gruposAsociados, setGruposAsociados] = useState([]); // Almacena los IDs
  
  // Estado para el esqueleto completo (estructura + datos)
  const [esqueleto, setEsqueleto] = useState({
    definicion_formulario: { atributos_especificos: [] },
    valores_predeterminados: {}
  });

  // Estados para la lógica de la UI
  const [allGruposData, setAllGruposData] = useState([]);
  const [loading, setLoading] = useState(true); // Inicia en true para la carga inicial
  const [error, setError] = useState('');
  const isEditing = !!categoriaId;

  // Carga inicial de datos (todos los grupos y la categoría a editar)
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const res = await fetch('/api/gestionMantenimiento/grupos');
        if (!res.ok) throw new Error("No se pudieron cargar los Grupos");
        const data = await res.json();
        setAllGruposData(data);

        if (isEditing) {
          const catRes = await fetch(`/api/gestionMantenimiento/categorias/${categoriaId}`);
          if (!catRes.ok) throw new Error("No se pudo cargar la Categoría a editar");
          const catData = await catRes.json();
          
          setNombre(catData.nombre);
          setDescripcion(catData.descripcion || '');
          setGruposAsociados(catData.grupos ? catData.grupos.map(g => g.id.toString()) : []);
          
          // Al editar, el esqueleto se compone de la definición guardada y los valores guardados
          setEsqueleto({
            definicion_formulario: catData.definicion_formulario_propia || { atributos_especificos: [] },
            valores_predeterminados: catData.valores_predeterminados || {}
          });
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, [categoriaId, isEditing]);

  // Efecto para fusionar los schemas cuando cambian los grupos (solo al crear)
  useEffect(() => {
    if (isEditing) return; // Si estamos editando, no sobreescribimos el esqueleto guardado

    const fetchAndMergeSchemas = async () => {
      if (gruposAsociados.length === 0) {
        setEsqueleto({ definicion_formulario: { atributos_especificos: [] }, valores_predeterminados: {} });
        return;
      }

      setLoading(true);
      try {
        const schemasPromises = gruposAsociados.map(grupoId => {
          const grupoNombre = allGruposData.find(g => g.id.toString() === grupoId)?.nombre;
          if (!grupoNombre) return Promise.resolve({ atributos_especificos: [] });
          // Llamamos a nuestra API inteligente para obtener el esqueleto completo de cada grupo
          return fetch(`/api/gestionMantenimiento/grupos/schema/${grupoNombre}`).then(res => res.json());
        });

        const schemas = await Promise.all(schemasPromises);
        const mergedSchema = mergeFormDefinitions(schemas);
        
        // Poblamos el esqueleto con la nueva estructura fusionada y reseteamos los valores
        setEsqueleto({
            definicion_formulario: mergedSchema,
            valores_predeterminados: {}
        });

      } catch (err) {
        setError("Error al construir el formulario de la categoría.");
      } finally {
        setLoading(false);
      }
    };

    fetchAndMergeSchemas();
  }, [gruposAsociados, allGruposData, isEditing]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const payload = {
      nombre,
      descripcion,
      grupos: gruposAsociados.map(id => parseInt(id)),
      // Separamos la estructura de los datos para guardarlos en la BD
      definicion_formulario_propia: esqueleto.definicion_formulario,
      valores_predeterminados: esqueleto.valores_predeterminados,
    };

    const url = isEditing ? `/api/gestionMantenimiento/categorias/${categoriaId}` : '/api/gestionMantenimiento/categorias';
    const method = isEditing ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.message || 'Error al guardar la categoría');
        }
        alert(`Categoría ${isEditing ? 'guardada' : 'creada'} con éxito.`);
        router.push('/superuser/flota/categorias');
    } catch (err) {
        setError(err.message);
    } finally {
        setLoading(false);
    }
  };

  if (loading && !esqueleto.definicion_formulario.atributos_especificos.length) return <Loader />;

  return (
    <Paper withBorder shadow="md" p="xl" radius="md" className={styles.formContainer}>
      <Title order={2} mb="xl" ta="center">{isEditing ? 'Editar Categoría' : 'Crear Nueva Categoría'}</Title>
      <form onSubmit={handleSubmit}>
        {error && <Alert color="red" title="Error" mb="lg">{error}</Alert>}
        
        <TextInput label="Nombre de la Categoría" value={nombre} onChange={(e) => setNombre(e.currentTarget.value)} required />
        <Textarea label="Descripción" mt="md" value={descripcion} onChange={(e) => setDescripcion(e.currentTarget.value)} />
        
        <Divider my="xl" label="Herencia y Especialización" labelPosition="center" />
        
        <MultiSelect
          label="Heredar de Grupos"
          description={isEditing ? "Grupos base de la categoría (la herencia no se puede cambiar después de la creación)." : "Seleccione grupos para construir el esqueleto inicial."}
          data={allGruposData.map(g => ({ value: g.id.toString(), label: g.nombre }))}
          value={gruposAsociados}
          onChange={setGruposAsociados}
          searchable
          disabled={isEditing}
        />

        <div className={styles.constructorContainer}>
            <Text fw={500} size="sm" c="dimmed" mt="lg">
              Modifique la estructura y rellene los valores predeterminados para esta categoría.
            </Text>
            {loading ? <Loader /> : (
              <AtributoConstructor 
                value={esqueleto}
                onUpdate={setEsqueleto}
                gruposDisponibles={allGruposData.map(g => g.nombre)}
                mode="specialize"
              />
            )}
        </div>
        
        <Group justify="flex-end" mt="xl">
          <Button variant="default" onClick={() => router.back()}>Cancelar</Button>
          <Button type="submit" loading={loading}>{isEditing ? 'Guardar Cambios' : 'Crear Categoría'}</Button>
        </Group>
      </form>
    </Paper>
  );
}