'use client';

import { Paper, Title, Group } from '@mantine/core';
import BackButton from '@/app/components/BackButton';
import ActivoForm from '../components/ActivoForm';


export default function CrearActivoPage() {
    return (
        <Paper withBorder p="xl" mt={30}>
            <Group justify="space-between" mb="xl">
                <Title order={2}>Crear Nuevo Activo</Title>
                <BackButton />
            </Group>
            <ActivoForm />
        </Paper>
    );
}