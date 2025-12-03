'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from '@mantine/form';
import { TextInput, Select, Button, Paper, Title, Group, Alert, Loader, Collapse, NumberInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import RenderActivoForm from './RenderActivoForm';
import ImageDropzone from './ImageDropzone';

/**
 * Función helper para extraer los valores por defecto del esquema del modelo.
 * Ahora maneja correctamente la estructura de objeto de la definición.
 * @param {object} schema - El objeto de la definición del modelo.
 * @returns {object} - Un objeto de valores por defecto.
 */
function extractDefaultValues(schema) {
    if (!schema || typeof schema !== 'object' || Array.isArray(schema)) return {};

    const defaults = {};

    for (const key in schema) {
        if (Object.prototype.hasOwnProperty.call(schema, key)) {
            const attr = schema[key];
            if (!attr || !attr.id) continue;

            // Lógica para valores simples
            if (attr.defaultValue !== null && attr.defaultValue !== undefined && attr.defaultValue !== '') {
                defaults[attr.id] = attr.defaultValue;
            }

            // Lógica para objetos anidados
            if (attr.dataType === 'object' && attr.definicion) {
                defaults[attr.id] = extractDefaultValues(attr.definicion);
            }
            
            // Lógica para grupos anidados
            if (attr.dataType === 'grupo' && attr.componente?.especificaciones) {
                // Si el grupo anidado tiene una especificación, la procesamos
                const subGrupoSpecs = attr.componente.especificaciones;
                defaults[attr.id] = extractDefaultValues(subGrupoSpecs);
            }
        }
    }
    return defaults;
}


export default function ActivoForm({ initialData = null, isEditing = false }) {
    const router = useRouter();
    const [modelos, setModelos] = useState([]);
    const [selectedModeloSchema, setSelectedModeloSchema] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm({
        initialValues: {
            modeloId: initialData?.modeloId?.toString() || '',
            codigoActivo: initialData?.codigoActivo || '',
            valor: initialData?.valor || '',
            imagen: initialData?.imagen || null,
            datosPersonalizados: initialData?.datosPersonalizados || {},
            kilometrajeInicial: '',
            horometroInicial: '',
        },
        validate: {
            modeloId: (value) => (value ? null : 'Debes seleccionar un modelo'),
            codigoActivo: (value) => (value.trim().length > 0 ? null : 'El código es requerido'),
            kilometrajeInicial: (value, values) => (isEditing ? null : (value > 0 ? null : 'El kilometraje inicial es requerido')),
        },
    });

    useEffect(() => {
        console.log(form.values);
    }, [form.values]);

    const handleModeloChange = async (modeloId) => {
        form.setFieldValue('modeloId', modeloId);
        form.setFieldValue('datosPersonalizados', {});
        form.setFieldValue('codigoActivo', '');

        if (modeloId) {
            setLoading(true);
            try {
                // Se modificó la llamada para garantizar que la categoría se incluya
                const [modeloRes, codigoRes] = await Promise.all([
                    fetch(`/api/gestionMantenimiento/modelos-activos/${modeloId}`),
                    fetch(`/api/gestionMantenimiento/activos/next-code?modeloId=${modeloId}`)
                ]);
                
                if (!modeloRes.ok || !codigoRes.ok) {
                    throw new Error("No se pudo obtener la información del modelo o el código.");
                }

                const modeloData = await modeloRes.json();
                const codigoData = await codigoRes.json();

                // Aquí se procesan los datos correctamente
                const defaultData = extractDefaultValues(modeloData.especificaciones);
                form.setFieldValue('datosPersonalizados', defaultData);
                form.setFieldValue('codigoActivo', codigoData.nextCode);
                
                // Se setea el esquema para RenderActivoForm
                setSelectedModeloSchema(modeloData.especificaciones);
            } catch (error) {
                notifications.show({ title: 'Error', message: error.message, color: 'red' });
            } finally {
                setLoading(false);
            }
        } else {
            setSelectedModeloSchema(null);
        }
    };

    useEffect(() => {
        // La URL de la API de modelos debe ser ajustada
        fetch('/api/gestionMantenimiento/modelos-activos')
            .then(res => res.json())
            .then(data => {
                setModelos(data.map(m => ({ value: m.id.toString(), label: m.nombre })));
                if (isEditing && initialData) {
                    handleModeloChange(initialData.modeloId.toString(), true);
                } else {
                    setLoading(false);
                }
            });
    }, [isEditing, initialData]);

    const handleSubmit = async (values) => {
        setIsSubmitting(true);
        let finalPayload = { ...values };

        try {
            if (values.imagen && typeof values.imagen.arrayBuffer === 'function') {
                notifications.show({ id: 'uploading-image', title: 'Subiendo imagen...', message: 'Por favor espera.', loading: true });
                const imagenFile = values.imagen;
                const fileExtension = imagenFile.name.split('.').pop();
                const uniqueFilename = `${values.codigoActivo.replace(/\s+/g, '_')}.${fileExtension}`;
                
                const response = await fetch(`/api/upload?filename=${encodeURIComponent(uniqueFilename)}`, {
                    method: 'POST',
                    body: imagenFile,
                });
                
                console.log(response)
                if (!response.ok) console.log('Falló la subida de la imagen. Probablemente ya exista una con ese nombre.');
                const newBlob = await response.json();
                finalPayload.imagen = `${values.codigoActivo}.jpg`;
                notifications.update({ id: 'uploading-image', title: 'Éxito', message: 'Imagen subida.', color: 'green' });
            }

            const url = isEditing ? `/api/gestionMantenimiento/activos/${initialData.id}` : '/api/gestionMantenimiento/activos';
            const method = isEditing ? 'PUT' : 'POST';

         

            const finalResponse = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(finalPayload)
            });

            if (!finalResponse.ok) throw new Error((await finalResponse.json()).message);
            
            notifications.show({ title: 'Éxito', message: `Activo ${isEditing ? 'actualizado' : 'creado'} correctamente.`, color: 'green' });
            router.push('/superuser/flota/activos');
            router.refresh();

        } catch (error) {
            notifications.show({ title: 'Error', message: error.message, color: 'red' });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading && !isEditing) return <Loader />;

    return (
        <Paper component="form" onSubmit={form.onSubmit(handleSubmit)}   p="xl">
            <Select
                label="Basado en el Modelo"
                placeholder="Selecciona un modelo"
                data={modelos}
                searchable
                required
                disabled={isEditing}
                {...form.getInputProps('modeloId')}
                onChange={(value) => handleModeloChange(value)}
            />
            <Collapse in={!!form.values.modeloId}>
                <Group grow mt="md">
                    <TextInput label="Código del Activo" required {...form.getInputProps('codigoActivo')} />
                </Group>
                
                {!isEditing && (
                    <Paper   p="md" mt="md">
                        <Title order={5} mb="sm">Lecturas Iniciales</Title>
                        <Group grow>
                            <NumberInput label="Kilometraje Inicial" placeholder="0" required {...form.getInputProps('kilometrajeInicial')} />
                            <NumberInput label="Horas de Trabajo Iniciales (Horómetro)" placeholder="0" {...form.getInputProps('horometroInicial')} />
                        </Group>
                        <NumberInput label="Valor del Activo" placeholder="0.00" precision={2} min={0} step={500} mt="md" {...form.getInputProps('valor')} />
                    </Paper>
                )}

                <ImageDropzone label="Imagen Principal del Activo" form={form} fieldPath="imagen" />
                <Title order={4} mt="xl" mb="md">Ficha Técnica</Title>
                {loading ? <Loader /> : (
                    selectedModeloSchema && <RenderActivoForm schema={selectedModeloSchema} form={form} />
                )}
            </Collapse>
            <Group justify="flex-end" mt="xl">
                <Button type="submit" loading={isSubmitting} disabled={!form.values.modeloId}>
                    {isEditing ? 'Guardar Cambios' : 'Guardar Activo'}
                </Button>
            </Group>
        </Paper>
    );
}