'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Loader, Paper, Title, Alert, Group } from '@mantine/core';
import BackButton from '@/app/components/BackButton';


export default function EditarConsumiblePage() {
    const { id } = useParams();
    const [initialData, setInitialData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            const fetchConsumible = async () => {
                const response = await fetch(`/api/inventario/consumibles/${id}`);
                const data = await response.json();
                setInitialData(data);
                setLoading(false);
            };
            fetchConsumible();
        }
    }, [id]);

    if (loading) return <Loader size="xl" />;
    if (!initialData) return <Alert color="red">No se encontró el consumible.</Alert>;

    return (
        <Paper   p="xl" mt={30}>
            <Group justify="space-between" mb="xl">
                <Title order={2}>Editar Consumible: {initialData.nombre}</Title>
                <BackButton />
            </Group>
        </Paper>
    );
}