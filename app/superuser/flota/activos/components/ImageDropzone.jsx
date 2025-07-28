// app/superuser/flota/components/ImageDropzone.jsx
'use client';

import { useState, useEffect } from 'react';
import { Group, Text, Image, SimpleGrid } from '@mantine/core';
import { Dropzone, IMAGE_MIME_TYPE } from '@mantine/dropzone';
import { IconUpload, IconPhoto, IconX } from '@tabler/icons-react';

// Helper para convertir un archivo a Base64
const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});

export default function ImageDropzone({ label, form, fieldPath }) {
    const [files, setFiles] = useState([]);
    const initialValue = form.getInputProps(fieldPath).value;

    useEffect(() => {
        // Si hay un valor inicial (editando), lo mostramos
        if (initialValue && files.length === 0) {
            setFiles([{ preview: initialValue }]);
        }
    }, [initialValue]);

    const handleDrop = async (acceptedFiles) => {
        const file = acceptedFiles[0];
        if (file) {
            setFiles([{ ...file, preview: URL.createObjectURL(file) }]);
            const base64 = await toBase64(file);
            form.setFieldValue(fieldPath, base64); // Guardamos la imagen en Base64 en el formulario
        }
    };

    const previews = files.map((file, index) => {
        const imageUrl = file.preview;
        return <Image key={index} src={imageUrl} onLoad={() => URL.revokeObjectURL(imageUrl)} />;
    });

    return (
        <Box>
            <Text size="sm" fw={500}>{label}</Text>
            <Dropzone
                onDrop={handleDrop}
                onReject={(files) => console.log('rejected files', files)}
                maxSize={5 * 1024 ** 2}
                accept={IMAGE_MIME_TYPE}
                mt="xs"
            >
                <Group justify="center" gap="xl" mih={180} style={{ pointerEvents: 'none' }}>
                    <Dropzone.Accept>
                        <IconUpload size="3.2rem" stroke={1.5} />
                    </Dropzone.Accept>
                    <Dropzone.Reject>
                        <IconX size="3.2rem" stroke={1.5} />
                    </Dropzone.Reject>
                    <Dropzone.Idle>
                        <IconPhoto size="3.2rem" stroke={1.5} />
                    </Dropzone.Idle>
                    <div>
                        <Text size="xl" inline>
                            Arrastra una imagen o haz clic para seleccionar
                        </Text>
                        <Text size="sm" c="dimmed" inline mt={7}>
                            El archivo no debe exceder los 5MB
                        </Text>
                    </div>
                </Group>
            </Dropzone>

            <SimpleGrid cols={{ base: 1, sm: 2 }} mt={previews.length > 0 ? 'xl' : 0}>
                {previews}
            </SimpleGrid>
        </Box>
    );
}