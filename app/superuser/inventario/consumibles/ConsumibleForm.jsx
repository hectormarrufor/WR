'use client';
import { useForm } from '@mantine/form';
import { TextInput, Select, Button, Paper, Title, Grid, Collapse } from '@mantine/core';
import { useEffect, useState } from 'react';
import CompatibilidadForm from './CompatibilidadForm';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';

// Mock para las unidades de medida
const unidadesDeMedida = [
    { value: 'Unidad', label: 'Unidad (und)' },
    { value: 'Litro', label: 'Litro (L)' },
    { value: 'Galon', label: 'Galón (gal)' },
    { value: 'Metro', label: 'Metro (m)' },
    { value: 'Caja', label: 'Caja' },
    { value: 'Juego', label: 'Juego' },
];

export default function ConsumibleForm({ initialData = {}, isEditing = false, onSuccess }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [marcas, setMarcas] = useState([]);
    const [viscosidades, setViscosidades] = useState([]);
    const [medidas, setMedidas] = useState([]);
    
    const form = useForm({
        initialValues: {
            nombre: initialData.nombre || '',
            marca: initialData.marca || '',
            codigoParte: initialData.codigoParte || '',
            sku: initialData.sku || '',
            tipo: initialData.tipo || null,
            stock: initialData.stock ?? 0, // Usar ?? para manejar 0 correctamente
            stockMinimo: initialData.stockMinimo || 0,
            unidadMedida: initialData.unidadMedida || '',
            compatibilidades: initialData.compatibilidades || [],
        },
        validate: {
            nombre: (value) => (value.trim().length > 0 ? null : 'El nombre es requerido'),
            tipo: (value) => (value ? null : 'El tipo es requerido'),
        }
    });

    // Cargar las sugerencias para los combobox
    useEffect(() => {
        fetch('/api/inventario/sugerencias?campo=marca').then(res => res.json()).then(setMarcas);
        fetch('/api/inventario/sugerencias?campo=viscosidad').then(res => res.json()).then(setViscosidades);
        fetch('/api/inventario/sugerencias?campo=medida').then(res => res.json()).then(setMedidas);
    }, []);

    useEffect(() => {
        const { tipo, marca, codigoParte, especificaciones } = form.values;
        if (tipo) {
            let skuParts = [tipo, marca, codigoParte];
            // Añadir especificidad para aceites
            if (tipo === 'Aceite') {
                skuParts.push(especificaciones.viscosidad);
            }
            const newSku = skuParts.filter(Boolean).join('-').toUpperCase().replace(/\s+/g, '-');
            form.setFieldValue('sku', newSku);
        }
    }, [form.values.tipo, form.values.marca, form.values.codigoParte, form.values.especificaciones?.viscosidad]);

    const handleSubmit = async (values) => {
        setLoading(true);
        // Asegurarse de que el stock no se envíe desde este formulario
        const { stock, stockMinimo, ...payload } = values;
        
        const url = isEditing ? `/api/inventario/consumibles/${initialData.id}` : '/api/inventario/consumibles';
        const method = isEditing ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values)
            });
            const responseData = await response.json();
            if (!response.ok) throw new Error(responseData.message || 'Error al guardar el consumible');

            notifications.show({ title: 'Éxito', message: 'Consumible guardado correctamente', color: 'green' });
            
            if (onSuccess) {
                onSuccess(responseData);
            } else {
                router.push('/superuser/inventario/consumibles');
                router.refresh();
            }
        } catch (error) {
            notifications.show({ title: 'Error', message: error.message, color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Paper component="form" onSubmit={form.onSubmit(handleSubmit)} p="md">
            <Title order={4}>{isEditing ? 'Editar Consumible' : 'Crear Nuevo Consumible'}</Title>
            <Grid mt="md">
                <Grid.Col span={{ base: 12, md: 6 }}>
                    <TextInput label="Nombre del Consumible" required {...form.getInputProps('nombre')} />
                </Grid.Col>
                {/* ✨ CAMPO "MARCA" AHORA ES UN COMBOBOX ✨ */}
                <Grid.Col span={{ base: 12, md: 6 }}>
                    <Select
                        label="Marca"
                        placeholder="Escribe o selecciona una marca"
                        data={marcas}
                        searchable
                        creatable // Permite añadir nuevas marcas
                        getCreateLabel={(query) => `+ Crear marca "${query}"`}
                        onCreate={(query) => {
                            const newItem = { value: query, label: query };
                            setMarcas((current) => [...current, newItem]);
                            return newItem;
                        }}
                        {...form.getInputProps('marca')}
                    />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                    <TextInput label="Código de Parte (Part Number)" {...form.getInputProps('codigoParte')} />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                    <TextInput label="SKU (Generado Automáticamente)" readOnly {...form.getInputProps('sku')} />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                    <Select
                        label="Tipo de Consumible"
                        required
                        data={['Aceite', 'Filtro', 'Correa', 'Repuesto', 'Caucho', 'Otro']}
                        {...form.getInputProps('tipo')}
                    />
                </Grid.Col>
                {/* ✨ CAMPO "UNIDAD DE MEDIDA" AHORA ES UN SELECT ✨ */}
                <Grid.Col span={{ base: 12, md: 6 }}>
                    <Select
                        label="Unidad de Medida"
                        placeholder="Selecciona una unidad"
                        data={unidadesDeMedida}
                        {...form.getInputProps('unidadMedida')}
                    />
                </Grid.Col>
            </Grid>

            <Collapse in={form.values.tipo === 'Aceite'} mt="md">
                <Paper withBorder p="sm" radius="md">
                    <Title order={5} mb="sm">Especificaciones de Aceite</Title>
                    <Grid>
                        <Grid.Col span={6}>
                            <Select label="Tipo de Aceite" data={['Mineral', 'Semi-sintético', 'Sintético']} {...form.getInputProps('especificaciones.tipoAceite')} />
                        </Grid.Col>
                        {/* ✨ CAMPO "VISCOSIDAD" AHORA ES UN COMBOBOX ✨ */}
                        <Grid.Col span={6}>
                            <Select
                                label="Viscosidad"
                                placeholder="Escribe o selecciona una viscosidad"
                                data={viscosidades}
                                searchable creatable
                                getCreateLabel={(query) => `+ Añadir "${query}"`}
                                onCreate={(query) => {
                                    const newItem = { value: query, label: query };
                                    setViscosidades((current) => [...current, newItem]);
                                    return newItem;
                                }}
                                {...form.getInputProps('especificaciones.viscosidad')}
                            />
                        </Grid.Col>
                    </Grid>
                </Paper>
            </Collapse>

            <Collapse in={['Filtro', 'Correa', 'Repuesto', 'Caucho'].includes(form.values.tipo)}>
               <CompatibilidadForm form={form} />
            </Collapse>

            <Button type="submit" mt="xl" loading={loading}>Guardar Consumible</Button>
        </Paper>
    );
}