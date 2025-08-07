'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from '@mantine/form';
import { TextInput, Select, Button, Paper, Title, Group, Alert, Loader, Collapse, NumberInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import RenderActivoForm from './RenderActivoForm';
import ImageDropzone from './ImageDropzone';

// Función helper para extraer los valores por defecto del esquema del modelo
function extractDefaultValues(schema) {
    if (!schema) return {};
    const defaults = {};
    const schemaArray = Array.isArray(schema) ? schema : Object.values(schema);

    for (const attr of schemaArray) {
        if (!attr || !attr.id) continue;
        if (attr.defaultValue !== null && attr.defaultValue !== undefined && attr.defaultValue !== '') {
            defaults[attr.id] = attr.defaultValue;
        }
        if (attr.dataType === 'object' && attr.definicion) {
            defaults[attr.id] = extractDefaultValues(attr.definicion);
        }
        if (attr.dataType === 'grupo' && attr.componente?.especificaciones) {
            defaults[attr.id] = extractDefaultValues(attr.componente.especificaciones);
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
            imagen: initialData?.imagen || null,
            datosPersonalizados: initialData?.datosPersonalizados || {},
            // ✨ CAMPOS AÑADIDOS PARA LECTURAS INICIALES ✨
            kilometrajeInicial: '',
            horometroInicial: '',
        },
        validate: {
            modeloId: (value) => (value ? null : 'Debes seleccionar un modelo'),
            codigoActivo: (value) => (value.trim().length > 0 ? null : 'El código es requerido'),
            kilometrajeInicial: (value, values) => (isEditing ? null : (value > 0 ? null : 'El kilometraje inicial es requerido')),
        },
    });

   const handleModeloChange = async (modeloId) => {
        form.setFieldValue('modeloId', modeloId);
        form.setFieldValue('datosPersonalizados', {});
        form.setFieldValue('codigoActivo', '');

        if (modeloId) {
            setLoading(true);
            try {
                // ✨ LLAMADAS A LAS APIS CORREGIDAS ✨
                const [modeloRes, codigoRes] = await Promise.all([
                    fetch(`/api/gestionMantenimiento/modelos-activos/${modeloId}`),
                    fetch(`/api/gestionMantenimiento/activos/next-code?modeloId=${modeloId}`) // Pasamos el modeloId
                ]);
                
                if (!modeloRes.ok || !codigoRes.ok) {
                    throw new Error("No se pudo obtener la información del modelo o el código.");
                }

                const modeloData = await modeloRes.json();
                const codigoData = await codigoRes.json();

                const defaultData = extractDefaultValues(modeloData.especificaciones);
                form.setFieldValue('datosPersonalizados', defaultData);
                form.setFieldValue('codigoActivo', codigoData.nextCode);
                
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
        fetch('/api/gestionMantenimiento/modelos-activos') // Ajustado a la ruta correcta de modelos
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

    // ✨ --- INICIO DE LA CORRECCIÓN DEFINITIVA --- ✨
    const handleSubmit = async (values) => {
        // console.log(values);
        // return
         setIsSubmitting(true);
        let finalPayload = { ...values };

        try {
            console.log("[HANDLE SUBMIT] Iniciando envío. Tipo de 'imagen':", typeof values.imagen, values.imagen);

            // ✨ --- LA CORRECCIÓN INFALIBLE ESTÁ AQUÍ --- ✨
            // En lugar de `instanceof File`, comprobamos si tiene el método `arrayBuffer`.
            // Esto es mucho más robusto.
            if (values.imagen && typeof values.imagen.arrayBuffer === 'function') {
                
                console.log("[HANDLE SUBMIT] Se detectó un objeto tipo File/Blob. Procediendo a subir...");
                notifications.show({ id: 'uploading-image', title: 'Subiendo imagen...', message: 'Por favor espera.', loading: true });

                const imagenFile = values.imagen;
                const fileExtension = imagenFile.name.split('.').pop();
                const uniqueFilename = `${values.codigoActivo.replace(/\s+/g, '_')}.${fileExtension}`;
                
                const response = await fetch(`/api/upload?filename=${encodeURIComponent(uniqueFilename)}`, {
                    method: 'POST',
                    body: imagenFile,
                });
                
                if (!response.ok) throw new Error('Falló la subida de la imagen.');

                const newBlob = await response.json();
                finalPayload.imagen = newBlob.url;
                notifications.update({ id: 'uploading-image', title: 'Éxito', message: 'Imagen subida.', color: 'green' });
            
            } else {
                 console.log("[HANDLE SUBMIT] No se detectó un archivo nuevo. Se saltará la subida.");
            }

            // Enviamos el payload final
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
            notifications.hide('uploading-image');
        } finally {
            setIsSubmitting(false);
        }
    };
    // ✨ --- FIN DE LA CORRECCIÓN DEFINITIVA --- ✨

    if (loading && !isEditing) return <Loader />;

    return (
        <Paper component="form" onSubmit={form.onSubmit(handleSubmit)} withBorder p="xl">
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
                
                {/* ✨ NUEVOS CAMPOS: Solo visibles al crear */}
                {!isEditing && (
                    <Paper withBorder p="md" mt="md">
                        <Title order={5} mb="sm">Lecturas Iniciales</Title>
                        <Group grow>
                            <NumberInput label="Kilometraje Inicial" placeholder="0" required {...form.getInputProps('kilometrajeInicial')} />
                            <NumberInput label="Horas de Trabajo Iniciales (Horómetro)" placeholder="0" {...form.getInputProps('horometroInicial')} />
                        </Group>
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