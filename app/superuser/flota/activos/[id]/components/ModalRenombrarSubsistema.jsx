'use client';
import { useState, useEffect } from 'react';
import { Modal, Button, TextInput, Stack, Group, Text } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconX } from '@tabler/icons-react';

export default function ModalRenombrarSubsistema({ opened, onClose, subsistema, onSuccess }) {
    const [loading, setLoading] = useState(false);

    const form = useForm({
        initialValues: { nombre: '' },
        validate: {
            nombre: (val) => val.trim().length < 3 ? 'El nombre debe tener al menos 3 caracteres' : null
        }
    });

    useEffect(() => {
        if (opened && subsistema) {
            form.setValues({ nombre: subsistema.nombre });
        }
    }, [opened, subsistema]);

    const handleSubmit = async (values) => {
        setLoading(true);
        try {
            // Asume que crearás este endpoint PUT en tu API
            const res = await fetch(`/api/gestionMantenimiento/subsistemas/instancias/${subsistema.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre: values.nombre })
            });

            const result = await res.json();
            if (result.success) {
                notifications.show({ title: 'Éxito', message: 'Subsistema renombrado correctamente', color: 'green' });
                if (onSuccess) onSuccess();
                onClose();
            } else {
                throw new Error(result.error || 'Error al renombrar');
            }
        } catch (error) {
            notifications.show({ title: 'Error', message: error.message, color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    if (!subsistema) return null;

    return (
        <Modal opened={opened} onClose={onClose} title={<Text fw={900} tt="uppercase">Renombrar Subsistema</Text>} centered>
            <form onSubmit={form.onSubmit(handleSubmit)}>
                <Stack gap="md">
                    <TextInput
                        label="Nuevo Nombre (Alias)"
                        placeholder="Ej: Eje Rockwell"
                        withAsterisk
                        {...form.getInputProps('nombre')}
                    />
                    <Group justify="flex-end" mt="md">
                        <Button variant="subtle" color="gray" onClick={onClose} leftSection={<IconX size={16}/>}>Cancelar</Button>
                        <Button type="submit" loading={loading} color="blue.7" leftSection={<IconCheck size={16}/>}>Guardar Cambios</Button>
                    </Group>
                </Stack>
            </form>
        </Modal>
    );
}