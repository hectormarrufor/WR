'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader, Title, Alert, Box } from '@mantine/core';
import BackButton from '@/app/components/BackButton';
import ModeloActivoForm from '../../components/ModeloActivoForm';


export default function EditarModeloPage() {
    const { id } = useParams();
    const router = useRouter();
    const [initialData, setInitialData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (id) {
            const fetchModelo = async () => {
                setLoading(true);
                try {
                    // Usamos el GET detallado que ya trae toda la jerarquía
                    const response = await fetch(`/api/gestionMantenimiento/modelos/${id}`);
                    if (!response.ok) throw new Error('No se pudo cargar el modelo para editar');
                    const data = await response.json();
                    setInitialData(data);
                } catch (err) {
                    setError(err.message);
                } finally {
                    setLoading(false);
                }
            };
            fetchModelo();
        }
    }, [id]);

    if (loading) {
        return <Loader size="xl" style={{ display: 'block', margin: 'auto', marginTop: '50px' }} />;
    }

    if (error) {
        return <Alert color="red" title="Error">{error}</Alert>;
    }

    if (!initialData) {
        return <Alert color="yellow" title="Aviso">No se encontraron datos para el modelo.</Alert>;
    }
    
    return (
        <Box>
            <Group justify="space-between" mb="xl">
                <Title order={2}>Editar Modelo: {initialData.nombre}</Title>
                <BackButton />
            </Group>
            {/* Aquí renderizamos el formulario, pasándole los datos iniciales */}
            <ModeloActivoForm initialData={initialData} isEditing={true} />
        </Box>
    );
}