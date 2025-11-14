'use client';
import { Group, Paper, Title } from '@mantine/core';
import BackButton from '@/app/components/BackButton';
import ConsumibleForm from '../ConsumibleForm';
import { useEffect, useState } from 'react';


export default function NuevoConsumiblePage() {
  

    return (
        <Paper   p="xl" mt={30}>
            <Group justify="space-between" mb="xl">
                 <Title order={2}>Crear Nuevo Consumible</Title>
                 <BackButton />
            </Group>
            <ConsumibleForm />
        </Paper>
    );
}