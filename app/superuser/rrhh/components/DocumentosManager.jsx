"use client";

import { useState, useMemo, useEffect } from "react";
import {
    Paper, Group, Title, Button, Modal, Select, TextInput,
    SimpleGrid, Card, Text, Badge, Image, Stack, ActionIcon,
    Box, LoadingOverlay, Alert, Loader, ThemeIcon, Code
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import {
    IconPlus, IconTrash, IconAlertTriangle, IconAlertCircle,
    IconCalendar, IconStethoscope, IconSteeringWheel, IconId, IconScan, IconCheck, IconFileText
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useRouter } from "next/navigation";
import Tesseract from 'tesseract.js';
import ImageDropzone from "../../flota/activos/components/ImageDropzone";

const findExpirationDateInText = (rawText) => {
    if (!rawText) return null;

    // 1. Limpieza preliminar
    let text = rawText.toUpperCase()
        .replace(/O/g, '0')
        .replace(/I/g, '1')
        .replace(/L/g, '1')
        .replace(/B/g, '8')
        // Normalizar separadores raros que a veces lee el OCR (como guiones bajos o —)
        .replace(/[—_]/g, '-')
        .replace(/\./g, '-')
        .replace(/\//g, '-')
        .replace(/\s/g, '-');

    const today = new Date();
    let bestDate = null;
    let maxFutureTimestamp = 0;

    // --- ESTRATEGIA A: Fechas Completas (DD-MM-AAAA) ---
    // Busca 30-01-2025
    const fullDateRegex = /(\d{2})[\-\.]+(\d{2})[\-\.]+(\d{4})/g;

    let match;
    while ((match = fullDateRegex.exec(text)) !== null) {
        let [_, day, month, year] = match;
        const d = parseInt(day);
        const m = parseInt(month);
        const y = parseInt(year);

        if (d > 31 || m > 12 || y < 2000 || y > 2100) continue;

        const dateCandidate = new Date(y, m - 1, d);
        const timestamp = dateCandidate.getTime();

        if (timestamp > today.getTime() && timestamp > maxFutureTimestamp) {
            maxFutureTimestamp = timestamp;
            bestDate = dateCandidate;
        }
    }

    // --- ESTRATEGIA B: Fechas Cortas Cédula (MM-AAAA) ---
    // Busca 01-2035 (Aparece mucho en cédulas nuevas)
    // Usamos \b para asegurar que no sea parte de una fecha completa ya procesada
    const shortDateRegex = /\b(\d{1,2})[\-\.]+(\d{4})\b/g;

    while ((match = shortDateRegex.exec(text)) !== null) {
        let [_, month, year] = match;
        const m = parseInt(month);
        const y = parseInt(year);

        if (m > 12 || y < 2000 || y > 2100) continue;

        // IMPORTANTE: Si es MM/AAAA, asumimos que vence el ÚLTIMO día del mes
        // (y, m, 0) en JS da el último día del mes anterior, por eso usamos m (mes siguiente) con día 0
        const dateCandidate = new Date(y, m, 0);
        const timestamp = dateCandidate.getTime();

        // Comparamos: ¿Es esta fecha más lejana que la que ya encontramos?
        // En tu ejemplo: 01/2035 (futuro) ganará a 30/01/2025 (expedición)
        if (timestamp > today.getTime() && timestamp > maxFutureTimestamp) {
            maxFutureTimestamp = timestamp;
            bestDate = dateCandidate;
        }
    }

    return bestDate;
};

// --- HELPER 2: BÚSQUEDA DE CÉDULA Y RIF (Solo Números) ---
const findDocumentNumberInText = (rawText, tipoDocumento) => {
    if (!rawText) return "";

    // Limpieza suave
    let text = rawText.toUpperCase().replace(/\n/g, ' ');

    // RIF: Busca J-12345678-9 (o variantes sin guiones)
    if (tipoDocumento === 'RIF') {
        const rifRegex = /\b([VEJGP])\s*[-.]?\s*(\d{8,9})\s*[-.]?\s*(\d{1})\b/;
        const match = text.match(rifRegex);
        if (match) {
            // Retorna con formato J-12345678-9
            return `${match[1]}-${match[2]}-${match[3]}`;
        }
    }

    // CÉDULA: Busca V 23.883.618, V-23.883.618, V23883618
    // La clave es \s* para permitir espacios entre la V y el número
    const cedulaRegex = /(?:V|E)\s*[-.:]?\s*(\d{1,2})[\.\s]?(\d{3})[\.\s]?(\d{3})\b/;
    const matchCedula = text.match(cedulaRegex);

    if (matchCedula) {
        // matchCedula[0] tiene todo "V 23.883.618"
        // Lo limpiamos para dejar SOLO NÚMEROS: "23883618"
        const fullString = matchCedula[0];
        return fullString.replace(/\D/g, '');
    }

    return "";
};

// --- HELPER 3: DETECTAR TIPO DE DOCUMENTO POR PALABRAS CLAVE ---
const detectDocumentType = (rawText) => {
    if (!rawText) return null;
    const t = rawText.toUpperCase();

    // Palabras clave específicas de documentos venezolanos
    if (t.includes("LICENCIA") && t.includes("CONDUCIR")) return 'Licencia';
    if (t.includes("CERTIFICADO") && (t.includes("MEDICO") || t.includes("VIAL") || t.includes("SALUD"))) return 'CertificadoMedico';
    if (t.includes("INFORMACION FISCAL") || t.includes("SENIAT")) return 'RIF';
    // La cédula es más difícil porque casi todos los docs tienen la palabra "República" o "Identidad"
    // Pero si dice "CÉDULA DE IDENTIDAD" explícitamente y NO dice Licencia:
    if (t.includes("IDENTIDAD") || t.includes("VENEZOLANO") || t.includes("CIVIL") || t.includes("NACIMIENTO") && !t.includes("LICENCIA")) return 'Cedula';

    return null;
};

const detectGradeFromText = (rawText) => {
    if (!rawText) return null;
    const t = rawText.toUpperCase();
    const gradeRegex = /GRADO[\s:]*([3-5])/;
    const match = t.match(gradeRegex);
    if (match) {
        return match[1];
    }
    return null;
}


export default function DocumentosManager({ empleadoId, documentos = [], puestos = [] }) {
    const router = useRouter();
    const [opened, setOpened] = useState(false);
    const [loading, setLoading] = useState(false);
    const [ocrLoading, setOcrLoading] = useState(false);

    // Estado para mostrar log en pantalla (opcional, para depurar)

    const form = useForm({
        initialValues: {
            tipo: 'Licencia',
            gradoLicencia: null,
            numeroDocumento: '',
            fechaVencimiento: null,
            imagen: null
        },
        validate: {
            fechaVencimiento: (value) => value ? null : 'La fecha de vencimiento es obligatoria',
            gradoLicencia: (value, values) =>
                (values.tipo === 'Licencia' || values.tipo === 'CertificadoMedico') && !value
                    ? 'El grado es requerido' : null,
            tipo: (value) => value ? null : 'Tipo requerido'
        }
    });

    // Detectar si es Chofer
    const esChofer = useMemo(() => {
        if (!puestos || puestos.length === 0) return false;
        // Busca si alguno de los puestos contiene la palabra "chofer" o "conductor" (ignorando mayúsculas)
        return puestos.some(p => {
            const nombrePuesto = typeof p === 'string' ? p : p.nombre || '';
            return /chofer|conductor|transportista/i.test(nombrePuesto);
        });
    }, [puestos]);

    // Escuchar cambios en la imagen para OCR
    useEffect(() => {
        const file = form.values.imagen;
        if (file && typeof file !== 'string' && typeof file === 'object' && typeof file.arrayBuffer === 'function') {
            handleAnalyzeImage(file);
        }
    }, [form.values.imagen]);

    // --- ANÁLISIS OCR ---
    const handleAnalyzeImage = async (file) => {
        setOcrLoading(true);

        notifications.show({
            id: 'ocr-status', title: 'Leyendo documento...',
            message: 'Extrayendo texto para buscar fechas y números...',
            loading: true, autoClose: false
        });

        try {
            const result = await Tesseract.recognize(
                file,
                'spa', // Usar español
                {
                    logger: m => {
                        // Opcional: ver progreso en consola
                        if (m.status === 'recognizing text') console.log(`Progreso OCR: ${(m.progress * 100).toFixed(0)}%`);
                    }
                }
            );

            const rawText = result.data.text;
            console.log("Texto extraído por OCR:", rawText);

            // --- NUEVA LÓGICA DE AUTODETECCIÓN ---
            const detectedType = detectDocumentType(rawText);

            console.log("Documento detectado como:", detectedType);

            // Si detectamos un tipo distinto al seleccionado, lo cambiamos y avisamos
            if (detectedType && detectedType !== form.values.tipo) {
                console.log(`Auto-corrigiendo tipo de documento a: ${detectedType}`);

                form.setFieldValue('tipo', detectedType);

                // Si cambiamos a Licencia o Certificado, aseguramos que el grado no quede nulo
                if ((detectedType === 'Licencia' || detectedType === 'CertificadoMedico') && !form.values.gradoLicencia) {
                    form.setFieldValue('gradoLicencia', detectGradeFromText(rawText) || "5"); // Sugerir 5ta por defecto
                }

                notifications.show({
                    title: 'Tipo de documento corregido',
                    message: `Parece que subiste una ${detectedType}. Hemos ajustado el formulario.`,
                    color: 'blue',
                    icon: <IconScan size={16} />
                });
            }
            // -------------------------------------

            // 1. Buscar Fecha (Usando el helper mejorado que te di antes)
            const detectedDate = findExpirationDateInText(rawText);

            // 2. Buscar Número (Usamos detectedType si existe, si no el del form)
            const typeToSearch = detectedType || form.values.tipo;
            const detectedNumber = findDocumentNumberInText(rawText, typeToSearch);
            if (detectedType === 'Licencia') {
                const detectedGrade = detectGradeFromText(rawText);
                if (detectedGrade) {
                    form.setFieldValue('gradoLicencia', detectedGrade);
                }
            }

            // 3. Actualizar Formulario
            let mensajeExito = [];

            if (detectedDate) {
                form.setFieldValue('fechaVencimiento', detectedDate);
                mensajeExito.push(`Fecha: ${detectedDate.toLocaleDateString()}`);
            }
            if (detectedNumber) {
                form.setFieldValue('numeroDocumento', detectedNumber);
                mensajeExito.push(`Doc: ${detectedNumber}`);
            }

            // 4. Feedback al usuario
            if (mensajeExito.length > 0) {
                notifications.update({
                    id: 'ocr-status', title: 'Datos detectados',
                    message: `Se rellenó automáticamente: ${mensajeExito.join(', ')}`,
                    color: 'green', icon: <IconCheck />, loading: false, autoClose: 5000
                });
            } else {
                notifications.update({
                    id: 'ocr-status', title: 'Análisis terminado',
                    message: 'No se encontraron datos claros. Por favor rellena manualmente.',
                    color: 'orange', icon: <IconAlertCircle />, loading: false, autoClose: 4000
                });
            }

        } catch (error) {
            console.error("OCR Error:", error);
            notifications.update({
                id: 'ocr-status', title: 'Error OCR',
                message: 'No se pudo procesar la imagen.',
                color: 'red', loading: false, autoClose: 3000
            });
        } finally {
            setOcrLoading(false);
        }
    };

    // --- REVISIÓN DE FALTANTES ---
    const faltantes = useMemo(() => {
        const docs = documentos || [];
        const missing = [];

        // 1. Reglas generales para TODOS
        if (!docs.some(d => d.tipo === 'Cedula')) missing.push('Cédula');
        if (!docs.some(d => d.tipo === 'RIF')) missing.push('RIF');

        // 2. Reglas SOLO para CHOFERES
        if (esChofer) {
            if (!docs.some(d => d.tipo === 'Licencia' && String(d.gradoLicencia) === '5')) missing.push('Licencia 5°');
            if (!docs.some(d => d.tipo === 'CertificadoMedico' && String(d.gradoLicencia) === '5')) missing.push('Cert. Médico 5°');
        }

        return missing;
    }, [documentos, esChofer]);

    // ... (El resto de funciones handleUploadImage, handleSubmit, handleEliminar son iguales) ...
    const handleUploadImage = async (file) => {
        const filename = `${empleadoId}-${Date.now()}.${file.name.split('.').pop()}`;
        const response = await fetch(`/api/upload?filename=${filename}`, { method: 'POST', body: file });
        const blob = await response.json();
        return blob.url;
    };

    const handleSubmit = async (values) => {
        setLoading(true);
        try {

            let payload = {
                empleadoId,
                ...values,
                fechaVencimiento: values.fechaVencimiento.toISOString().split('T')[0]
            };

            if (values.imagen && typeof values.imagen.arrayBuffer === 'function') {
                notifications.show({ id: 'uploading-image', title: 'Subiendo imagen...', message: 'Por favor espera.', loading: true });
                const imagenFile = values.imagen;
                const fileExtension = imagenFile.name.split('.').pop();
                const uniqueFilename = `${empleadoId}${values.tipo.replace(/\s+/g, '_')}${values.gradoLicencia || ""}.${fileExtension}`;

                const response = await fetch(`/api/upload?filename=${encodeURIComponent(uniqueFilename)}`, {
                    method: 'POST',
                    body: imagenFile,
                });

                if (!response.ok) console.log('Falló la subida de la imagen. Probablemente ya exista una con ese nombre.');
                const newBlob = await response.json();
                payload.imagen = `${empleadoId}${values.tipo.replace(/\s+/g, '_')}${values.gradoLicencia || ""}.${fileExtension}`;
                notifications.update({ id: 'uploading-image', title: 'Éxito', message: 'Imagen subida.', color: 'green' });
            }

            const res = await fetch('/api/rrhh/documentos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error("Error guardando documento");

            notifications.show({ message: 'Documento registrado', color: 'green' });
            setOpened(false);
            form.reset();
            form.setValues({ tipo: 'Licencia', gradoLicencia: '5', numeroDocumento: '', fechaVencimiento: null, imagen: null });
            router.refresh();

        } catch (error) {
            console.error(error);
            notifications.show({ message: 'Error al guardar', color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    const handleEliminar = async (id) => {
        if (!confirm("¿Borrar documento permanentemente?")) return;
        try {
            await fetch(`/api/rrhh/documentos?id=${id}`, { method: 'DELETE' });
            router.refresh();
        } catch (error) { console.error(error); }
    };

    const getIcon = (tipo) => {
        if (tipo === 'Licencia') return <IconSteeringWheel size={20} />;
        if (tipo === 'CertificadoMedico') return <IconStethoscope size={20} />;
        return <IconId size={20} />;
    };

    const isVencido = (fecha) => new Date(fecha) < new Date();

    return (
        <Paper withBorder p="md" radius="md" mt="lg">
            <Group justify="space-between" mb="md">
                <Group gap="xs">
                    <Title order={4}>Documentación Legal</Title>
                    {esChofer && <Badge color="orange" variant="light">Perfil Chofer</Badge>}
                </Group>

                <Button
                    size="xs" leftSection={<IconPlus size={16} />}
                    onClick={() => {
                        const tipoSugerido = faltantes.length > 0 ? (
                            faltantes.includes('Licencia 5°') ? 'Licencia' :
                                faltantes.includes('Cert. Médico 5°') ? 'CertificadoMedico' :
                                    faltantes.includes('Cédula') ? 'Cedula' : 'Licencia'
                        ) : 'Licencia';

                        form.setFieldValue('tipo', tipoSugerido);
                        setOpened(true);
                    }}
                >
                    Agregar Documento
                </Button>
            </Group>

            {faltantes.length > 0 && (
                <Alert variant="light" color="red" title="Documentación Incompleta" icon={<IconAlertCircle />} mb="md">
                    <Stack gap={4}>
                        <Text size="sm">Faltan los siguientes documentos obligatorios{esChofer ? " para el puesto de Chofer" : ""}:</Text>
                        <Group gap="xs">
                            {faltantes.map(f => <Badge key={f} color="red" variant="dot">{f}</Badge>)}
                        </Group>
                    </Stack>
                </Alert>
            )}

            {documentos.length === 0 ? (
                <Paper withBorder p="xl" bg="gray.0" ta="center">
                    <ThemeIcon size={60} radius="md" variant="light" color="blue" mb="md"><IconId size={40} /></ThemeIcon>
                    <Title order={5}>Legajo Digital Vacío</Title>
                    <Text c="dimmed" size="sm" mb="md">Carga los documentos obligatorios.</Text>
                    <Button onClick={() => setOpened(true)}>Cargar Primer Documento</Button>
                </Paper>
            ) : (
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
                    {documentos.map((doc) => {
                        const vencido = isVencido(doc.fechaVencimiento);
                        const esGrado = doc.tipo === 'Licencia' || doc.tipo === 'CertificadoMedico';

                        return (
                            <Card key={doc.id} padding="sm" radius="md" withBorder style={{ borderColor: vencido ? 'red' : undefined }}>
                                {/* ... (Contenido de la tarjeta igual que antes) ... */}
                                <Group justify="space-between" mb="xs">
                                    <Group gap={5}>
                                        <Badge
                                            color={doc.tipo === 'Licencia' ? 'blue' : doc.tipo === 'CertificadoMedico' ? 'teal' : 'gray'}
                                            variant="light"
                                            leftSection={getIcon(doc.tipo)}
                                        >
                                            {doc.tipo === 'CertificadoMedico' ? 'Cert. Médico' : doc.tipo}
                                        </Badge>
                                        {esGrado && doc.gradoLicencia && <Badge color="dark" variant="filled" size="sm">{doc.gradoLicencia}°</Badge>}
                                    </Group>
                                    <ActionIcon color="red" variant="subtle" size="sm" onClick={() => handleEliminar(doc.id)}><IconTrash size={14} /></ActionIcon>
                                </Group>

                                <Box bg="gray.1" style={{ borderRadius: 8, overflow: 'hidden', height: 120, position: 'relative' }} mb="sm">
                                    <Stack align="center" justify="center" h="100%">
                                        {doc.imagen ? (
                                            <Image src={process.env.NEXT_PUBLIC_BLOB_BASE_URL + "/" + doc.imagen} fit="contain" h="100%" w="100%" alt="Doc" />
                                        ) : (
                                            <>
                                                {getIcon(doc.tipo)}
                                                <Text size="xs" c="dimmed">Sin Imagen</Text>
                                            </>
                                        )}
                                    </Stack>
                                    {vencido && (
                                        <Box style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(255,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Badge color="red" variant="filled">VENCIDO</Badge>
                                        </Box>
                                    )}
                                </Box>

                                <Stack gap={2}>
                                    <Group justify="space-between">
                                        <Text size="xs" c="dimmed" fw={700} tt="uppercase">Vencimiento</Text>
                                        {vencido && <IconAlertTriangle size={14} color="red" />}
                                    </Group>
                                    <Text size="sm" fw={700} c={vencido ? 'red' : 'dark'}>{doc.fechaVencimiento}</Text>
                                    {doc.numeroDocumento && (
                                        <Text size="xs" c="dimmed" mt={4}>Ref: {doc.numeroDocumento}</Text>
                                    )}
                                </Stack>
                            </Card>
                        );
                    })}
                </SimpleGrid>
            )}

            {/* MODAL FORMULARIO */}
            <Modal opened={opened} onClose={() => { setOpened(false); form.reset(); }} title="Registrar Documento" centered size="md">
                <form onSubmit={form.onSubmit(handleSubmit)}>
                    <Stack pos="relative">
                        <LoadingOverlay visible={loading || ocrLoading} overlayProps={{ blur: 2 }}
                            loaderProps={ocrLoading ? { children: <Stack align="center" gap="xs"><Loader variant="dots" /><Text size="xs" fw={700}>Analizando documento...</Text></Stack> } : undefined}
                        />

                        <Alert variant="light" color="blue" title="Lectura Inteligente" icon={<IconScan size={16} />}>
                            <Text size="xs">Sube la imagen para detectar automáticamente Fechas, Cédulas y RIFs.</Text>
                        </Alert>





                        <ImageDropzone
                            label="Subir Imagen del Documento"
                            form={form}
                            fieldPath="imagen"
                        />

                        {form.values.imagen && (
                            <>
                                <Group grow align="flex-start">
                                    <Select
                                        label="Tipo"
                                        data={[
                                            { value: 'Licencia', label: 'Licencia' },
                                            { value: 'CertificadoMedico', label: 'Cert. Médico' },
                                            { value: 'Cedula', label: 'Cédula' },
                                            { value: 'RIF', label: 'RIF' },
                                            { value: 'Otro', label: 'Otro' },
                                        ]}
                                        {...form.getInputProps('tipo')}
                                    />
                                    {(form.values.tipo === 'Licencia' || form.values.tipo === 'CertificadoMedico') && (
                                        <Select
                                            label="Grado"
                                            data={['3', '4', '5']}
                                            withAsterisk
                                            {...form.getInputProps('gradoLicencia')}
                                        />
                                    )}
                                </Group>

                                <TextInput
                                    label="Número de Documento"
                                    description="Se intentará leer de la imagen"
                                    placeholder="C.I. o RIF o Serial"
                                    rightSection={ocrLoading ? <Loader size="xs" /> : form.values.numeroDocumento ? <IconCheck color="green" size={16} /> : null}
                                    {...form.getInputProps('numeroDocumento')}
                                />

                                <DateInput
                                    label="Fecha de Vencimiento"
                                    description="Detectada automáticamente si es legible"
                                    placeholder={ocrLoading ? "Analizando..." : "DD/MM/AAAA"}
                                    valueFormat="DD/MM/YYYY"
                                    withAsterisk
                                    rightSection={ocrLoading ? <Loader size="xs" /> : form.values.fechaVencimiento ? <IconCheck color="green" size={16} /> : null}
                                    {...form.getInputProps('fechaVencimiento')}
                                />

                            </>
                        )}


                        <Button fullWidth mt="md" type="submit" loading={loading} disabled={ocrLoading}>
                            Guardar Documento
                        </Button>
                    </Stack>
                </form>
            </Modal>
        </Paper>
    );
}