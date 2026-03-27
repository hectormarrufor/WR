'use client';

import { useEffect, useState } from 'react';
import {
    TextInput, NumberInput, Select, Button, Group,
    Stack, LoadingOverlay, Divider, Text, ActionIcon, Paper, SimpleGrid,
    Accordion, Checkbox,
    Badge,
    Textarea
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconDeviceFloppy, IconPlus, IconTrash, IconSitemap, IconTool, IconInfoCircle, IconBuilding, IconLayoutGrid } from '@tabler/icons-react';
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
    const [subsistemas, setSubsistemas] = useState([]);

    const form = useForm({
        initialValues: initialValues || {
            marca: '', 
            modelo: '',
            anio: new Date().getFullYear(),
            
            // Campos Vehiculos/Maquinas/Remolques
            tipoVehiculo: '',
            tipoRemolque: '',
            tipoMaquina: '',
            ejes: 2,
            imagen: '',
            peso: '',
            tipoCombustible: '',
            capacidadArrastre: '',
            pesoMaximoCombinado: '',
            traccion: '',
            capacidadLevante: '',
            capacidadCucharon: '',
            alcanceMaximo: '',
            capacidadTanque: '', // Se mantiene por compatibilidad legacy
            capacidadTanqueEstandar: '', // Nuevo campo
            potenciaMotor: '',

            consumoTeoricoLleno: '',
            consumoTeoricoVacio: '',
            
            // Campos Equipos
            especificacion: '',

            // Campos Inmuebles
            tipoInmueble: '',
            area: '',
            pisos: 1,
            habitaciones: 0,
            banios: 0,
            direccion: '',
        },
        validate: {
            marca: (val) => (tipoPreseleccionado !== 'Inmueble' && tipoPreseleccionado !== 'Equipo' && !val ? 'La marca es obligatoria' : null),
            modelo: (val) => (!val ? (tipoPreseleccionado === 'Inmueble' ? 'El nombre/identificador es obligatorio' : 'El modelo es obligatorio') : null),
        }
    });

    useEffect(() => {
        if (initialValues) {
            form.setValues(initialValues);
        }
    }, [initialValues]);

    useEffect(() => {
        setSubsistemas(form.values.subsistemas || []);
    }, [form.values.subsistemas]); 

    const addSubsistema = () => {
        setSubsistemas([...subsistemas, {
            nombre: '',
            categoria: '', 
            recomendaciones: [] 
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

    const getCategoriasSubsistemas = () => {
        if (tipoPreseleccionado === 'Inmueble') {
            return [
                'Oficina', 'Sala de Reuniones', 'Recepción', 'Baño', 'Cocina/Comedor', 
                'Almacén/Depósito', 'Cuarto de Máquinas', 'Estacionamiento', 'Patio', 
                'Sistema Eléctrico', 'Sistema Hidráulico', 'Sistema Climatización', 
                'Estructura', 'Techo/Cubierta', 'Área Común', 'Habitación'
            ];
        }
        return [
            'motor', 'transmision', 'frenos', 'tren de rodaje', 'suspension', 
            'electrico', 'iluminacion', 'sistema de escape', 'sistema hidraulico', 
            'sistema de direccion', 'sistema de combustible', 'carroceria', 'otros'
        ];
    };

    const getTituloSubsistemas = () => {
        if (tipoPreseleccionado === 'Inmueble') return "Distribución de Espacios y Activos Hijos";
        return "Definición de Subsistemas y Partes";
    };

    const getLabelNombreSubsistema = () => {
        if (tipoPreseleccionado === 'Inmueble') return "Nombre del Espacio / Equipo (ej. Oficina Gerencia)";
        return "Nombre del Subsistema (ej. Motor)";
    };

    const handleSubmit = async (values) => {
        setLoading(true);
        try {
            let endpoint = '';
            let payload = {
                modelo: values.modelo,
                marca: values.marca || 'N/A',
                anio: values.anio,
                imagen: values.imagen,
                subsistemas: subsistemas
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

                    if (!response.ok) console.log('Falló la subida de la imagen.');
                    payload.imagen = uniqueFilename; 
                    notifications.update({ id: 'uploading-image', title: 'Éxito', message: 'Imagen subida.', color: 'green' });
                 }

                endpoint = initialValues ? `/api/gestionMantenimiento/vehiculo/${id}` : '/api/gestionMantenimiento/vehiculo';
                Object.assign(payload, { 
                    tipoVehiculo: values.tipoVehiculo, 
                    numeroEjes: values.ejes, 
                    peso: values.peso, 
                    tipoCombustible: values.tipoCombustible, 
                    capacidadArrastre: values.capacidadArrastre, 
                    pesoMaximoCombinado: values.pesoMaximoCombinado,
                    potenciaMotor: values.potenciaMotor,
                    capacidadTanque: values.capacidadTanque || values.capacidadTanqueEstandar, // Compatibilidad
                    capacidadTanqueEstandar: values.capacidadTanqueEstandar,
                    consumoTeoricoLleno: values.consumoTeoricoLleno,
                    consumoTeoricoVacio: values.consumoTeoricoVacio,
                });
            }
            else if (tipoPreseleccionado === 'Remolque') {
                endpoint = initialValues ? `/api/gestionMantenimiento/remolque/${id}` : '/api/gestionMantenimiento/remolque';
                Object.assign(payload, { 
                    tipoRemolque: values.tipoRemolque, 
                    nroEjes: values.ejes, 
                    peso: values.peso, 
                    capacidadCarga: values.capacidadCarga,
                    capacidadTanqueEstandar: values.capacidadTanqueEstandar // Los vacuum necesitan esto
                });
            }
            else if (tipoPreseleccionado === 'Maquina') {
                endpoint = initialValues ? `/api/gestionMantenimiento/maquina/${id}` : '/api/gestionMantenimiento/maquina';
                Object.assign(payload, { 
                    tipoMaquina: values.tipoMaquina, 
                    traccion: values.traccion, 
                    capacidadLevante: values.capacidadLevante, 
                    capacidadCucharon: values.capacidadCucharon, 
                    alcanceMaximo: values.alcanceMaximo, 
                    tipoCombustible: values.tipoCombustible,
                    capacidadTanqueEstandar: values.capacidadTanqueEstandar
                });
            }
            else if (tipoPreseleccionado === 'Inmueble') {
                endpoint = initialValues ? `/api/gestionMantenimiento/inmueble/${id}` : '/api/gestionMantenimiento/inmueble';
                Object.assign(payload, {
                    tipoInmueble: values.tipoInmueble,
                    area: values.area,
                    pisos: values.pisos,
                    habitaciones: values.habitaciones,
                    banios: values.banios,
                    direccion: values.direccion,
                });
            }
            else if (tipoPreseleccionado === 'Equipo') {
                endpoint = initialValues ? `/api/gestionMantenimiento/equipo/${id}` : '/api/gestionMantenimiento/equipo';
                Object.assign(payload, { especificacion: values.especificacion });
            }

            if (initialValues) {
                payload.propagar = propagarCambios;
            }

            const response = await fetch(endpoint, {
                method: initialValues ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const res = await response.json();

            if (!res.success) throw new Error(res.error || 'No se pudo procesar el modelo');

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

                    {/* --- CAMPOS COMUNES --- */}
                    {(tipoPreseleccionado === 'Vehiculo' || tipoPreseleccionado === 'Remolque' || tipoPreseleccionado === 'Maquina') && (
                        <>
                            <AsyncCatalogComboBox
                                label="Marca"
                                placeholder="Buscar o crear marca..."
                                form={form}
                                fieldKey="marca"
                                catalogo="marcas"
                                tipo="vehiculo"
                            />
                            <AsyncCatalogComboBox
                                label="Modelo"
                                placeholder="Buscar o crear modelo..."
                                form={form}
                                fieldKey="modelo"
                                catalogo="modelos"
                                tipo="vehiculo"
                            />
                        </>
                    )}

                    {/* --- CAMPOS ESPECÍFICOS --- */}

                    {tipoPreseleccionado === 'Vehiculo' && (
                        <>
                            <Group grow>
                                <NumberInput label="Año" min={1980} max={new Date().getFullYear()} {...form.getInputProps('anio')} />
                                <NumberInput label="Nro. Ejes" min={1} max={12} {...form.getInputProps('ejes')} />
                            </Group>
                            <Select
                                label="Tipo de Vehículo"
                                data={['Chuto', 'Carro', 'Camioneta', 'Moto', 'Bus', "Van", "Volqueta", "Camion"]}
                                {...form.getInputProps('tipoVehiculo')}
                            />
                            <ImageDropzone label="Imagen del Vehículo" form={form} fieldPath="imagen" />
                            <SimpleGrid cols={2}>
                                <NumberInput label="Tara (tons)" {...form.getInputProps('peso')} />
                                <NumberInput label="Capacidad Tanque Estándar (L)" {...form.getInputProps('capacidadTanqueEstandar')} />
                                <NumberInput label="Potencia Motor (HP)" {...form.getInputProps('potenciaMotor')} />
                                <Select label="Combustible" data={['Gasolina', 'Diesel', 'Eléctrico', 'Híbrido', "Gas"]} {...form.getInputProps('tipoCombustible')} />
                            </SimpleGrid>
                            <Divider label="Consumo y Arrastre" labelPosition="center" />
                            <SimpleGrid cols={2}>
                                <NumberInput label="Capacidad Arrastre (tons)" {...form.getInputProps('capacidadArrastre')} />
                                <NumberInput label="Peso Máx. Combinado (tons)" {...form.getInputProps('pesoMaximoCombinado')} />
                                <NumberInput label="Consumo Lleno (L/km)" {...form.getInputProps('consumoTeoricoLleno')} />
                                <NumberInput label="Consumo Vacío (L/km)" {...form.getInputProps('consumoTeoricoVacio')} />
                            </SimpleGrid>
                        </>
                    )}

                    {tipoPreseleccionado === 'Remolque' && (
                        <>
                             <Group grow>
                                <NumberInput label="Año" min={1980} {...form.getInputProps('anio')} />
                                <NumberInput label="Nro. Ejes" min={1} {...form.getInputProps('ejes')} />
                            </Group>
                            <Select
                                label="Tipo de Remolque"
                                data={['Batea', 'Plataforma', 'Lowboy', 'Cisterna', 'Vaccum', 'Tolva']}
                                {...form.getInputProps('tipoRemolque')}
                            />
                            <SimpleGrid cols={2}>
                                <NumberInput label="Peso (tons)" {...form.getInputProps('peso')} />
                                <NumberInput label="Capacidad Carga (tons)" {...form.getInputProps('capacidadCarga')} />
                                <NumberInput label="Capacidad Tanque Auxiliar (L)" {...form.getInputProps('capacidadTanqueEstandar')} description="Para motores de equipos como Vaccum" />
                            </SimpleGrid>
                        </>
                    )}

                    {tipoPreseleccionado === 'Maquina' && (
                        <>
                            <NumberInput label="Año" min={1980} {...form.getInputProps('anio')} />
                            <Select
                                label="Tipo de Máquina"
                                data={['Retroexcavadora', 'Excavadora', 'Payloader', 'Motoniveladora', 'Vibrocompactador', 'Grúa', 'Montacargas', 'Planta Eléctrica', 'Taladro']}
                                {...form.getInputProps('tipoMaquina')}
                            />
                            <SimpleGrid cols={2}>
                                <Select label="Tracción" data={['oruga', 'ruedas']} {...form.getInputProps('traccion')} />
                                <Select label="Tipo Combustible" data={['Diesel', 'Gasolina']} {...form.getInputProps('tipoCombustible')} />
                                <NumberInput label="Capacidad Levante (tons)" {...form.getInputProps('capacidadLevante')} />
                                <NumberInput label="Capacidad Cucharón (m³)" {...form.getInputProps('capacidadCucharon')} />
                                <NumberInput label="Alcance Máximo (m)" {...form.getInputProps('alcanceMaximo')} />
                                <NumberInput label="Capacidad Tanque Estándar (L)" {...form.getInputProps('capacidadTanqueEstandar')} />
                            </SimpleGrid>
                        </>
                    )}

                    {tipoPreseleccionado === 'Equipo' && (
                         <TextInput
                            label="Especificación Técnica"
                            placeholder="Ej: 18000 BTU, 220V"
                            {...form.getInputProps('especificacion')}
                        />
                    )}

                    {tipoPreseleccionado === 'Inmueble' && (
                        <Paper p="md" withBorder bg="gray.0">
                             <Group grow mb="md">
                                <NumberInput 
                                    label="Área Total (m²)" 
                                    min={1} 
                                    {...form.getInputProps('area')} 
                                    leftSection={<IconLayoutGrid size={16}/>}
                                />
                                <NumberInput 
                                    label="Nro. Pisos/Niveles" 
                                    min={1} 
                                    {...form.getInputProps('pisos')} 
                                    leftSection={<IconBuilding size={16}/>}
                                />
                            </Group>
                            <Group grow mb="md">
                                <NumberInput label="Habitaciones/Oficinas" min={0} {...form.getInputProps('habitaciones')} />
                                <NumberInput label="Baños" min={0} {...form.getInputProps('banios')} />
                            </Group>
                            <Textarea 
                                label="Dirección / Ubicación Referencial" 
                                autosize minRows={2}
                                {...form.getInputProps('direccion')}
                            />
                        </Paper>
                    )}

                    {/* --- SECCIÓN: SUBSISTEMAS --- */}
                    <Divider my="sm" label={getTituloSubsistemas()} labelPosition="center" />

                    <Paper withBorder p="md" bg={tipoPreseleccionado === 'Inmueble' ? "orange.0" : "gray.0"}>
                        <Group justify="space-between" mb="sm">
                            <Group gap={5}>
                                <IconSitemap size={18} />
                                <Text fw={600} size="sm">{getTituloSubsistemas()}</Text>
                            </Group>
                            <Button variant="subtle" size="xs" leftSection={<IconPlus size={14} />} onClick={addSubsistema}>
                                {tipoPreseleccionado === 'Inmueble' ? 'Agregar Espacio' : 'Agregar Subsistema'}
                            </Button>
                        </Group>

                        {subsistemas.length === 0 ? (
                            <Text size="xs" c="dimmed" ta="center">No hay elementos definidos.</Text>
                        ) : (
                            <Accordion variant="separated" radius="md">
                                {subsistemas.map((sub, index) => (
                                    <Accordion.Item key={index} value={`item-${index}`} bg="white">
                                        <Accordion.Control icon={tipoPreseleccionado === 'Inmueble' ? <IconBuilding size={16}/> : <IconTool size={16} />}>
                                            <Group justify="space-between" w="100%" pr="md">
                                                <Text fw={500}>{sub.nombre || '(Nuevo Elemento)'}</Text>
                                                {sub.categoria && <Badge size="sm" variant="outline">{sub.categoria}</Badge>}
                                            </Group>
                                        </Accordion.Control>
                                        <Accordion.Panel>
                                            <Stack gap="sm">
                                                <Group bg='gray.1' p={10} grow>
                                                    <TextInput
                                                        label={getLabelNombreSubsistema()}
                                                        value={sub.nombre}
                                                        onChange={(e) => updateSubsistema(index, 'nombre', e.currentTarget.value)}
                                                    />
                                                    <Select
                                                        label="Categoría"
                                                        data={getCategoriasSubsistemas()}
                                                        searchable
                                                        value={sub.categoria}
                                                        onChange={(val) => updateSubsistema(index, 'categoria', val)}
                                                    />
                                                </Group>

                                                <ConsumibleRecomendadoCreator
                                                    label={tipoPreseleccionado === 'Inmueble' ? "Items internos" : "Repuestos recomendados"}
                                                    value={sub.recomendaciones}
                                                    onChange={(newRecs) => updateSubsistema(index, 'recomendaciones', newRecs)}
                                                />

                                                <Group justify="right" mt="xs">
                                                    <Button color="red" variant="subtle" size="xs" leftSection={<IconTrash size={14} />} onClick={() => removeSubsistema(index)}>
                                                        Eliminar
                                                    </Button>
                                                </Group>
                                            </Stack>
                                        </Accordion.Panel>
                                    </Accordion.Item>
                                ))}
                            </Accordion>
                        )}
                    </Paper>

                    {/* --- PROPAGACION --- */}
                    {initialValues && (
                        <Paper withBorder p="md" bg="blue.0" mt="md">
                            <Group align="flex-start">
                                <IconInfoCircle color="blue" size={24} />
                                <Stack gap="xs" style={{ flex: 1 }}>
                                    <Text size="sm" fw={700} c="blue">¿Propagar cambios?</Text>
                                    <Text size="xs" c="blue.8">
                                        Sincroniza los nuevos espacios o equipos definidos con todos los activos existentes de este modelo.
                                    </Text>
                                    <Checkbox
                                        label="Sincronizar estructura con activos existentes"
                                        checked={propagarCambios}
                                        onChange={(event) => setPropagarCambios(event.currentTarget.checked)}
                                    />
                                </Stack>
                            </Group>
                        </Paper>
                    )}

                    <Divider my="sm" />

                    <Group justify="right">
                        <Button variant="default" onClick={onCancel}>Cancelar</Button>
                        <Button type="submit" leftSection={<IconDeviceFloppy size={18} />}>
                            {initialValues ? "Actualizar Modelo" : "Guardar Modelo"}
                        </Button>
                    </Group>
                </Stack>
            </form>
        </Stack>
    );
}