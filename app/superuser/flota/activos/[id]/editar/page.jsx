'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Paper, Title, Loader, Alert, Group } from '@mantine/core';
import BackButton from '@/app/components/BackButton';


export default function EditarActivoPage() {
    const { id } = useParams();
    const [initialData, setInitialData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (id) {
            const fetchActivo = async () => {
                try {
                    const response = await fetch(`/api/gestionMantenimiento/activos/${id}`);
                    if (!response.ok) throw new Error('No se pudo cargar el activo para editar');
                    const data = await response.json();
                    setInitialData(data);
                } catch (err) {
                    setError(err.message);
                } finally {
                    setLoading(false);
                }
            };
            fetchActivo();
        }
    }, [id]);

    if (loading) return <Loader size="xl" />;
    if (error) return <Alert color="red" title="Error">{error}</Alert>;

    return (
        <Paper   p="xl" mt={30}>
            <Group justify="space-between" mb="xl">
                <Title order={2}>Editar Activo: {initialData?.codigoActivo}</Title>
                <BackButton />
            </Group>
   
        </Paper>
    );
}