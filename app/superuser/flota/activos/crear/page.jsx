// app/superuser/flota/activos/crear/page.jsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from '@mantine/form';
import { TextInput, Select, Button, Paper, Title, Group, Alert, Loader, Box, Collapse, Stepper, Text } from '@mantine/core';
import RenderActivoForm from '../components/RenderActivoForm';

export default function CrearActivoPage() {
    const router = useRouter();
    const [modelos, setModelos] = useState([]);
    const [modeloSchema, setModeloSchema] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const form = useForm({
        initialValues: {
            modeloId: '',
            codigoActivo: '',
            datosPersonalizados: {},
        },
        validate: {
            modeloId: (value) => (value ? null : 'Debes seleccionar un modelo base'),
            codigoActivo: (value) => (value.trim().length > 0 ? null : 'El código del activo es requerido'),
        },
    });

    // 1. Carga la lista de modelos para el selector inicial
    useEffect(() => {
        const fetchModelos = async () => {
            try {
                const res = await fetch('/api/gestionMantenimiento/modelos-activos');
                if (!res.ok) throw new Error('No se pudieron cargar los modelos');
                const data = await res.json();
                setModelos(data.map(m => ({ value: m.id.toString(), label: m.nombre })));
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchModelos();
    }, []);
    
    // 2. Reacciona al cambio de modelo para construir el formulario dinámico
    useEffect(() => {
        const modeloId = form.values.modeloId;
        if (!modeloId) {
            setModeloSchema(null);
            return;
        }

        const fetchModeloSchema = async () => {
            setLoading(true);
            try {
                // Usamos el GET por ID que ya trae toda la jerarquía poblada
                const res = await fetch(`/api/gestionMantenimiento/modelos-activos/${modeloId}`);
                if (!res.ok) throw new Error('No se pudo cargar la estructura del modelo');
                const data = await res.json();
                setModeloSchema(Object.values(data.especificaciones)); // Pasamos el array de especificaciones
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchModeloSchema();
    }, [form.values.modeloId]);


    const handleSubmit = async (values) => {
        setLoading(true);
        setError('');
        try {
            const response = await fetch('/api/gestionMantenimiento/activos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values)
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error al crear el activo');
            }
            alert('Activo creado con éxito.');
            router.push('/superuser/flota/activos');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Paper withBorder shadow="md" p="xl" radius="md" mt={30}>
            <Title order={2} ta="center" mb="xl">Crear Nuevo Activo</Title>
            
            <form onSubmit={form.onSubmit(handleSubmit)}>
                <Stepper active={form.values.modeloId ? 1 : 0} breakpoint="sm" allowNextStepsSelect={false}>
                    <Stepper.Step label="Paso 1" description="Seleccionar Modelo">
                         <Title order={4} mt="lg">Selección del Modelo Base</Title>
                         <Text c="dimmed" mb="md">Elige el modelo sobre el cual se creará el nuevo activo.</Text>
                         <Select
                            label="Modelo"
                            placeholder="Seleccione un modelo"
                            data={modelos}
                            searchable
                            required
                            {...form.getInputProps('modeloId')}
                        />
                    </Stepper.Step>
                    <Stepper.Step label="Paso 2" description="Completar Datos">
                        <Title order={4} mt="lg">Ficha Técnica del Activo</Title>
                        <Text c="dimmed" mb="md">Ingresa los datos de identificación y las propiedades específicas.</Text>
                        <TextInput
                            label="Código de Identificación del Activo"
                            placeholder="Ej: WR-CAM-001"
                            required
                            mt="md"
                            {...form.getInputProps('codigoActivo')}
                        />
                        <Box mt="xl">
                            {loading && <Loader />}
                            {modeloSchema && <RenderActivoForm schema={modeloSchema} form={form} />}
                        </Box>
                    </Stepper.Step>
                </Stepper>
                
                {error && <Alert color="red" title="Error" mt="md">{error}</Alert>}

                <Group justify="flex-end" mt="xl">
                    <Button variant="default" onClick={() => router.back()}>Cancelar</Button>
                    <Button type="submit" loading={loading} disabled={!form.values.modeloId}>Crear Activo</Button>
                </Group>
            </form>
        </Paper>
    );
}