

import { Dropzone, IMAGE_MIME_TYPE } from '@mantine/dropzone';
import { useState } from 'react';
import { Box, Button, Image, Stack, rem } from '@mantine/core';
import { IconPhotoUp } from '@tabler/icons-react';
import imageCompression from 'browser-image-compression';

export function ImagenVehiculoUploader({ onUpload, form }) {
    const [preview, setPreview] = useState(null);

    const handleDrop = async (files) => {
        const original = files[0];

        const compressed = await imageCompression(original, {
            maxWidthOrHeight: 2000,
            maxSizeMB: 0.2,
            useWebWorker: true,
        });



        const renamed = new File([compressed], `${form.values.modelo}${form.values.placa}.jpg`, {
            type: compressed.type,
        });

        const formData = new FormData();
        formData.append('imagen', renamed);
        
        const res = await fetch('/api/vehiculos/imagen', {
            method: 'POST',
            body: formData,
        });
        
        if (res.ok) {
            const data = await res.json();
            form.setFieldValue('imagen',  `${form.values.modelo}${form.values.placa}.jpg`); // ← asignas el nombre al formulario 👈
            const timestamp = Date.now();
            setPreview(`${data.url}?t=${timestamp}`);

            // setPreview(data.url);
            onUpload?.(data.url);
        }
    };

    const handleDelete = async () => {
        if (!preview) return;
        const cleanUrl = preview.split('?')[0]; // eliminar ?t=timestamp
        const filename = cleanUrl.split('/').pop(); // extraer nombre.jpg
        console.log(filename)

        await fetch('/api/vehiculos/imagen/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename }),
        });

        setPreview(null);
        form.setFieldValue("imagen", "")
        // onUpload?.(null); // limpiar también en form si aplica
    };

    return (
        <Box style={{ height: rem(200), overflow: 'hidden' }}>
            {!preview ? (
                <Dropzone
                    onDrop={handleDrop}
                    accept={IMAGE_MIME_TYPE}
                    maxFiles={1}
                    h="100%"
                    disabled={!form.values.modelo || !form.values.placa}

                    multiple={false}
                    radius="md"
                    p="md"
                >
                    <Stack align="center" justify="center" h="100%">
                        <IconPhotoUp style={{ width: rem(36), height: rem(36) }} stroke={1.5} />
                        {!form.values.modelo || !form.values.placa ? "Llena la informacion de Datos generales para subir la imagen del vehiculo" : "Arrastra una imagen o haz clic para subir"}
                    </Stack>
                </Dropzone>
            ) : (
                <Box
                    h="100%"
                    style={{
                        position: 'relative', // 🔑 importante: contenedor de referencia para el botón
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Image
                        src={preview}
                        alt="Imagen del vehículo"
                        fit="contain"
                        h="100%"
                        style={{ maxWidth: '100%' }}
                        radius="md"
                    />

                    <Button
                        size="xs"
                        variant="light"
                        onClick={handleDelete}
                        style={{
                            position: 'absolute',
                            bottom: rem(8),
                            right: rem(8),
                            zIndex: 2,
                        }}
                    >
                        Eliminar Imagen
                    </Button>
                </Box>


            )}
        </Box>
    );
}