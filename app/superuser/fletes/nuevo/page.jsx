'use client';

import { Container, Title, Button, Group, Text } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import Link from 'next/link';
import FleteCreator from '../components/FleteCreator';

export default function NuevoFletePage() {
    return (
        <Container size="xl" py="md">
            <Group mb="lg">
                <Button 
                    component={Link} 
                    href="/superuser/fletes" 
                    variant="subtle" 
                    color="gray"
                    leftSection={<IconArrowLeft size={18} />}
                >
                    Volver
                </Button>
                <div>
                    <Title order={2}>Programar Nuevo Flete</Title>
                    <Text c="dimmed" size="sm">Asigne chofer, vehículo y trace la ruta en el mapa.</Text>
                </div>
            </Group>

            {/* Aquí renderizamos el componente maestro */}
            <FleteCreator />
            
        </Container>
    );
}