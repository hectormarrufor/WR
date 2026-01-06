// app/superuser/flota/modelos/components/ModeloActivoForm.jsx
'use client';

import { useEffect, useState } from 'react';
import {
    TextInput, NumberInput, Select, Button, Group,
    Stack, LoadingOverlay, Divider, Text, ActionIcon, Paper, SimpleGrid,
    Accordion,
    Badge
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconDeviceFloppy, IconPlus, IconTrash, IconSitemap, IconTool } from '@tabler/icons-react';
import { AsyncCatalogComboBox } from '@/app/components/CatalogCombobox';
import ConsumibleSelector from './ConsumibleSelector';
import ImageDropzone from '../../activos/components/ImageDropzone';


export default function ModeloActivoForm({
    tipoPreseleccionado = 'Vehiculo',
    onSuccess,
    onCancel
}) {
    const [loading, setLoading] = useState(false);

    // Estado para la lista dinámica de subsistemas
    const [subsistemas, setSubsistemas] = useState([]);

    const form = useForm({
        initialValues: {
            marca: null,
            modelo: '',
            anio: new Date().getFullYear(),
            tipoVehiculo: '',
            tipoRemolque: '',
            tipoMaquina: '',
            ejes: 2,
            imagen: '',
            peso: '',
            tipoCombustible: '',
            capacidadArrastre: '',
            pesoMaximoCombinado: '',
        },
        validate: {
            marca: (val) => (!val ? 'La marca es obligatoria' : null),
            modelo: (val) => (tipoPreseleccionado !== 'Remolque' && !val ? 'El modelo es obligatorio' : null),
        }
    });

    useEffect(() => {
        console.log('Form values changed: ', form.values);
    }, [form.values]);


    // Helpers para la lista de subsistemas
    const addSubsistema = () => {
        setSubsistemas([...subsistemas, {
            nombre: '',
            descripcion: '',
            recomendaciones: [] // Array de IDs de consumibles (SKUs)
        }]);
    };

    const removeSubsistema = (index) => {
        const updated = [...subsistemas];
        updated.splice(index, 1);
        setSubsistemas(updated);
    };

    const updateSubsistema = (index, field, value) => {
        const updated = [...subsistemas];
        updated[index][field] = value;
        setSubsistemas(updated);
    };



    const handleSubmit = async (values) => {
        setLoading(true);
        try {
            // 1. CREAR LA PLANTILLA BASE
            let endpoint = '';
            let payload = {
                marca: values.marca,
                anio: values.anio,
            };

            if (tipoPreseleccionado === 'Vehiculo') {
                if (values.imagen && typeof values.imagen.arrayBuffer === 'function') {
                    notifications.show({ id: 'uploading-image', title: 'Subiendo imagen...', message: 'Por favor espera.', loading: true });
                    const imagenFile = values.imagen;
                    const fileExtension = imagenFile.name.split('.').pop();
                    const uniqueFilename = `${values.marca.replace(/\s+/g, '_')}${values.modelo.replace(/\s+/g, '_')}${values.anio.toString().replace(/\s+/g, '_')}.${fileExtension}`;

                    const response = await fetch(`/api/upload?filename=${encodeURIComponent(uniqueFilename)}`, {
                        method: 'POST',
                        body: imagenFile,
                    });

                    if (!response.ok) console.log('Falló la subida de la imagen. Probablemente ya exista una con ese nombre.');
                    const newBlob = await response.json();
                    payload.imagen = `${values.marca.replace(/\s+/g, '_')}${values.modelo.replace(/\s+/g, '_')}${values.anio.toString().replace(/\s+/g, '_')}.${fileExtension}`;
                    notifications.update({ id: 'uploading-image', title: 'Éxito', message: 'Imagen subida.', color: 'green' });
                }
                endpoint = '/api/gestionMantenimiento/vehiculo';
                payload = { ...payload, modelo: values.modelo, tipoVehiculo: values.tipoVehiculo, numeroEjes: values.ejes, peso: values.peso, tipoCombustible: values.tipoCombustible, capacidadArrastre: values.capacidadArrastre, pesoMaximoCombinado: values.pesoMaximoCombinado};
            }
            else if (tipoPreseleccionado === 'Remolque') {
                endpoint = '/api/gestionMantenimiento/remolque';
                payload = { ...payload, tipoRemolque: values.tipoRemolque, numeroEjes: values.ejes, capacidad: values.capacidadCarga };
            }
            else if (tipoPreseleccionado === 'Maquina') {
                endpoint = '/api/gestionMantenimiento/maquina';
                payload = { ...payload, modelo: values.modelo, tipoMaquina: values.tipoMaquina };
            }

            // AHORA ENVIAMOS TODO JUNTO EN EL PAYLOAD DEL MODELO
            // Para simplificar transacciones, es mejor que el endpoint de crear modelo
            // reciba también los subsistemas. Si tu endpoint actual no lo soporta,
            // tendremos que hacerlo en pasos como antes. 
            // VOY A ASUMIR EL MÉTODO DE 2 PASOS que usamos antes, pero mejorado.

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const res = await response.json();

            if (!res.success) throw new Error(res.error || 'No se pudo crear el modelo');

            const nuevoModeloId = res.data.id;

            // 2. CREAR SUBSISTEMAS + RECOMENDACIONES
            // Ahora enviamos no solo nombre, sino también la lista de compatibilidad
            if (subsistemas.length > 0) {
                const validos = subsistemas.filter(s => s.nombre.trim() !== '');

                if (validos.length > 0) {
                    await Promise.all(validos.map(sub =>
                        fetch('/api/gestionMantenimiento/subsistemas', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                nombre: sub.nombre,
                                descripcion: sub.descripcion,
                                plantillaId: nuevoModeloId,
                                tipoPlantilla: tipoPreseleccionado,
                                // NUEVO CAMPO: Array de IDs de Consumibles
                                recomendacionesIds: sub.recomendaciones.map(Number)
                            })
                        })
                    ));
                }
            }

            notifications.show({ title: 'Éxito', message: 'Modelo configurado correctamente', color: 'green' });
            if (onSuccess) onSuccess(res.data);

        } catch (error) {
            console.error(error);
            notifications.show({ title: 'Error', message: error.message, color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Stack pos="relative" mah="80vh" style={{ overflowY: 'auto' }}>
            <LoadingOverlay visible={loading} />

            <form onSubmit={form.onSubmit(handleSubmit)}>
                <Stack gap="md">
                    {/* --- DATOS GENERALES --- */}
                    <AsyncCatalogComboBox
                        label="Marca"
                        placeholder="Buscar o crear marca..."
                        form={form}
                        fieldKey="marca"
                        catalogo="marcas"
                        tipo='vehiculo'
                    />

                    <AsyncCatalogComboBox
                        label="Modelo"
                        placeholder="Buscar o crear modelo..."
                        form={form}
                        fieldKey="modelo"
                        catalogo="modelos"
                        tipo='vehiculo'
                    />

                    <Group grow>
                        <NumberInput label="Año" min={1980} max={2030} {...form.getInputProps('anio')} />

                        {(tipoPreseleccionado === 'Vehiculo' || tipoPreseleccionado === 'Remolque') && (
                            <NumberInput label="Nro. Ejes" min={1} max={12} {...form.getInputProps('ejes')} />
                        )}
                    </Group>

                    {tipoPreseleccionado === 'Vehiculo' && (
                        <>
                            <Select
                                label="Tipo de Vehículo"
                                placeholder="Seleccione..."
                                data={['Chuto', 'Carro', 'Camioneta', 'Moto', 'Bus', "Van", "Volqueta", "Camion"]}
                                {...form.getInputProps('tipoVehiculo')}
                            />
                            <ImageDropzone
                                label="Imagen del Vehículo (opcional)"
                                form={form} fieldPath="imagen"
                            />
                            <NumberInput
                                label="Peso Maximo Combinado (GCWR) (tons)"
                                placeholder="ej. 36.5"
                                {...form.getInputProps('pesoMaximoCombinado')}
                            />
                        </>
                    )}

                    {tipoPreseleccionado === 'Remolque' && (
                        <Select
                            label="Tipo de Remolque"
                            placeholder="Seleccione..."
                            required
                            data={['Batea', 'Plataforma', 'Lowboy', 'Cisterna', 'Vaccum', 'Tolva']}
                            {...form.getInputProps('tipoRemolque')}
                        />
                    )}

                    {tipoPreseleccionado === 'Maquina' && (
                        <>
                            <Select
                                label="Tipo de Máquina"
                                placeholder="Seleccione..."
                                data={['Retroexcavadora', 'Excavadora', 'Payloader', 'Motoniveladora', 'Vibrocompactador', 'Grúa', 'Montacargas', 'Planta Eléctrica', 'Taladro']}
                                {...form.getInputProps('tipoMaquina')}
                            />
                            <Select
                                label="Tipo de Tracción"
                                placeholder="Seleccione..."
                                data={['oruga', 'ruedas']}
                                {...form.getInputProps('traccion')}
                            />
                            <NumberInput
                                {...form.getInputProps('capacidadLevante')}
                                label="Capacidad de Levante (tons) (opcional)"
                                placeholder="Seleccione..."
                                min={0}
                                step={0.5}
                            />
                            <NumberInput
                                {...form.getInputProps('capacidadCucharon')}
                                label="Capacidad de Cucharón (m³) (opcional)"
                                placeholder="Seleccione..."
                                min={0}
                                step={0.1}
                            />
                            <NumberInput
                                {...form.getInputProps('alcanceMaximo')}
                                label="Alcance Máximo (mts) (opcional)"
                                placeholder="Seleccione..."
                                min={0}
                                step={0.5}
                            />
                        </>
                    )}

                    {(tipoPreseleccionado === 'Remolque' || tipoPreseleccionado === 'Vehiculo') && (
                        <>
                            <TextInput
                                label="Peso (tons) (opcional)"
                                placeholder="ej. 15.5"
                                {...form.getInputProps('peso')}
                                />
                                <TextInput
                                label="Capacidad de Arrastre (tons) (opcional)"
                                placeholder="ej. 15.5"
                                {...form.getInputProps('capacidadArrastre')}
                            />
                            <Select
                                label="Tipo de Combustible"
                                placeholder="Seleccione..."
                                data={['Gasolina', 'Diesel', 'Eléctrico', 'Híbrido', "Gas"]}
                                {...form.getInputProps('tipoCombustible')}
                            />
                        </>
                    )}


                    <Divider my="sm" />

                    {/* --- SECCIÓN SUBSISTEMAS AVANZADA --- */}
                    <Paper withBorder p="md" bg="gray.0">
                        <Group justify="space-between" mb="sm">
                            <Group gap={5}>
                                <IconSitemap size={18} />
                                <Text fw={600} size="sm">Definición de Subsistemas y Partes</Text>
                            </Group>
                            <Button variant="subtle" size="xs" leftSection={<IconPlus size={14} />} onClick={addSubsistema}>
                                Agregar
                            </Button>
                        </Group>

                        {subsistemas.length === 0 ? (
                            <Text size="xs" c="dimmed" align="center">Sin subsistemas definidos.</Text>
                        ) : (
                            <Accordion variant="separated" radius="md">
                                {subsistemas.map((sub, index) => (
                                    <Accordion.Item key={index} value={`item-${index}`} bg="white">
                                        <Accordion.Control icon={<IconTool size={16} />}>
                                            <Group justify="space-between" w="100%" pr="md">
                                                <Text fw={500}>{sub.nombre || '(Nuevo Sistema)'}</Text>
                                                {sub.recomendaciones.length > 0 && (
                                                    <Badge size="sm" variant="light">{sub.recomendaciones.length} Partes</Badge>
                                                )}
                                            </Group>
                                        </Accordion.Control>
                                        <Accordion.Panel>
                                            <Stack gap="sm">
                                                <Group grow>
                                                    <TextInput
                                                        label="Nombre"
                                                        placeholder="ej. Motor"
                                                        value={sub.nombre}
                                                        onChange={(e) => updateSubsistema(index, 'nombre', e.currentTarget.value)}
                                                    />
                                                    <TextInput
                                                        label="Descripción"
                                                        placeholder="ej. ISX 450HP"
                                                        value={sub.descripcion}
                                                        onChange={(e) => updateSubsistema(index, 'descripcion', e.currentTarget.value)}
                                                    />
                                                </Group>

                                                {/* AQUÍ ESTÁ LA MAGIA: SELECTOR DE CONSUMIBLES */}
                                                <ConsumibleSelector
                                                    value={sub.recomendaciones}
                                                    onChange={(val) => updateSubsistema(index, 'recomendaciones', val)}
                                                />

                                                <Group justify="right" mt="xs">
                                                    <Button
                                                        color="red" variant="subtle" size="xs"
                                                        leftSection={<IconTrash size={14} />}
                                                        onClick={() => removeSubsistema(index)}
                                                    >
                                                        Eliminar Subsistema
                                                    </Button>
                                                </Group>
                                            </Stack>
                                        </Accordion.Panel>
                                    </Accordion.Item>
                                ))}
                            </Accordion>
                        )}
                    </Paper>

                    <Divider my="sm" />

                    <Group justify="right">
                        <Button variant="default" onClick={onCancel}>Cancelar</Button>
                        <Button type="submit" leftSection={<IconDeviceFloppy size={18} />}>
                            Guardar Modelo Completo
                        </Button>
                    </Group>
                </Stack>
            </form>
        </Stack>
    );
}