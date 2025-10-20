// app/superuser/flota/components/ImageDropzone.jsx
'use client';

import { useState, useEffect } from 'react';
import { Group, Text, Image, Box, Paper, Center, Loader, Stack } from '@mantine/core';
import { Dropzone, IMAGE_MIME_TYPE } from '@mantine/dropzone';
import { IconUpload, IconPhoto, IconX, IconReload } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import imageCompression from 'browser-image-compression';


export default function ImageDropzone({ label, form, fieldPath }) {
const [preview, setPreview] = useState(null);
    const [compressing, setCompressing] = useState(false);
    const initialValue = form.getInputProps(fieldPath).value;

    // Efecto para mostrar la imagen inicial si estamos editando
    useEffect(() => {
        if (typeof initialValue === 'string' && initialValue.startsWith('http')) {
            setPreview(initialValue);
        }
    }, [initialValue]);

    const handleDrop = async (acceptedFiles) => {
        const file = acceptedFiles[0];
        if (!file) return;

        setCompressing(true);
        notifications.show({
            id: 'compressing-image',
            title: 'Procesando imagen',
            message: 'Comprimiendo la imagen, por favor espera...',
            loading: true,
            autoClose: false,
        });

        const options = {
            maxSizeMB: 0.2, // Máximo 200KB
            maxWidthOrHeight: 1920,
            useWebWorker: true,
        };

        try {
            // ✨ 1. Comprimimos la imagen en el navegador
            const compressedFile = await imageCompression(file, options);
            
            // 2. Creamos una URL local solo para la previsualización
            const previewUrl = URL.createObjectURL(compressedFile);
            setPreview(previewUrl);

            // ✨ 3. Guardamos el ARCHIVO COMPRIMIDO en el estado del formulario
            form.setFieldValue(fieldPath, compressedFile);

            notifications.update({
                id: 'compressing-image',
                title: 'Éxito',
                message: 'Imagen procesada y lista para subir.',
                color: 'green',
                autoClose: 3000,
            });

        } catch (error) {
            notifications.update({
                id: 'compressing-image',
                title: 'No se pudo comprimir la imagen.',
                message: error.message,
                color: 'red',
            });
            console.error(error);
        } finally {
            setCompressing(false);
        }
    };

    return (
        <Box mt={15}   p="md" style={{borderRadius: '8px', backgroundColor: '#f8f9fa', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', border: '1px solid #585858ff'}}>
            {/* ✨ ZONA DE PREVISUALIZACIÓN Y CAMBIO DE IMAGEN ✨ */}
            {preview && !compressing && (
                <Paper   p="sm" mt="xs" radius="md">
                    <Stack align="center">
                        <Image src={preview} maw={250} radius="md" />
                        <Dropzone
                            onDrop={handleDrop}
                            maxSize={5 * 1024 ** 2}
                            accept={IMAGE_MIME_TYPE}
                            mt="xs"
                            padding="xs"
                            radius="md"
                            style={{ borderWidth: '1px', borderStyle: 'dashed' }}
                        >
                            <Group justify="center" gap="xs">
                                <IconReload size="1.2rem" stroke={1.5} />
                                <Text size="sm">Haz clic o arrastra un archivo para cambiar la imagen</Text>
                            </Group>
                        </Dropzone>
                    </Stack>
                </Paper>
            )}

            {/* ✨ ZONA DE CARGA INICIAL (SOLO SI NO HAY IMAGEN) ✨ */}
            {!preview && (
                <Dropzone
                    onDrop={handleDrop}
                    maxSize={5 * 1024 ** 2}
                    accept={IMAGE_MIME_TYPE}
                    mt="xs"
                    loading={compressing}
                >
                    <Group justify="center" gap="xl" mih={180} style={{ pointerEvents: 'none' }}>
                        <Dropzone.Accept><IconUpload size="3.2rem" stroke={1.5} /></Dropzone.Accept>
                        <Dropzone.Reject><IconX size="3.2rem" stroke={1.5} /></Dropzone.Reject>
                        <Dropzone.Idle><IconPhoto size="3.2rem" stroke={1.5} /></Dropzone.Idle>
                        <div>
                            <Text size="xl" inline>Arrastra una imagen o haz clic</Text>
                            <Text size="sm" c="dimmed" inline mt={7}>El archivo no debe exceder los 4.5MB</Text>
                        </div>
                    </Group>
                </Dropzone>
            )}
            
            {/* Mostramos un loader centrado mientras se comprime */}
            {compressing && (
                 <Center mt="md">
                    <Loader />
                    <Text ml="sm">Comprimiendo...</Text>
                </Center>
            )}
        </Box>
    );
}