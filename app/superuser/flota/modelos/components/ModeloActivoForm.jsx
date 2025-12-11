// app/superuser/flota/components/ModeloActivoForm.jsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from '@mantine/form';
import { TextInput, Select, Button, Paper, Title, Group, Alert, Loader, Box, Text, Collapse, LoadingOverlay } from '@mantine/core';
import { set } from 'date-fns';
import { transformPayloadToFormValues } from '../../grupos/[id]/editar/page';

/**
 * @param {object} category - El objeto de la categoría con sus subCategorías.
 * @returns {Array} - Una definición de atributos lista para el formulario.
 */
function transformCategoriaToFormSchema(category) {
    if (!category || !category.definicion) return [];

    const definicionArray = Object.values(category.definicion);

    return definicionArray.map(attr => {
        const newAttr = { ...attr };

        // Si el atributo es una referencia a una sub-categoría...
        if (attr.dataType === 'grupo' && attr.refId) {
            // Buscamos la sub-categoría correspondiente en el array de hijos.
            const subCategory = (category.subCategorias || []).find(sc => sc.id === attr.refId);
            
            if (subCategory) {
                // Si la encontramos, la transformamos recursivamente y la anidamos.
                newAttr.subGrupo = {
                    key: `sub_${subCategory.id}_${Math.random()}`,
                    nombre: subCategory.nombre,
                    // Llamada recursiva para procesar la definición de la sub-categoría.
                    definicion: transformCategoriaToFormSchema(subCategory),
                };
                newAttr.mode = 'define'; // Modo para mostrar el constructor anidado.
            }
        }
        
        // Asignamos una clave única para que Mantine pueda manejar el array.
        newAttr.key = `attr_${attr.id}_${Math.random()}`;
        return newAttr;
    });
}


export default function ModeloActivoForm({ modeloId = null }) {
    const router = useRouter();
    const [categorias, setCategorias] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const isEditing = !!modeloId;

    const form = useForm({
        initialValues: {
            nombre: '',
            categoriaId: '',
            propiedades_definidas: [], 
        },
        validate: {
            nombre: (value) => (value.trim().length > 2 ? null : 'El nombre es requerido'),
            categoriaId: (value) => (value ? null : 'Debe seleccionar una categoría'),
        },
    });

    useEffect(() => {
        console.log(form.values);
    }, [form.values]);

    // 1. Carga la lista de categorías para el Select
    useEffect(() => {
      setLoading(true);
      setError('');
        const fetchCategorias = async () => {
            try {
                const res = await fetch('/api/gestionMantenimiento/categorias');
                if (!res.ok) throw new Error('No se pudieron cargar las categorías');
                const data = await res.json();
                // Solo mostrar categorías principales en el selector
                setCategorias(data.filter(c => !c.parentId).map(c => ({ value: c.id.toString(), label: c.nombre })));
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchCategorias();
    }, []);

    // 2. Carga los datos del modelo si estamos en modo de edición
    useEffect(() => {
        if (isEditing && modeloId) {
            const fetchModelo = async () => {
                setLoading(true);
                try {
                    const res = await fetch(`/api/gestionMantenimiento/modelos-activos/${modeloId}`);
                    if (!res.ok) throw new Error('No se pudo cargar el modelo');
                    const data = await res.json();
                    
                    // Seteamos los valores iniciales. El cambio en `categoriaId`
                    // disparará el siguiente useEffect para construir el formulario.
                    form.setValues({
                        nombre: data.nombre,
                        categoriaId: data.categoriaId.toString(),
                        // Las propiedades guardadas se setearán después de construir el schema
                        propiedades_definidas: data.propiedades_definidas || {}
                    });

                } catch (err) {
                    setError(err.message);
                } finally {
                    setLoading(false);
                }
            };
            fetchModelo();
        }
    }, [modeloId, isEditing]);

    // 3. Efecto principal: Reacciona al cambio de categoría para construir el formulario.
    useEffect(() => {
        const categoriaId = form.values.categoriaId;
        if (!categoriaId) {
            form.setFieldValue('propiedades_definidas', []);
            return;
        };

        const fetchAndBuildSchema = async () => {
            setLoading(true);
            try {
                // Obtenemos la categoría con TODA su jerarquía
                const res = await fetch(`/api/gestionMantenimiento/categorias/${categoriaId}`);
                if (!res.ok) throw new Error('No se pudo cargar la estructura de la categoría');
                const categoriaCompleta = await res.json();

                // Transformamos la definición en un esquema para el formulario
                const schema = transformPayloadToFormValues(categoriaCompleta);
                
                
                form.setFieldValue('definicion', schema.definicion);

            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchAndBuildSchema();
    }, [form.values.categoriaId]);


    const handleSubmit = async (values) => {
        setLoading(true);
        setError('');

        // Aquí puedes añadir una función que limpie las 'key' aleatorias del payload antes de enviarlo
        const payload = { nombre: values.nombre, categoriaId: values.categoriaId, definicion: values.definicion };
        // console.log('Payload a enviar:', payload);
        // setLoading(false);
        // return
        

        const url = isEditing ? `/api/gestionMantenimiento/modelos-activos/${modeloId}` : '/api/gestionMantenimiento/modelos-activos';
        const method = isEditing ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error al guardar el modelo');
            }
            alert(`Modelo ${isEditing ? 'actualizado' : 'creado'} con éxito.`);
            router.push('/superuser/flota/modelos');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };


    return (
        <Paper   shadow="md" p="xl" radius="md" maw={800} mx="auto">
          
            <Title order={2} mb="xl" ta="center">{isEditing ? 'Editar Modelo de Activo' : 'Crear Nuevo Modelo'}</Title>
            <form onSubmit={form.onSubmit(handleSubmit)}>
            <LoadingOverlay visible={loading} />
                <TextInput
                    label="Nombre del Modelo"
                    placeholder="Ej: Silverado 2024"
                    required
                    {...form.getInputProps('nombre')}
                />
                <Select
                    label="Categoría"
                    placeholder="Seleccione una categoría"
                    data={categorias}
                    searchable
                    mt="md"
                    required
                    disabled={isEditing}
                    {...form.getInputProps('categoriaId')}
                />
                
                <Collapse in={!!form.values.categoriaId}>
                    <Box mt="xl">
                        <Title order={4} mb="sm">Propiedades Específicas del Modelo</Title>
                        <Text size="sm" c="dimmed" mb="md">
                            Completa los valores para las propiedades heredadas de la categoría y sus sub-categorías.
                        </Text>
            
                    </Box>
                </Collapse>
                
                {error && <Alert color="red" title="Error" mt="md">{error}</Alert>}

                <Group justify="flex-end" mt="xl">
                    <Button variant="default" onClick={() => router.back()}>Cancelar</Button>
                    <Button type="submit" loading={loading}>{isEditing ? 'Guardar Cambios' : 'Crear Modelo'}</Button>
                </Group>
            </form>
        </Paper>
    );
}