// app/superuser/flota/modelos/components/ModeloActivoForm.jsx
'use client';

import { useEffect, useState } from 'react';
import {
    TextInput, NumberInput, Select, Button, Group,
    Stack, LoadingOverlay, Divider, Text, ActionIcon, Paper, SimpleGrid,
    Accordion, Checkbox,
    Alert, Badge
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconDeviceFloppy, IconPlus, IconTrash, IconSitemap, IconTool, IconInfoCircle } from '@tabler/icons-react';
import { AsyncCatalogComboBox } from '@/app/components/CatalogCombobox';
import ImageDropzone from '../../activos/components/ImageDropzone';
import ConsumibleRecomendadoCreator from './ConsumibleRecomendadoCreator';


export default function ModeloActivoForm({
    tipoPreseleccionado = 'Vehiculo',
    initialValues = null,
    isEdit = false,
    id = null,
    onSuccess,
    onCancel
}) {
    const [loading, setLoading] = useState(false);
    const [propagarCambios, setPropagarCambios] = useState(false);

    // Estado para la lista dinámica de subsistemas
    const [subsistemas, setSubsistemas] = useState([]);

    const form = useForm({
        initialValues: initialValues || {
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

    // Efecto para actualizar el form si initialValues llega tarde (asincrono)
    useEffect(() => {
        if (initialValues) {
            form.setValues(initialValues);
            // Si manejas estados locales aparte del form (ej: steps), actualízalos aquí
        }
    }, [initialValues]);

    useEffect(() => {
        console.log('Form values changed: ', form.values);
        setSubsistemas(form.values.subsistemas || []);
    }, [form.values]);

    useEffect(() => {
        console.log("Subsistemas", subsistemas)

    }, [subsistemas])



    // Helpers para la lista de subsistemas
    const addSubsistema = () => {
        setSubsistemas([...subsistemas, {
            nombre: '',
            categoria: '',
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
                endpoint = initialValues ? `/api/gestionMantenimiento/vehiculo/${id}` : '/api/gestionMantenimiento/vehiculo';
                payload = { ...payload, modelo: values.modelo, tipoVehiculo: values.tipoVehiculo, numeroEjes: values.ejes, peso: values.peso, tipoCombustible: values.tipoCombustible, capacidadArrastre: values.capacidadArrastre, pesoMaximoCombinado: values.pesoMaximoCombinado };
            }
            else if (tipoPreseleccionado === 'Remolque') {
                endpoint = initialValues ? `/api/gestionMantenimiento/remolque/${id}` : '/api/gestionMantenimiento/remolque';
                payload = { ...payload, modelo: values.modelo, anio: values.anio, imagen: values.imagen, tipoRemolque: values.tipoRemolque, nroEjes: values.ejes, peso: values.peso, capacidadCarga: values.capacidadCarga };
            }
            else if (tipoPreseleccionado === 'Maquina') {
                endpoint = initialValues ? `/api/gestionMantenimiento/maquina/${id}` : '/api/gestionMantenimiento/maquina';
                payload = { ...payload, modelo: values.modelo, tipoMaquina: values.tipoMaquina };
            }

            payload.subsistemas = subsistemas

            if (initialValues) {
                payload.propagar = propagarCambios;
            }

            // AHORA ENVIAMOS TODO JUNTO EN EL PAYLOAD DEL MODELO
            // Para simplificar transacciones, es mejor que el endpoint de crear modelo
            // reciba también los subsistemas. Si tu endpoint actual no lo soporta,
            // tendremos que hacerlo en pasos como antes. 
            // VOY A ASUMIR EL MÉTODO DE 2 PASOS que usamos antes, pero mejorado.

            const response = await fetch(endpoint, {
                method: initialValues ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const res = await response.json();

            if (!res.success) throw new Error(res.error || 'No se pudo crear el modelo');

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

                    {tipoPreseleccionado === 'Vehiculo' && (
                        <>
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
                                <NumberInput label="Año" min={1980} max={new Date().getFullYear()} {...form.getInputProps('anio')} />
                                <NumberInput label="Nro. Ejes" min={1} max={12} {...form.getInputProps('ejes')} />
                            </Group>
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
                        <>
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
                                <NumberInput label="Año" min={1980} max={new Date().getFullYear()} {...form.getInputProps('anio')} />
                                <NumberInput label="Nro. Ejes" min={1} max={12} {...form.getInputProps('ejes')} />
                            </Group>
                            <Select
                                label="Tipo de Remolque"
                                placeholder="Seleccione..."
                                required
                                data={['Batea', 'Plataforma', 'Lowboy', 'Cisterna', 'Vaccum', 'Tolva']}
                                {...form.getInputProps('tipoRemolque')}
                            />
                        </>
                    )}

                    {/* CASO 2: INMUEBLES (Nuevo) */}
                    {tipoPreseleccionado === 'Inmueble' && (
                        <>
                            <TextInput
                                label="Tipo de Edificación"
                                placeholder="Galpón, Oficina, Terreno..."
                                {...form.getInputProps('tipoInmueble')}
                            />
                            <NumberInput
                                label="Metros Cuadrados (m²)"
                                {...form.getInputProps('area')}
                            />
                        </>
                    )}

                    {/* CASO 3: EQUIPOS (Aires, Bombas - Nuevo) */}
                    {tipoPreseleccionado === 'Equipo' && (
                        <>
                            <AsyncCatalogComboBox
                                label="Marca"
                                catalogo="marcas"
                                form={form} fieldKey="marca"
                            />
                            <TextInput
                                label="Especificación Técnica"
                                placeholder="Ej: 18000 BTU, 1HP, 220V"
                                {...form.getInputProps('especificacion')}
                            />
                        </>
                    )}

                    {tipoPreseleccionado === 'Maquina' && (
                        <>
                            <NumberInput label="Año" min={1980} max={new Date().getFullYear()} {...form.getInputProps('anio')} />
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
                            <Select
                                label="Tipo de Combustible"
                                placeholder="Seleccione..."
                                data={['Gasolina', 'Diesel', 'Eléctrico', 'Híbrido', "Gas"]}
                                {...form.getInputProps('tipoCombustible')}
                            />
                        </>
                    )}

                    {(tipoPreseleccionado === 'Remolque' || tipoPreseleccionado === 'Vehiculo') && (
                        <>
                            <NumberInput
                                label="Peso (tons) (opcional)"
                                placeholder="ej. 15.5"
                                {...form.getInputProps('peso')}
                            />
                            <NumberInput
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
                                                <Group bg='lightgray' p={10} grow>
                                                    <TextInput
                                                        label="Nombre"
                                                        placeholder="ej. Motor"
                                                        value={sub.nombre}
                                                        onChange={(e) => updateSubsistema(index, 'nombre', e.currentTarget.value)}
                                                    />
                                                    <Select
                                                        label="Categoría"
                                                        placeholder="Seleccione..."
                                                        data={[
                                                            'motor', 'transmision', 'frenos', 'tren de rodaje', 'suspension', 'electrico', 'iluminacion', 'sistema de escape', 'sistema hidraulico', 'sistema de direccion', 'sistema de combustible', 'otros'
                                                        ]}
                                                        value={sub.categoria}
                                                        onChange={(val) => updateSubsistema(index, 'categoria', val)}
                                                    />
                                                </Group>

                                                {/* AQUÍ ESTÁ LA MAGIA: SELECTOR DE CONSUMIBLES */}
                                                <ConsumibleRecomendadoCreator
                                                    value={sub.recomendaciones}
                                                    onChange={(newRecs) => updateSubsistema(index, 'recomendaciones', newRecs)}
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
                    {initialValues && ( // Solo mostrar en modo EDICIÓN
                        <Paper withBorder p="md" bg="blue.0" mt="md">
                            <Group align="flex-start">
                                <IconInfoCircle color="blue" size={24} />
                                <Stack gap="xs" style={{ flex: 1 }}>
                                    <Text size="sm" fw={700} c="blue">¿Propagar cambios a la flota activa?</Text>
                                    <Text size="xs" c="blue.8">
                                        Si marcas esta casilla, los nuevos subsistemas que hayas agregado se crearán
                                        automáticamente en todos los vehículos que usen este modelo ({form.values.marca} {form.values.modelo}).
                                        Si eliminaste alguno, también se borrará de los vehículos.
                                    </Text>
                                    <Checkbox
                                        label="Sí, aplicar cambios a todos los activos vinculados a este modelo"
                                        checked={propagarCambios}
                                        onChange={(event) => setPropagarCambios(event.currentTarget.checked)}
                                        mt="xs"
                                        fw={500}
                                    />
                                </Stack>
                            </Group>
                        </Paper>
                    )}

                    <Divider my="sm" />

                    <Group justify="right">
                        <Button variant="default" onClick={onCancel}>Cancelar</Button>
                        <Button type="submit" leftSection={<IconDeviceFloppy size={18} />}>
                            {initialValues ? "Actualizar Modelo" : "Guardar Modelo Completo"}
                        </Button>
                    </Group>
                </Stack>
            </form>
        </Stack>
    );
}