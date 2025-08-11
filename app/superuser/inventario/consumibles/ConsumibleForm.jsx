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
    
    const form = useForm({
        initialValues: {
            nombre: initialData.nombre || '',
            marca: initialData.marca || '',
            codigoParte: initialData.codigoParte || '',
            sku: initialData.sku || '',
            tipo: initialData.tipo || null,
            stock: initialData.stock ?? 0,
            stockMinimo: initialData.stockMinimo || 0,
            unidadMedida: initialData.unidadMedida || '',
            // ✨ El campo especificaciones se mantiene para la data contextual
            especificaciones: initialData.especificaciones || {},
            compatibilidades: initialData.compatibilidades || [],
        },
        validate: {
            nombre: (value) => (value.trim().length > 0 ? null : 'El nombre es requerido'),
            tipo: (value) => (value ? null : 'El tipo es requerido'),
        }
    });

    // Cargar las sugerencias para los combobox
    useEffect(() => {
        fetch('/api/inventario/sugerencias?campo=marca').then(res => res.json()).then(data => Array.isArray(data) && setMarcas(data.map(m => ({ value: m, label: m }))));
        fetch('/api/inventario/sugerencias?campo=viscosidad').then(res => res.json()).then(data => Array.isArray(data) && setViscosidades(data.map(v => ({ value: v, label: v }))));
    }, []);

    // ✨ LÓGICA DE SKU MEJORADA: Ahora es contextual ✨
    useEffect(() => {
        const { tipo, marca, codigoParte, especificaciones } = form.values;
        if (tipo) {
            let skuParts = [tipo, marca];
            if (tipo === 'Aceite') {
                skuParts.push(especificaciones?.tipoAceite, especificaciones?.viscosidad);
            } else if (tipo === 'Neumatico') {
                skuParts.push(especificaciones?.medida);
            } else {
                skuParts.push(codigoParte);
            }
            const newSku = skuParts.filter(Boolean).join('-').toUpperCase().replace(/\s+/g, '-');
            form.setFieldValue('sku', newSku);
        }
    }, [form.values.tipo, form.values.marca, form.values.codigoParte, form.values.especificaciones]);

    const handleSubmit = async (values) => {
        setLoading(true);
        const { stock, stockMinimo, ...payload } = values;
        
        const url = isEditing ? `/api/inventario/consumibles/${initialData.id}` : '/api/inventario/consumibles';
        const method = isEditing ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
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
                {/* ... (Tus campos de nombre, marca, código de parte, sku, tipo y unidad de medida se quedan igual) ... */}
            </Grid>

            {/* ✨ SECCIÓN DE ESPECIFICACIONES CONTEXTUALES ✨ */}
            <Collapse in={!!form.values.tipo} mt="md">
                <Paper withBorder p="sm" radius="md">
                    <Title order={5} mb="sm">Especificaciones Específicas</Title>
                    {form.values.tipo === 'Aceite' && (
                        <Grid>
                            <Grid.Col span={6}>
                                <Select label="Tipo de Aceite" data={['Mineral', 'Semi-sintético', 'Sintético']} {...form.getInputProps('especificaciones.tipoAceite')} />
                            </Grid.Col>
                            <Grid.Col span={6}>
                                <Select
                                    label="Viscosidad"
                                    data={viscosidades} searchable creatable
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
                    )}
                    {form.values.tipo === 'Neumatico' && (
                        <TextInput label="Medida del Neumático" placeholder="Ej: 295/80R22.5" {...form.getInputProps('especificaciones.medida')} />
                    )}
                    {form.values.tipo === 'Bateria' && (
                         <Grid>
                            <Grid.Col span={6}><TextInput label="Voltaje" placeholder="Ej: 12V" {...form.getInputProps('especificaciones.voltaje')} /></Grid.Col>
                            <Grid.Col span={6}><TextInput label="Amperaje" placeholder="Ej: 750 CCA" {...form.getInputProps('especificaciones.amperaje')} /></Grid.Col>
                        </Grid>
                    )}
                    {/* Puedes añadir más casos para otros tipos de consumibles aquí */}
                </Paper>
            </Collapse>

            {/* --- SECCIÓN DE COMPATIBILIDAD --- */}
            <Collapse in={['Filtro', 'Correa', 'Repuesto', 'Mangueras', 'Bombillo', 'Sensores', 'Pastillas de Freno'].includes(form.values.tipo)}>
               <CompatibilidadForm form={form} />
            </Collapse>

            <Button type="submit" mt="xl" loading={loading}>Guardar Consumible</Button>
        </Paper>
    );
}