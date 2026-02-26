// app/superuser/flota/components/ImageDropzone.jsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Group, Text, Image, Box, Paper, Center, Loader, Stack, Modal, Slider, Button, rem } from '@mantine/core';
import { Dropzone } from '@mantine/dropzone';
import { IconPhoto, IconX, IconReload, IconCamera, IconCrop, IconDeviceFloppy, IconRectangleVertical, IconRectangle } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import imageCompression from 'browser-image-compression';
import Cropper from 'react-easy-crop';

// --- UTILIDAD PARA CORTAR IMAGEN (Canvas) ---
const createImage = (url) =>
    new Promise((resolve, reject) => {
        const image = new window.Image();
        image.addEventListener('load', () => resolve(image));
        image.addEventListener('error', (error) => reject(error));
        image.setAttribute('crossOrigin', 'anonymous');
        image.src = url;
    });

async function getCroppedImg(imageSrc, pixelCrop) {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
    );

    return new Promise((resolve) => {
        canvas.toBlob((blob) => {
            resolve(blob);
        }, 'image/jpeg', 0.95);
    });
}

export default function ImageDropzone({ label, form, fieldPath }) {
    const [preview, setPreview] = useState(null);
    const [compressing, setCompressing] = useState(false);
    
    const openDropzoneRef = useRef(null);
    const cameraInputRef = useRef(null);

    // Estados para el recorte
    const [cropModalOpen, setCropModalOpen] = useState(false);
    const [tempImageSrc, setTempImageSrc] = useState(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    
    // Iniciamos en 4/3 (Horizontal estándar)
    const [aspect, setAspect] = useState(4 / 3); 
    
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

    const initialValue = form.getInputProps(fieldPath).value;

    useEffect(() => {
        if (typeof initialValue === 'string' && initialValue.startsWith('http')) {
            setPreview(initialValue);
        }
        else if (typeof initialValue === "string") {
            setPreview(`${initialValue}?v=${process.env.NEXT_PUBLIC_APP_VERSION}`);
        }
    }, [initialValue]);

    const processFile = (file) => {
        if (!file) return;
        const imageDataUrl = URL.createObjectURL(file);
        setTempImageSrc(imageDataUrl);
        setCropModalOpen(true);
        setZoom(1);
        setAspect(4 / 3); 
        
        if(cameraInputRef.current) cameraInputRef.current.value = '';
    };

    const handleDrop = (acceptedFiles) => {
        processFile(acceptedFiles[0]);
    };

    const handleCameraCapture = (event) => {
        const file = event.target.files?.[0];
        processFile(file);
    };

    const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleSaveCrop = async () => {
        setCropModalOpen(false);
        setCompressing(true);
        
        notifications.show({
            id: 'compressing-image',
            title: 'Procesando',
            message: 'Recortando y comprimiendo...',
            loading: true,
            autoClose: false,
        });

        try {
            const croppedBlob = await getCroppedImg(tempImageSrc, croppedAreaPixels);
            const croppedFile = new File([croppedBlob], "document.jpg", { type: "image/jpeg" });

            const options = {
                maxSizeMB: 0.2,
                maxWidthOrHeight: 1920,
                useWebWorker: true,
            };

            const finalFile = await imageCompression(croppedFile, options);
            
            const previewUrl = URL.createObjectURL(finalFile);
            setPreview(previewUrl);
            form.setFieldValue(fieldPath, finalFile);

            notifications.update({
                id: 'compressing-image',
                title: 'Éxito',
                message: 'Imagen lista.',
                color: 'green',
                autoClose: 3000,
            });

        } catch (error) {
            notifications.update({
                id: 'compressing-image',
                title: 'Error',
                message: 'No se pudo procesar la imagen.',
                color: 'red',
            });
            console.error(error);
        } finally {
            setCompressing(false);
        }
    };

    const handleCancelCrop = () => {
        setCropModalOpen(false);
        setTempImageSrc(null);
    };

    return (
        <Box mt={15} p="md" style={{ borderRadius: '8px', backgroundColor: '#f8f9fa', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', border: '1px solid #585858ff' }}>
            
            <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={cameraInputRef}
                style={{ display: 'none' }}
                onChange={handleCameraCapture}
            />

            {/* --- MODAL DE RECORTE --- */}
            <Modal 
                opened={cropModalOpen} 
                onClose={handleCancelCrop} 
                title="Ajustar Documento"
                size="lg"
                centered
                closeOnClickOutside={false}
            >
                {/* Zona del Cropper */}
                <Box pos="relative" h={350} w="100%" bg="dark">
                    {tempImageSrc && (
                        <Cropper
                            image={tempImageSrc}
                            crop={crop}
                            zoom={zoom}
                            aspect={aspect} // Usamos el valor numérico del slider
                            onCropChange={setCrop}
                            onCropComplete={onCropComplete}
                            onZoomChange={setZoom}
                            objectFit="contain"
                        />
                    )}
                </Box>

                {/* Controles de Edición */}
                <Stack mt="md" gap="md">
                    
                    {/* Slider de Aspect Ratio */}
                    <Box>
                        <Group justify="space-between" mb={5}>
                            <Text size="xs" fw={500}>Forma del recorte</Text>
                            <Text size="xs" c="dimmed">{aspect < 1 ? 'Vertical' : aspect > 1.2 ? 'Horizontal' : 'Cuadrado'}</Text>
                        </Group>
                        <Group gap="xs" align="center">
                             <IconRectangleVertical size={20} stroke={1.5} color="gray" />
                             <Slider
                                style={{ flex: 1 }}
                                value={aspect}
                                onChange={setAspect}
                                min={0.5} // Muy vertical
                                max={2.5} // Muy horizontal
                                step={0.1}
                                marks={[
                                    { value: 1, label: '1:1' }, // Marca visual en el cuadrado perfecto
                                    { value: 1.33, label: '4:3' }
                                ]}
                            />
                            <IconRectangle size={20} stroke={1.5} color="gray" />
                        </Group>
                    </Box>

                    {/* Slider de Zoom */}
                    <Box>
                        <Text size="xs" fw={500} mb={5}>Zoom</Text>
                        <Slider
                            value={zoom}
                            min={1}
                            max={3}
                            step={0.1}
                            onChange={setZoom}
                        />
                    </Box>

                    <Group justify="flex-end" mt="xs">
                        <Button variant="default" onClick={handleCancelCrop}>Cancelar</Button>
                        <Button onClick={handleSaveCrop} leftSection={<IconDeviceFloppy size={16} />}>
                            Guardar
                        </Button>
                    </Group>
                </Stack>
            </Modal>

            {/* --- DROPZONE VISUAL --- */}
            {preview && !compressing && (
                <Paper p="sm" mt="xs" radius="md">
                    <Stack align="center">
                        <Image src={preview} maw={250} radius="md" />
                        <Button 
                            variant="light" 
                            leftSection={<IconReload size={16} />}
                            onClick={() => setPreview(null)} 
                        >
                            Cambiar imagen
                        </Button>
                    </Stack>
                </Paper>
            )}

            {!preview && (
                <Dropzone
                    openRef={openDropzoneRef}
                    onDrop={handleDrop}
                    maxSize={5 * 1024 ** 2}
                    accept={['image/*']}
                    activateOnClick={false} 
                    mt="xs"
                    loading={compressing}
                    styles={{ inner: { pointerEvents: 'all' } }} 
                >
                    <Group justify="center" gap="xl" mih={180} style={{ pointerEvents: 'none' }}>
                        <Dropzone.Idle>
                             <Stack align="center" gap="xs">
                                <IconPhoto size="3.2rem" stroke={1.5} color="gray" />
                                <Text size="sm" c="dimmed">Sube una imagen</Text>
                             </Stack>
                        </Dropzone.Idle>
                    </Group>

                    <Group justify="center" mt="md" style={{ pointerEvents: 'all' }}>
                        <Button 
                            variant="filled" 
                            color="blue" 
                            leftSection={<IconPhoto size={20} />}
                            onClick={() => openDropzoneRef.current?.()}
                        >
                            Galería
                        </Button>
                        
                        <Button 
                            variant="filled" 
                            color="teal" 
                            leftSection={<IconCamera size={20} />}
                            onClick={() => cameraInputRef.current?.click()}
                        >
                            Cámara
                        </Button>
                    </Group>
                </Dropzone>
            )}

            {compressing && (
                <Center mt="md">
                    <Loader />
                    <Text ml="sm">Procesando...</Text>
                </Center>
            )}
        </Box>
    );
}