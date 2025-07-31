'use client';
import { useForm, useFieldArray } from '@mantine/form';
import { Paper, Title, Select, TextInput, NumberInput, Textarea, Button, Group, ActionIcon, Box } from '@mantine/core';
import { IconTrash, IconPlus } from '@tabler/icons-react';
import { useAuth } from '@/hooks/useAuth';
// ... más imports

export default function PaginaInspeccion() {
    const { userId } = useAuth(); // Para saber quién es el inspector
    // ... lógica para obtener el `activoId` de los params y cargar sus datos
    const { id } = useParams(); // Asumiendo que estás usando react-router o similar para obtener el ID del activo

    const form = useForm({
        initialValues: {
            kilometrajeActual: 0,
            observacionesGenerales: '',
            hallazgos: [] // Un array para los hallazgos dinámicos
        }
    });

    const agregarHallazgo = () => {
        form.insertListItem('hallazgos', { descripcion: '', tipo: 'Correctivo', prioridad: 'Media' });
    };

    const hallazgosFields = form.values.hallazgos.map((item, index) => (
        <Paper withBorder p="md" mt="sm" key={index}>
            <Group justify="space-between"><Text fw={500}>Hallazgo #{index + 1}</Text><ActionIcon color="red" onClick={() => form.removeListItem('hallazgos', index)}><IconTrash/></ActionIcon></Group>
            <TextInput required {...form.getInputProps(`hallazgos.${index}.descripcion`)} />
            <Group grow mt="xs">
                <Select data={['Correctivo', 'Mejora', 'Seguridad']} {...form.getInputProps(`hallazgos.${index}.tipo`)} />
                <Select data={['Baja', 'Media', 'Alta', 'Urgente']} {...form.getInputProps(`hallazgos.${index}.prioridad`)} />
            </Group>
        </Paper>
    ));

    const handleSubmit = async (values) => {
        const payload = {
            ...values,
            activoId: id,
            inspectorId: userId // Asociamos al empleado logueado
        };
        // Lógica para enviar a POST /api/mantenimiento/inspecciones
    };

    return (
        <Paper component="form" onSubmit={form.onSubmit(handleSubmit)} p="xl">
            <Title>Inspección para Activo: [CODIGO_ACTIVO]</Title>
            <NumberInput label="Kilometraje / Horómetro Actual" required {...form.getInputProps('kilometrajeActual')} />
            
            <Box mt="xl">
                <Title order={4}>Hallazgos Encontrados</Title>
                {hallazgosFields}
                <Button mt="md" variant="outline" leftSection={<IconPlus />} onClick={agregarHallazgo}>Añadir Hallazgo</Button>
            </Box>

            <Textarea label="Observaciones Generales" mt="xl" {...form.getInputProps('observacionesGenerales')} />
            <Button type="submit" mt="xl" size="md">Guardar Inspección y Hallazgos</Button>
        </Paper>
    );
}