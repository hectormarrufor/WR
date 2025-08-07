'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Checkbox, Button, Group, Text, Paper, Title, Badge, Stack, Box } from '@mantine/core';
import { IconTool } from '@tabler/icons-react';

export default function HallazgosPendientes({ hallazgos, activoId }) {
    const router = useRouter();
    const [selectedHallazgos, setSelectedHallazgos] = useState([]);

    const handleCreateOrden = () => {
        if (selectedHallazgos.length === 0) return;
        // Navegamos a la página de creación de la orden, pasando los IDs de los hallazgos en la URL
        const hallazgosIds = selectedHallazgos.join(',');
        router.push(`/superuser/flota/activos/${activoId}/ordenes/nueva?hallazgos=${hallazgosIds}`);
    };
    
    if (hallazgos.length === 0) {
        return <Text c="dimmed" ta="center" mt="md">Este activo no tiene hallazgos pendientes.</Text>;
    }

    return (
        <Checkbox.Group value={selectedHallazgos} onChange={setSelectedHallazgos} m={0}>
            <Stack m={0}>
                {hallazgos.map((hallazgo) => (
                    <Paper withBorder p={5} m={0} radius="sm" key={hallazgo.id}>
                        <Group>
                            <Checkbox value={hallazgo.id.toString()} />
                            <Box style={{ flex: 1 }}>
                                <Group justify="space-between">
                                    <Text fw={500}>{hallazgo.descripcion}</Text>
                                    <Badge color={hallazgo.severidad === 'Critico' ? 'red' : 'yellow'}>{hallazgo.severidad}</Badge>
                                </Group>
                                <Text size="xs" c="dimmed">
                                    Reportado el {new Date(hallazgo.createdAt).toLocaleDateString()}
                                    {hallazgo.inspeccionId ? ` (Inspección #${hallazgo.inspeccionId})` : ' (Generado por sistema)'}
                                </Text>
                                {hallazgo.observacionInspector && <Text size="sm" mt="xs">{hallazgo.descripcion}: "{hallazgo.observacionInspector}"</Text>}
                            </Box>
                        </Group>
                    </Paper>
                ))}
            </Stack>
            <Group justify="flex-end" mt="xl">
                <Button 
                    leftSection={<IconTool size={18} />} 
                    size="md"
                    disabled={selectedHallazgos.length === 0}
                    onClick={handleCreateOrden}
                >
                    Crear Orden de Mantenimiento ({selectedHallazgos.length} seleccionados)
                </Button>
            </Group>
        </Checkbox.Group>
    );
}