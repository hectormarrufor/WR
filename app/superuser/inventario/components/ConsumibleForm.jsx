'use client';

import { useState, useEffect } from 'react';
import {
    Stack, Select, TextInput, NumberInput,
    Button, Group, Text, Divider, Alert, LoadingOverlay,
    SimpleGrid,
    Paper
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconDeviceFloppy, IconInfoCircle, IconLink, IconTrash } from '@tabler/icons-react';

// Importamos el componente de inputs serializados
import SerializadosInputs from './SerializadosInputs';
import { AsyncCatalogComboBox } from '@/app/components/CatalogCombobox';
import ImageDropzone from '../../flota/activos/components/ImageDropzone';
import ModalEquivalencias from '../consumibles/nuevo/ModalEquivalencias';

export default function ConsumibleForm({ onSuccess, onCancel }) {
    const [loading, setLoading] = useState(false);

    // Control de UI
    const [tipoEspecifico, setTipoEspecifico] = useState('Filtro'); // Default
    const [esSerializado, setEsSerializado] = useState(false);
    const [showEquivalencias, setShowEquivalencias] = useState(false);
    const [equivalenciaSeleccionada, setEquivalenciaSeleccionada] = useState(null); // Guardará el ID y Nombre

    // Configuración del Formulario Maestro
    const form = useForm({
        initialValues: {
            nombre: '',         // Se generará auto o manual
            marca: '',
            modelo: '',
            stockMinimo: 5,
            stockActual: 0,
            categoria: '',

            // Lógica Serializados
            clasificacion: 'Fungible', // 'Fungible' | 'Serializado'
            unidadMedida: 'unidades', // Valor por defecto
            itemsSerializados: [],     // Array de objetos { serial: '...' }

            //CAMPO COMÚN
            codigo: '',
            tipo: '',

            // CAMPOS ESPECÍFICOS (Todos conviven aquí)
            // Filtros
            posicion: 'Primario',
            imagen: '',
            equivalencias: [],
            // Aceites
            viscosidad: '', // O id de viscosidad si usas relación
            aplicacion: 'Motor',
            // Correas
            // Baterias (Ejemplo de algo serializado por defecto)
            amperaje: 800,
            voltaje: 12,
            capacidad: 60,
            // Neumáticos
            medida: '',
            //Sensores
            nombre: '',
        },
        validate: {
            marca: (val) => !val ? 'Marca requerida' : null,
            // Validaciones condicionales
            codigoFiltro: (val) => (tipoEspecifico === 'Filtro' && !val ? 'Código requerido' : null),
            itemsSerializados: (val, values) => {
                if (values.clasificacion === 'Serializado' && val.some(i => !i.serial)) {
                    return 'Todos los seriales son obligatorios';
                }
                return null;
            }
        }
    });

    // Efecto: Auto-configurar Serializado según el tipo
    useEffect(() => {
        if (['Bateria', 'Neumatico'].includes(tipoEspecifico)) {
            setEsSerializado(true);
            form.setFieldValue('clasificacion', 'Serializado');
            form.setFieldValue('stockActual', 1); // Empezamos con 1 unidad
        } else {
            setEsSerializado(false);
            form.setFieldValue('clasificacion', 'Fungible');
        }
        console.log(tipoEspecifico)
    }, [tipoEspecifico]);

    useEffect(() => {
        if (form.values.clasificacion === 'Serializado') {
            // Si es serializado, FORZAMOS que sea Unidad
            form.setFieldValue('unidadMedida', 'Unidad');
        }
    }, [form.values.clasificacion]);

    // Efecto para ajustar la categoria del consumible según el tipo específico
    useEffect(() => {
        if (tipoEspecifico === 'Filtro') {
            form.setFieldValue('categoria', form.values.tipo ? `filtro de ${form.values.tipo.toLowerCase()}` : 'filtro de aceite');
            form.setFieldValue('unidadMedida', 'unidades');
        } else {
            const categoriaMap = {
                'Aceite': 'aceite',
                'Bateria': 'bateria',
                'Neumatico': 'neumatico',
                'Correa': 'correa',
            };
            if (tipoEspecifico === "Aceite") {
                form.setFieldValue('unidadMedida', 'litros');
            }
            if (tipoEspecifico === "Correa") {
                form.setFieldValue('unidadMedida', 'unidades');
            }
            if (tipoEspecifico === "Sensor") {
                form.setFieldValue('unidadMedida', 'unidades');
            }
            form.setFieldValue('categoria', categoriaMap[tipoEspecifico] || '');
        }

    }, [tipoEspecifico, form.values.tipo]);



    // Función que recibe la selección del Modal
    const handleConfirmEquivalencia = (selectedIds) => {
        // Como el modal devuelve un Set o Array, tomamos el primero
        const id = Array.from(selectedIds)[0];

        if (id) {
            // Aquí idealmente el modal debería devolver el objeto completo, 
            // pero si solo devuelve ID, lo guardamos.
            setEquivalenciaSeleccionada({ id: id, nombre: `Filtro ID: ${id}` });
            setShowEquivalencias(false);
        }
    };

    const handleSubmit = async (values) => {
        setLoading(true);
        try {
            // 1. GENERACIÓN DE NOMBRE Y DATOS TÉCNICOS
            let nombreGenerado = '';
            let datosTecnicos = {};

            if (tipoEspecifico === 'Filtro') {
                nombreGenerado = `Filtro ${values.tipoFiltro} ${values.marca} ${values.codigoFiltro}`;
                datosTecnicos = {
                    tipo: 'Filtro',
                    datos: { tipoFiltro: values.tipoFiltro },
                    equivalenciaExistenteId: equivalenciaSeleccionada?.id
                };
            }
            else if (tipoEspecifico === 'Aceite') {
                nombreGenerado = `Aceite ${values.aplicacion} ${values.marca} ${values.viscosidad} ${values.tipoAceite}`;
                datosTecnicos = {
                    tipo: 'Aceite',
                    datos: { viscosidad: values.viscosidad, base: values.tipoAceite, aplicacion: values.aplicacion }
                };
            }
            else if (tipoEspecifico === 'Bateria') {
                nombreGenerado = `Batería ${values.marca} Gr.${values.grupoBateria} ${values.cca}CCA`;
                datosTecnicos = {
                    tipo: 'Bateria',
                    datos: { grupo: values.grupoBateria, cca: values.cca }
                };
            }
            // ... Otros tipos ...

            // 2. PREPARAR PAYLOAD
            const payload = {
                nombre: nombreGenerado,
                codigo: values.codigoFiltro || nombreGenerado, // Simplificado
                marca: values.marca,
                stockMinimo: values.stockMinimo,
                stockActual: values.clasificacion === 'Serializado' ? values.itemsSerializados.length : values.stockActual,
                tipo: values.clasificacion, // 'Fungible' o 'Serializado'

                datosTecnicos: datosTecnicos,
                itemsSerializados: values.itemsSerializados // Enviamos los hijos
            };

            // 3. FETCH
            const response = await fetch('/api/inventario/consumibles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const res = await response.json();

            if (res.success) {
                notifications.show({ title: 'Éxito', message: 'Consumible creado', color: 'green' });
                if (onSuccess) onSuccess(res.data); // Retornamos la data completa (con hijos serializados)
            } else {
                throw new Error(res.error || 'Error al guardar');
            }

        } catch (error) {
            console.error(error);
            notifications.show({ title: 'Error', message: error.message, color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    const tipoCatalogo = {
        'Aceite': 'aceite',
        'Bateria': 'bateria',
        'Neumatico': 'neumatico',
        'Correa': 'correa',
        'Filtro': 'filtro'
    }[tipoEspecifico] || 'general';

    const tipoFiltro = {
        'Aceite': 'filtroAceite',
        'Aire': 'filtroAire',
        'Combustible': 'filtroCombustible'
    }[form.values.tipoFiltro] || 'filtroAceite';


    return (
        <Stack pos="relative">
            <LoadingOverlay visible={loading} />

            <SimpleGrid cols={2} breakpoints={[{ maxWidth: 'sm', cols: 1 }]}>

                {/* SELECCIÓN DEL TIPO (Esto define qué inputs mostramos) */}
                <Select
                    label="Tipo de Repuesto"
                    data={['Filtro', 'Aceite', 'Bateria', 'Correa', 'Neumatico']}
                    value={tipoEspecifico}
                    onChange={(val) => { setTipoEspecifico(val); form.reset(); }}
                    allowDeselect={false}
                />
                <Select
                    label="Unidad de Medida"
                    disabled={esSerializado} // Si es serializado, no se puede cambiar
                    data={['unidades', 'litros', 'kilogramos', 'metros', 'galones']}
                    value={form.values.unidadMedida}
                    onChange={(val) => form.setFieldValue('unidadMedida', val)}
                />
                {/* El select de clasificación puede ser manual o auto */}
                <Select
                    label="Clasificación"
                    disabled
                    data={['Fungible', 'Serializado']}
                    value={form.values.clasificacion}
                    onChange={(val) => {
                        setEsSerializado(val === 'Serializado');
                        form.setFieldValue('clasificacion', val);
                        if (val === 'Serializado') form.setFieldValue('stockActual', 1);
                    }}
                />
            </SimpleGrid>


            <Divider />

            {/* FORMULARIO ÚNICO - USANDO EL TRUCO DEL STOPPROPAGATION */}
            <form onSubmit={(e) => { e.stopPropagation(); form.onSubmit(handleSubmit)(e); }}>
                <Stack gap="md">

                    {/* --- DATOS COMUNES --- */}
                    <Group grow>
                        <AsyncCatalogComboBox
                            // LA CLAVE MÁGICA: Al cambiar el tipo, React destruye el anterior y crea uno nuevo
                            key={tipoCatalogo}

                            label="Marca"
                            placeholder="Selecciona una marca"
                            fieldKey="marca"
                            form={form}
                            catalogo="marcas"
                            tipo={tipoCatalogo}
                        />


                    </Group>

                    {/* --- INPUTS ESPECÍFICOS (Renderizado Condicional) --- */}

                    {/* CASO: FILTRO */}
                    {tipoEspecifico === 'Filtro' && (
                        <>
                            <Group grow>
                                <AsyncCatalogComboBox
                                    label="Código"
                                    placeholder="Ej. WF1036"
                                    fieldKey="codigoFiltro"
                                    form={form}
                                    catalogo="codigos"
                                    tipo={tipoFiltro}
                                />
                                <Select label="Función" placeholder="seleccione un tipo" data={['Aceite', 'Aire', 'Combustible']} {...form.getInputProps('tipo')} />
                                <Select label="Posición" data={['Primario', 'Secundario']} {...form.getInputProps('posicion')} />
                                <ImageDropzone
                                    label="Imagen del Filtro" form={form} fieldPath="imagen"
                                />

                            </Group>
                            <Paper withBorder p="md" bg="gray.0">
                                <Text size="sm" fw={500} mb="xs">Equivalencias</Text>

                                {equivalenciaSeleccionada ? (
                                    <Group justify="space-between">
                                        <Group>
                                            <IconLink size={18} color="blue" />
                                            <Text size="sm">
                                                Vinculado con: <b>{equivalenciaSeleccionada.nombre}</b> (y su grupo)
                                            </Text>
                                        </Group>
                                        <Button
                                            color="red" variant="subtle" size="xs"
                                            onClick={() => setEquivalenciaSeleccionada(null)}
                                        >
                                            <IconTrash size={16} />
                                        </Button>
                                    </Group>
                                ) : (
                                    <Group>
                                        <Alert variant="light" color="blue" title="¿Es igual a otro?" icon={<IconLink size={16} />} style={{ flex: 1 }}>
                                            Si este filtro es equivalente a uno existente (ej. WIX vs Millard), vincúlalos.
                                        </Alert>
                                        <Button variant="white" onClick={() => setShowEquivalencias(true)}>
                                            Buscar Equivalente
                                        </Button>
                                    </Group>
                                )}
                            </Paper>
                        </>
                    )}

                    {/* CASO: ACEITE */}
                    {tipoEspecifico === 'Aceite' && (
                        <Group grow>
                            <AsyncCatalogComboBox
                                label="Modelo"
                                placeholder="X-cess 8100"
                                fieldKey="modelo"
                                form={form}
                                catalogo="modelos"
                                tipo={tipoCatalogo}
                            />
                            <AsyncCatalogComboBox
                                label="Viscosidad"
                                placeholder="Ej. 15W-40"
                                fieldKey="viscosidad"
                                form={form}
                                catalogo="viscosidades"
                                tipo='motor'
                            />
                            <Select label="Base" data={['Mineral', 'Sintetico']} {...form.getInputProps('tipoAceite')} />
                            <Select label="Aplicación" data={['Motor', 'Hidraulico']} {...form.getInputProps('aplicacion')} />
                        </Group>
                    )}

                    {/* CASO: BATERÍA */}
                    {tipoEspecifico === 'Bateria' && (
                        <Group grow>
                            <AsyncCatalogComboBox
                                label="Grupo/Código"
                                placeholder="Ej. 24F"
                                fieldKey="codigo"
                                form={form}
                                catalogo="codigos"
                                tipo="bateria"
                            />
                            <NumberInput label="CCA (Arranque)" suffix=" A" {...form.getInputProps('amperaje')} />
                            <NumberInput label="Capacidad" suffix=" Ah" {...form.getInputProps('capacidad')} />
                            <NumberInput label="Voltaje" suffix=" V" {...form.getInputProps('voltaje')} />
                        </Group>
                    )}


                    {/* --- SECCIÓN DE STOCK Y SERIALES --- */}
                    <Divider label="Inventario Inicial" labelPosition="center" />

                    <NumberInput
                        label={esSerializado ? "Cantidad a Ingresar (Unidades)" : "Stock Inicial"}
                        min={esSerializado ? 1 : 0}
                        {...form.getInputProps('stockActual')}
                    />

                    {esSerializado && (
                        <>
                            <Alert variant="light" color="blue" title="Detalle de Seriales" icon={<IconInfoCircle size={16} />}>
                                Ingrese los datos únicos de cada unidad.
                            </Alert>

                            <SerializadosInputs
                                cantidad={form.values.stockActual}
                                values={form.values.itemsSerializados}
                                onChange={(newItems) => form.setFieldValue('itemsSerializados', newItems)}
                            />
                        </>
                    )}

                    {/* --- BOTONES --- */}
                    <Group justify="right" mt="xl">
                        {onCancel && <Button variant="default" onClick={onCancel} type="button">Cancelar</Button>}
                        <Button type="submit" leftSection={<IconDeviceFloppy size={18} />}>
                            Guardar Repuesto
                        </Button>
                    </Group>
                </Stack>
            </form>
            {/* MODAL DE EQUIVALENCIAS */}
            <ModalEquivalencias
                open={showEquivalencias}
                onClose={() => setShowEquivalencias(false)}
                onConfirm={handleConfirmEquivalencia}
                // Asegúrate de pasar props para que busque solo Filtros
                initialSelected={equivalenciaSeleccionada ? [equivalenciaSeleccionada.id] : []}
            />
        </Stack>
    );
}