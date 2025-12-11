'use client';

import { Paper, Title, Group } from '@mantine/core';
import BackButton from '@/app/components/BackButton';


export default function CrearActivoPage() {
    return (
        <Paper   p="xl" mt={30}>
            <Group justify="space-between" mb="xl">
                <Title order={2}>Crear Nuevo Activo</Title>
                <BackButton />
            </Group>
        </Paper>
    );
}