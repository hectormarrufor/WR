'use client';
import { useState } from 'react';
import { Group, Text, rem, Image } from '@mantine/core';
import { IconUpload, IconPhoto, IconX } from '@tabler/icons-react';
import { Dropzone, IMAGE_MIME_TYPE } from '@mantine/dropzone';

export function ImageUploader({ onUploadSuccess, initialImageUrl = '' }) {
  const [imageUrl, setImageUrl] = useState(initialImageUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDrop = async (files) => {
    if (files.length === 0) return;
    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', files[0]);

    try {
      // Usamos la API que ya tienes para subir imágenes de vehículos
      const response = await fetch('/api/vehiculos/imagen/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Error al subir la imagen');
      const result = await response.json();

      setImageUrl(result.imageUrl); // Asumimos que la API devuelve { imageUrl: '...' }
      onUploadSuccess(result.imageUrl);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  if (imageUrl) {
    return (
      <Paper withBorder p="xs" style={{position: 'relative'}}>
        <Image src={imageUrl} height={200} fit="contain" />
        <ActionIcon color="red" variant="filled" onClick={() => { setImageUrl(''); onUploadSuccess(''); }} style={{position: 'absolute', top: 5, right: 5}}>
          <IconX size={16} />
        </ActionIcon>
      </Paper>
    );
  }

  return (
    <Dropzone
      onDrop={handleDrop}
      onReject={(files) => console.log('rejected files', files)}
      maxSize={5 * 1024 ** 2}
      accept={IMAGE_MIME_TYPE}
      loading={loading}
    >
      <Group justify="center" gap="xl" mih={220} style={{ pointerEvents: 'none' }}>
        <Dropzone.Accept>
          <IconUpload style={{ width: rem(52), height: rem(52), color: 'var(--mantine-color-blue-6)' }} stroke={1.5} />
        </Dropzone.Accept>
        <Dropzone.Reject>
          <IconX style={{ width: rem(52), height: rem(52), color: 'var(--mantine-color-red-6)' }} stroke={1.5} />
        </Dropzone.Reject>
        <Dropzone.Idle>
          <IconPhoto style={{ width: rem(52), height: rem(52), color: 'var(--mantine-color-dimmed)' }} stroke={1.5} />
        </Dropzone.Idle>

        <div>
          <Text size="xl" inline>
            Arrastra una imagen aquí o haz clic para seleccionar
          </Text>
          <Text size="sm" c="dimmed" inline mt={7}>
            El archivo no debe exceder los 5MB
          </Text>
          {error && <Text size="sm" c="red" mt={7}>{error}</Text>}
        </div>
      </Group>
    </Dropzone>
  );
}