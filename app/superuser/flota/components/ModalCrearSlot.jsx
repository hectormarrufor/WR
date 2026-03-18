'use client';
import { useState, useEffect } from 'react';
import { Modal, Button, Select, Stack, TextInput, NumberInput, Group } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconPlus } from '@tabler/icons-react';

export default function ModalCrearSlot({ opened, onClose, subsistemaPlantillaId, onSuccess }) {
    const [loading, setLoading] = useState(false);

    // Estas son las categorías permitidas por tu modelo 'Consumible'
    const categoriasConsumible = [
        'aceite', 'gasoil', 'filtro de aceite', 'filtro de aire', 
        'filtro de combustible', 'filtro de cabina', 'neumatico', 
        'bateria', 'sensor', 'correa', 'capacitador', 'bombillo'
    ].map(c => ({ value: c, label: c.toUpperCase() }));

    const form = useForm({
        initialValues: { 
            categoria: '',
            valorCriterio: '',
            cantidad: 1
        },
        validate: { 
            categoria: (val) => (!val ? 'Seleccione el tipo de pieza' : null),
            valorCriterio: (val) => (!val.trim() ? 'Dele un nombre o medida a este puesto' : null)
        }
    });

    useEffect(() => { if (opened) form.reset(); }, [opened]);

    const handleSubmit = async (values) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/gestionMantenimiento/subsistemas/${subsistemaPlantillaId}/slots`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values)
            });
            const data = await res.json();
            
            if (data.success) {
                notifications.show({ title: 'Puesto Creado', message: 'Ya puede instalarle la pieza física.', color: 'green' });
                if(onSuccess) onSuccess(); 
                onClose();
            } else throw new Error(data.error);
        } catch (error) {
            notifications.show({ title: 'Error', message: error.message, color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal opened={opened} onClose={onClose} title="Añadir Nuevo Puesto / Elemento" centered zIndex={1050}>
            <form onSubmit={form.onSubmit(handleSubmit)}>
                <Stack>
                    <Select
                        label="Tipo de Pieza (Categoría)"
                        placeholder="Ej: Neumático"
                        data={categoriasConsumible}
                        withAsterisk
                        searchable
                        comboboxProps={{ zIndex: 2000 }}
                        {...form.getInputProps('categoria')}
                    />
                    
                    <TextInput
                        label="Nombre del Puesto o Medida"
                        description="Ej: Posición 1 (Delantero Izq) o 295/80R22.5"
                        placeholder="Identificador del puesto"
                        withAsterisk
                        {...form.getInputProps('valorCriterio')}
                    />

                    <NumberInput
                        label="Cantidad Requerida"
                        min={1}
                        withAsterisk
                        {...form.getInputProps('cantidad')}
                    />
                    
                    <Group justify="flex-end" mt="md">
                        <Button variant="subtle" color="gray" onClick={onClose}>Cancelar</Button>
                        <Button type="submit" loading={loading} color="blue.7" leftSection={<IconPlus size={16}/>}>
                            Crear Puesto
                        </Button>
                    </Group>
                </Stack>
            </form>
        </Modal>
    );
}