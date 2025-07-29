'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from '@mantine/form';
import { TextInput, Select, Button, Paper, Title, Group, Alert, Loader, Box, Text, Collapse } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import AtributoConstructor from './AtributoConstructor'; // Asegúrate que la ruta sea correcta

/**
 * Función que transforma la definición de una categoría (con sub-categorías)
 * al formato que AtributoConstructor necesita para el formulario.
 * Es la misma lógica que usamos en la creación.
 */
function transformCategoriaToFormSchema(category) {
    if (!category || !category.definicion) return [];
    const definicionArray = Array.isArray(category.definicion) ? category.definicion : Object.values(category.definicion);

    return definicionArray.map(attr => {
        const newAttr = { ...attr, key: `attr_${attr.id}_${Math.random()}` };
        if (attr.dataType === 'grupo' && attr.refId) {
            const subCategory = (category.subCategorias || []).find(sc => sc.id === attr.refId);
            if (subCategory) {
                newAttr.subGrupo = {
                    key: `sub_${subCategory.id}_${Math.random()}`,
                    nombre: subCategory.nombre,
                    definicion: transformCategoriaToFormSchema(subCategory),
                };
                newAttr.mode = 'define';
            }
        }
        return newAttr;
    });
}

export default function ModeloActivoForm({ initialData = null, isEditing = false }) {
    const router = useRouter();
    const [categorias, setCategorias] = useState([]);
    const [loading, setLoading] = useState(!isEditing); // Si no estamos editando, carga las categorías.
    const [error, setError] = useState('');

    const form = useForm({
        initialValues: {
            nombre: initialData?.nombre || '',
            categoriaId: initialData?.categoriaId?.toString() || '',
            especificaciones: [], // Se poblará dinámicamente
        },
        validate: {
            nombre: (value) => (value.trim().length > 2 ? null : 'El nombre es requerido'),
            categoriaId: (value) => (value ? null : 'Debe seleccionar una categoría'),
        },
    });

    // 1. Carga la lista de categorías (solo si estamos creando)
    useEffect(() => {
        if (!isEditing) {
            const fetchCategorias = async () => {
                try {
                    const res = await fetch('/api/gestionMantenimiento/categorias');
                    if (!res.ok) throw new Error('No se pudieron cargar las categorías');
                    const data = await res.json();
                    setCategorias(data.filter(c => !c.parentId).map(c => ({ value: c.id.toString(), label: c.nombre })));
                } catch (err) {
                    setError(err.message);
                } finally {
                    setLoading(false);
                }
            };
            fetchCategorias();
        }
    }, [isEditing]);

    // 2. Construye el formulario a partir de la categoría seleccionada o los datos iniciales
    useEffect(() => {
        const categoriaId = form.values.categoriaId;
        if (!categoriaId) {
            form.setFieldValue('especificaciones', []);
            return;
        };

        const fetchAndBuildSchema = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/gestionMantenimiento/categorias/${categoriaId}`);
                if (!res.ok) throw new Error('No se pudo cargar la estructura de la categoría');
                const categoriaCompleta = await res.json();
                
                const schema = transformCategoriaToFormSchema(categoriaCompleta);

                // Si estamos editando, fusionamos el schema con los datos guardados
                if (isEditing && initialData?.especificaciones) {
                    // Esta es una fusión simple. Una más compleja podría ser necesaria
                    // si la estructura de la categoría ha cambiado desde que se creó el modelo.
                    const mergedSchema = schema.map(attr => ({
                        ...attr,
                        ...(initialData.especificaciones[attr.id] || {})
                    }));
                    form.setFieldValue('especificaciones', mergedSchema);
                } else {
                    form.setFieldValue('especificaciones', schema);
                }

            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchAndBuildSchema();
    }, [form.values.categoriaId, isEditing, initialData]);


    const handleSubmit = async (values) => {
        setLoading(true);
        setError('');

        const url = isEditing ? `/api/gestionMantenimiento/modelos/${initialData.id}` : '/api/gestionMantenimiento/modelos';
        const method = isEditing ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values)
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error al guardar el modelo');
            }
            notifications.show({
                title: 'Éxito',
                message: `Modelo ${isEditing ? 'actualizado' : 'creado'} con éxito.`,
                color: 'green'
            });
            router.push('/superuser/flota/modelos');
            router.refresh();
        } catch (err) {
            notifications.show({ title: 'Error', message: err.message, color: 'red'});
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Paper withBorder shadow="md" p="xl" radius="md">
            <LoadingOverlay visible={loading} />
            <form onSubmit={form.onSubmit(handleSubmit)}>
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
                    disabled={isEditing} // No se puede cambiar la categoría de un modelo existente
                    {...form.getInputProps('categoriaId')}
                />
                
                <Collapse in={!!form.values.categoriaId}>
                    <Box mt="xl">
                        <Title order={4} mb="sm">Definición de Propiedades del Modelo</Title>
                        <Text size="sm" c="dimmed" mb="md">
                            Establece los valores y rangos para las propiedades heredadas.
                        </Text>
                        <AtributoConstructor
                            form={form}
                            fieldName="especificaciones"
                            from="Modelo" // Muy importante para la lógica de "isGenerator"
                        />
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