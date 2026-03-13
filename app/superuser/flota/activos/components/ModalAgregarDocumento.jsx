'use client';

import { useState, useMemo, useEffect } from 'react';
import { Modal, Button, Stack, TextInput, Select, Group, Text, Alert, LoadingOverlay, Box, Loader } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconShieldCheck, IconUpload, IconInfoCircle, IconScan, IconCheck } from '@tabler/icons-react';
import ImageDropzone from './ImageDropzone';

const DOCS_SIN_VENCIMIENTO = ["Documento de Propiedad", "Cedula Catastral"]; // Agrega los que consideres permanentes

const TODOS_LOS_DOCUMENTOS = [
    "Cedula Catastral", "Documento de Propiedad", "Permiso de Bomberos", 
    "RIF", "Derecho de Frente", "Solvencia de Aseo", "Solvencia Municipal", 
    "Solvencia de Servicios Publicos", "RACDA", "RUNSAI", "DAEX", 
    "Poliza de Seguro", "Trimestres Municipales", "ROC", "Otro"
];

const MAPA_DOCUMENTOS = {
    'Vehiculo': [
        "Documento de Propiedad", "Poliza de Seguro", "Trimestres Municipales", 
        "ROC", "RACDA", "RUNSAI", "DAEX", "Permiso de Bomberos", "Otro"
    ],
    'Remolque': [
        "Documento de Propiedad", "Poliza de Seguro", "ROC", 
        "RACDA", "RUNSAI", "DAEX", "Otro"
    ],
    'Inmueble': [
        "Documento de Propiedad", "Cedula Catastral", "Derecho de Frente", 
        "Permiso de Bomberos", "Solvencia de Aseo", "Solvencia Municipal", 
        "Solvencia de Servicios Publicos", "RIF", "Otro"
    ],
    'Maquina': ["Documento de Propiedad", "Poliza de Seguro", "Otro"],
    'Equipo estacionario': ["Documento de Propiedad", "Otro"]
};

export default function ModalAgregarDocumento({ opened, onClose, activoId, tipoActivo, codigoInterno, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [ocrLoading, setOcrLoading] = useState(false); // 🔥 ESTADO PARA LA IA

    const opcionesDocumentos = useMemo(() => {
        const opciones = MAPA_DOCUMENTOS[tipoActivo] || TODOS_LOS_DOCUMENTOS;
        return opciones.map(doc => ({ value: doc, label: doc }));
    }, [tipoActivo]);

    const form = useForm({
        initialValues: { tipo: '', numeroDocumento: '', fechaVencimiento: '', imagen: null },
        validate: {
            tipo: (value) => (!value ? 'Requerido' : null),
            fechaVencimiento: (value, values) => {
                if (DOCS_SIN_VENCIMIENTO.includes(values.tipo)) return null; // Si no vence, pasa limpio
                return !value ? 'Requerido' : null;
            },
            imagen: (value) => (!value ? 'Imagen obligatoria' : null),
        },
    });

    // 🔥 1. DETECTAR CUANDO SUBEN LA IMAGEN PARA LANZAR LA IA 🔥
    useEffect(() => {
        const file = form.values.imagen;
        if (file && typeof file !== 'string' && typeof file === 'object' && typeof file.arrayBuffer === 'function') {
            handleAnalyzeImage(file);
        }
    }, [form.values.imagen]);

    // 🔥 2. FUNCIÓN DE ANÁLISIS OCR 🔥
    const handleAnalyzeImage = async (file) => {
        setOcrLoading(true);
        notifications.show({
            id: 'ocr-status-activo', title: 'Analizando Documento...',
            message: 'La IA está extrayendo los datos...', loading: true, autoClose: false
        });

        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch("/api/ocr", { method: "POST", body: formData });
            if (!res.ok) throw new Error("Fallo al analizar imagen");

            const data = await res.json();
            console.log("IA Resultado (Activos):", data);

            // AUTOCOMPLETADO INTELIGENTE
            // Validamos que el tipo detectado pertenezca a la lista permitida para este activo
            const opcionesPermitidas = MAPA_DOCUMENTOS[tipoActivo] || TODOS_LOS_DOCUMENTOS;
            if (data.tipo && opcionesPermitidas.includes(data.tipo)) {
                form.setFieldValue('tipo', data.tipo);
            } else if (data.tipo) {
                form.setFieldValue('tipo', 'Otro'); // Fallback si la IA detecta algo raro
            }

            if (data.numeroDocumento) form.setFieldValue('numeroDocumento', data.numeroDocumento);

            if (data.fechaVencimiento) {
                // Tu input es type="date", necesita formato "YYYY-MM-DD"
                form.setFieldValue('fechaVencimiento', data.fechaVencimiento);
            }

            notifications.update({
                id: 'ocr-status-activo', title: 'Lectura Exitosa',
                message: `Detectado: ${data.tipo || 'Documento'}`,
                color: 'green', icon: <IconCheck />, loading: false, autoClose: 3000
            });
        } catch (error) {
            console.error("Error OCR:", error);
            notifications.update({
                id: 'ocr-status-activo', title: 'Lectura Manual Requerida',
                message: 'No pudimos leer los datos con claridad. Por favor, complétalos.',
                color: 'orange', loading: false, autoClose: 4000
            });
        } finally {
            setOcrLoading(false);
        }
    };

    const handleSubmit = async (values) => {
        setLoading(true);
        try {
            let imagenFilename = values.imagen;

            if (values.imagen && typeof values.imagen.arrayBuffer === 'function') {
                notifications.show({ id: 'upload-doc', title: 'Subiendo...', message: 'Guardando evidencia digital.', loading: true, autoClose: false });
                
                const ext = values.imagen.name.split('.').pop();
                
                // 🔥 2. AQUÍ ELIMINAMOS EL TIMESTAMP Y DEJAMOS EL NOMBRE LIMPIO 🔥
                // Quedará como: TRK001-Documento_de_Propiedad.jpg
                const uniqueName = `${codigoInterno}-${values.tipo.replace(/\s+/g, '_')}.${ext}`;
                
                const response = await fetch(`/api/upload?filename=${encodeURIComponent(uniqueName)}`, {
                    method: 'POST', body: values.imagen,
                });

                if (!response.ok) throw new Error('Falló la subida de la imagen.');
                
                // 👉 ¡IMPORTANTE!: Si tu /api/upload te devuelve la URL final de Vercel, es mejor guardarla completa.
                // const blobData = await response.json();
                // imagenFilename = blobData.url; // (Opcional, si prefieres guardar la URL completa en vez del nombre)

                imagenFilename = uniqueName;
                notifications.update({ id: 'upload-doc', title: '¡Listo!', message: 'Archivo subido.', color: 'green', autoClose: 2000 });
            }
            const fechaFinal = DOCS_SIN_VENCIMIENTO.includes(values.tipo) ? null : values.fechaVencimiento;

            const payload = { ...values, fechaVencimiento: fechaFinal, imagen: imagenFilename, activoId };
            const dbResponse = await fetch(`/api/gestionMantenimiento/activos/${activoId}/documentos`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
            });

            if (dbResponse.ok) {
                notifications.show({ title: 'Éxito', message: 'Documento enlazado al expediente.', color: 'green', icon: <IconShieldCheck /> });
                form.reset(); onSuccess(); onClose();
            } else { throw new Error('Error guardando en base de datos'); }
        } catch (error) { notifications.show({ title: 'Error', message: error.message, color: 'red' }); notifications.clean(); }
        finally { setLoading(false); }
    };

    return (
        <Modal opened={opened} onClose={() => { form.reset(); onClose(); }} title={<Group gap="sm"><IconShieldCheck color="#fab005" /><Text fw={900} size="lg" tt="uppercase" c="white">Nuevo Documento Legal</Text></Group>} size="md" centered overlayProps={{ blur: 4, opacity: 0.8, color: '#212529' }} styles={{ header: { backgroundColor: '#212529', borderBottom: '4px solid #fab005' }, close: { color: 'white' } }}>
            <Box pos="relative" p="xs">
                {/* 🔥 CARGADOR DUAL (Guardado y OCR) 🔥 */}
                <LoadingOverlay
                    visible={loading || ocrLoading}
                    zIndex={1000}
                    overlayProps={{ radius: "sm", blur: 2 }}
                    loaderProps={ocrLoading ? { children: <Stack align="center" gap="xs"><Loader variant="dots" color="blue.6" /><Text size="xs" fw={700}>IA Leyendo Documento...</Text></Stack> } : { color: 'yellow.6', type: 'bars' }}
                />

                <form onSubmit={form.onSubmit(handleSubmit)}>
                    <Stack gap="md">
                        {/* 🔥 ALERTA DE IA INCORPORADA 🔥 */}
                        <Alert variant="light" color="blue.7" icon={<IconScan size={20} />} radius="sm">
                            <Text size="sm" fw={600}>Sube la imagen y la <b>Inteligencia Artificial</b> intentará extraer la fecha de vencimiento y el tipo de documento automáticamente.</Text>
                        </Alert>

                        <Box>
                            <Text fw={900} size="xs" tt="uppercase" c="dark.7" mb={4}>Evidencia Digitalizada *</Text>
                            <ImageDropzone label="Subir Documento" form={form} fieldPath="imagen" />
                        </Box>

                        <Select label={<Text fw={900} size="xs" tt="uppercase" c="dark.7">Clasificación Legal</Text>} placeholder="Seleccione la categoría" data={opcionesDocumentos} withAsterisk searchable radius="sm" {...form.getInputProps('tipo')} />
                        <TextInput label={<Text fw={900} size="xs" tt="uppercase" c="dark.7">Nro. de Documento</Text>} placeholder="Opcional" radius="sm" {...form.getInputProps('numeroDocumento')} rightSection={ocrLoading ? <Loader size="xs" /> : form.values.numeroDocumento ? <IconCheck color="green" size={16} /> : null} />
                        {/* Si el documento SÍ vence, mostramos el calendario */}
                        {!DOCS_SIN_VENCIMIENTO.includes(form.values.tipo) && (
                            <TextInput
                                type="date"
                                label={<Text fw={900} size="xs" tt="uppercase" c="dark.7">Fecha de Vencimiento</Text>}
                                withAsterisk
                                radius="sm"
                                {...form.getInputProps('fechaVencimiento')}
                                rightSection={ocrLoading ? <Loader size="xs" /> : form.values.fechaVencimiento ? <IconCheck color="green" size={16} /> : null}
                            />
                        )}
                        <Group justify="flex-end" mt="xl">
                            <Button variant="subtle" color="dark.4" onClick={onClose} radius="sm" fw={700} disabled={ocrLoading}>CANCELAR</Button>
                            <Button type="submit" color="dark.9" radius="sm" fw={800} leftSection={<IconUpload size={18} color="#fab005" />} disabled={ocrLoading}>GUARDAR</Button>
                        </Group>
                    </Stack>
                </form>
            </Box>
        </Modal>
    );
}