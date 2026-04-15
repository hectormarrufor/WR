'use client';
import { useState, useEffect } from 'react';
import { Modal, Button, Select, Stack, TextInput, NumberInput, Group } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconPlus } from '@tabler/icons-react';

// 🔥 Diccionario masivo organizado por grupos
const CATEGORIAS_AGRUPADAS = [
    {
        group: 'Líquidos y Filtros',
        items: [
            { value: 'aceite', label: 'Aceite Lubricante' },
            { value: 'gasoil', label: 'Combustible (Gasoil)' },
            { value: 'filtro de aceite', label: 'Filtro de Aceite' },
            { value: 'filtro de aire', label: 'Filtro de Aire' },
            { value: 'filtro de combustible', label: 'Filtro de Combustible' },
            { value: 'filtro de cabina', label: 'Filtro de Cabina' },
        ],
    },
    {
        group: 'Sistema de Frenos',
        items: [
            { value: 'pastillas de freno', label: 'Pastillas de Freno' },
            { value: 'bandas de freno', label: 'Bandas de Freno' },
            { value: 'zapatas', label: 'Zapatas' },
            { value: 'tambor', label: 'Tambor de Freno' },
            { value: 'disco de freno', label: 'Disco de Freno' },
            { value: 'valvula de aire', label: 'Válvula de Aire / Relé' },
            { value: 'pulmon de freno', label: 'Pulmón de Freno (Chamber)' },
        ],
    },
    {
        group: 'Rodamiento y Suspensión',
        items: [
            { value: 'neumatico', label: 'Neumático / Caucho' },
            { value: 'rolinera', label: 'Rolinera / Rodamiento' },
            { value: 'amortiguador', label: 'Amortiguador' },
            { value: 'ballesta', label: 'Hoja de Ballesta' },
            { value: 'buje', label: 'Buje' },
        ],
    },
    {
        group: 'Eléctrico y Electrónico',
        items: [
            { value: 'bateria', label: 'Batería' },
            { value: 'sensor', label: 'Sensor Eléctrico' },
            { value: 'bombillo', label: 'Bombillo / Iluminación' },
            { value: 'capacitador', label: 'Capacitador / Condensador' },
            { value: 'fusible', label: 'Fusible / Relé' },
        ],
    },
    {
        group: 'Motor y Transmisión',
        items: [
            { value: 'correa', label: 'Correa / Banda' },
            { value: 'manguera', label: 'Manguera' },
            { value: 'estopera', label: 'Estopera / Sello' },
            { value: 'empacadura', label: 'Empacadura' },
            { value: 'cruceta', label: 'Cruceta (Cardán)' },
        ],
    },
    {
        group: 'Otros',
        items: [
            { value: 'repuesto general', label: 'Repuesto General' },
            { value: 'consumible taller', label: 'Consumible de Taller (Grasa, Tirrajes)' },
        ]
    }
];

export default function ModalCrearSlot({ opened, onClose, subsistemaPlantillaId, onSuccess }) {
    const [loading, setLoading] = useState(false);

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
                        placeholder="Buscar pieza... Ej: Tambor"
                        data={CATEGORIAS_AGRUPADAS}
                        withAsterisk
                        searchable
                        nothingFoundMessage="No se encontró esta categoría"
                        comboboxProps={{ zIndex: 2000 }}
                        {...form.getInputProps('categoria')}
                    />
                    
                    <TextInput
                        label="Nombre del Puesto o Medida"
                        description="Ej: Posición 1 (Delantero Izq) o Eje 1 Tracción"
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