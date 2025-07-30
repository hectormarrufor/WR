'use client';
import { useForm } from '@mantine/form';
import { TextInput, Select, NumberInput, Textarea, Button, Paper, Title, Grid, Collapse } from '@mantine/core';
import { useState } from 'react';
import CompatibilidadForm from './CompatibilidadForm';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';

export default function ConsumibleForm({ initialData = {}, isEditing = false }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const form = useForm({
        initialValues: {
            nombre: initialData.nombre || '',
            sku: initialData.sku || '',
            tipo: initialData.tipo || null,
            stock: initialData.stock || 0,
            stockMinimo: initialData.stockMinimo || 0,
            unidadMedida: initialData.unidadMedida || '',
            especificaciones: initialData.especificaciones || {},
            compatibilidades: initialData.compatibilidades || [],
        },
        // ... validaciones
    });

    const tipoSeleccionado = form.values.tipo;

    const handleSubmit = async (values) => {
        setLoading(true);
        const url = isEditing ? `/api/inventario/consumibles/${initialData.id}` : '/api/inventario/consumibles';
        const method = isEditing ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values)
            });
            if (!response.ok) throw new Error('Error al guardar el consumible');

            notifications.show({ title: 'Éxito', message: 'Consumible guardado correctamente', color: 'green' });
            // router.refresh();
        } catch (error) {
            notifications.show({ title: 'Error', message: error.message, color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Paper component="form" onSubmit={form.onSubmit(handleSubmit)} p="md">
            <Title order={4}>{isEditing ? 'Editar Consumible' : 'Crear Nuevo Consumible'}</Title>
            <Grid>
                <Grid.Col span={{ base: 12, md: 8 }}>
                    <TextInput label="Nombre del Consumible" required {...form.getInputProps('nombre')} />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 4 }}>
                    <TextInput label="SKU / Código de Parte" {...form.getInputProps('sku')} />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                    <Select
                        label="Tipo de Consumible"
                        placeholder="Seleccione un tipo"
                        required
                        data={['Aceite', 'Filtro', 'Correa', 'Repuesto', 'Otro']}
                        {...form.getInputProps('tipo')}
                    />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                    <TextInput label="Unidad de Medida" placeholder="Ej: Litros, Unidades" {...form.getInputProps('unidadMedida')} />
                </Grid.Col>
            </Grid>

            {/* --- ✨ FORMULARIO DINÁMICO --- */}
            <Collapse in={!!tipoSeleccionado} mt="md">
                <Paper withBorder p="sm" radius="md">
                    <Title order={5} mb="sm">Especificaciones</Title>
                    {tipoSeleccionado === 'Aceite' && (
                        <Grid>
                            <Grid.Col span={6}>
                                <Select label="Tipo de Aceite" data={['Mineral', 'Semi-sintético', 'Sintético']} {...form.getInputProps('especificaciones.tipoAceite')} />
                            </Grid.Col>
                            <Grid.Col span={6}>
                                <TextInput label="Viscosidad" placeholder="Ej: 15W40" {...form.getInputProps('especificaciones.viscosidad')} />
                            </Grid.Col>
                        </Grid>
                    )}
                    {tipoSeleccionado === 'Filtro' && (
                        <Grid>
                            <Grid.Col span={6}><TextInput label="Rosca" placeholder="Ej: 1-1/2-16 UN" {...form.getInputProps('especificaciones.rosca')} /></Grid.Col>
                            <Grid.Col span={6}><TextInput label="Diámetro Exterior" placeholder="Ej: 108 mm" {...form.getInputProps('especificaciones.diametroExt')} /></Grid.Col>
                        </Grid>
                    )}
                    {tipoSeleccionado === 'Correa' && (
                        <TextInput label="Dimensiones / Código" placeholder="Ej: 8PK1790" {...form.getInputProps('especificaciones.dimensiones')} />
                    )}
                </Paper>
            </Collapse>

            <Collapse in={form.values.tipo === 'Filtro' || form.values.tipo === 'Correa' || form.values.tipo === 'Repuesto'}>
                 <CompatibilidadForm form={form} />
            </Collapse>

            <Button type="submit" mt="xl">Guardar Consumible</Button>
        </Paper>
    );
}