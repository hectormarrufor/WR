'use client';
import { useState, useEffect } from 'react';
import { Modal, Button, Select, Stack, Alert, Text, TextInput, SegmentedControl } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconSettingsPlus, IconPlus } from '@tabler/icons-react';

export default function ModalCrearSubsistema({ opened, onClose, activoId, opcionesPlantilla, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [modo, setModo] = useState(opcionesPlantilla?.length > 0 ? 'existente' : 'nuevo');

    // Todos los ENUMs exactos de tu modelo 'Subsistema'
    const categoriasDB = [
        { value: 'motor', label: 'Motor' },
        { value: 'transmision', label: 'Transmisión' },
        { value: 'frenos', label: 'Frenos' },
        { value: 'tren de rodaje', label: 'Tren de Rodaje' },
        { value: 'suspension', label: 'Suspensión' },
        { value: 'electrico', label: 'Sistema Eléctrico' },
        { value: 'iluminacion', label: 'Iluminación' },
        { value: 'sistema de escape', label: 'Sistema de Escape' },
        { value: 'sistema hidraulico', label: 'Sistema Hidráulico' },
        { value: 'sistema de direccion', label: 'Sistema de Dirección' },
        { value: 'sistema de combustible', label: 'Sistema de Combustible' },
        { value: 'otros', label: 'Otros' }
    ];

    const form = useForm({
        initialValues: {
            subsistemaId: '',
            nuevoNombre: '',
            nuevaCategoria: ''
        },
        validate: {
            subsistemaId: (val) => (modo === 'existente' && !val ? 'Seleccione un subsistema' : null),
            nuevoNombre: (val) => (modo === 'nuevo' && val.trim().length < 3 ? 'Escriba un nombre válido (mín. 3 letras)' : null),
            nuevaCategoria: (val) => (modo === 'nuevo' && !val ? 'Seleccione una categoría' : null)
        }
    });

    useEffect(() => {
        if (opened) {
            setModo(opcionesPlantilla?.length > 0 ? 'existente' : 'nuevo');
            form.reset();
        }
    }, [opened, opcionesPlantilla]);

    const handleSubmit = async (values) => {
        setLoading(true);
        try {
            const payload = modo === 'existente'
                ? { subsistemaId: values.subsistemaId }
                : { nuevoNombre: values.nuevoNombre, nuevaCategoria: values.nuevaCategoria };

            const res = await fetch(`/api/gestionMantenimiento/activos/${activoId}/subsistemas`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (data.success) {
                notifications.show({ title: 'Subsistema Habilitado', message: 'Ya puede asignarle piezas o reportar fallas.', color: 'green' });
                if (onSuccess) onSuccess(data.data);
                onClose();
            } else throw new Error(data.error);
        } catch (error) {
            notifications.show({ title: 'Error', message: error.message, color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal opened={opened} onClose={onClose} title={<Text fw={900} size="lg" tt="uppercase">Habilitar Subsistema</Text>} centered zIndex={1050}>
            <form onSubmit={form.onSubmit(handleSubmit)}>
                <Stack>
                    <Alert icon={<IconSettingsPlus size={20} />} color="blue" variant="light">
                        <Text size="sm">Cree o habilite un área de este equipo (Ej: Tren de Rodaje) para registrarle piezas y reportar fallas específicas.</Text>
                    </Alert>

                    <SegmentedControl
                        value={modo}
                        onChange={(val) => {
                            setModo(val);
                            form.clearErrors();
                        }}
                        data={[
                            { label: 'Usar Existente', value: 'existente', disabled: opcionesPlantilla?.length === 0 },
                            { label: 'Crear Nuevo', value: 'nuevo' }
                        ]}
                        color="blue.7"
                    />

                    {modo === 'existente' ? (
                        <Select
                            label="Plantilla de Subsistema"
                            placeholder="Seleccione uno..."
                            data={opcionesPlantilla}
                            searchable
                            nothingFoundMessage="No hay opciones. Cambie a 'Crear Nuevo'."
                            comboboxProps={{ zIndex: 2000 }} /* 🔥 AQUÍ ESTÁ LA MAGIA 🔥 */
                            {...form.getInputProps('subsistemaId')}
                        />
                    ) : (
                        <Stack gap="sm" p="md" bg="gray.0" style={{ borderRadius: 8, border: '1px solid #dee2e6' }}>
                            <TextInput
                                label="Nombre del Subsistema"
                                placeholder="Ej: Tren de Rodaje, Cauchos Traseros..."
                                withAsterisk
                                {...form.getInputProps('nuevoNombre')}
                            />

                            {/* AQUÍ ESTÁ EL SELECT DE CATEGORÍAS */}
                            <Select
                                label="Clasificación / Categoría"
                                placeholder="Seleccione la categoría..."
                                data={categoriasDB}
                                searchable
                                withAsterisk
                                comboboxProps={{ zIndex: 2000 }} /* 🔥 AQUÍ TAMBIÉN 🔥 */
                                {...form.getInputProps('nuevaCategoria')}
                            />
                            <Text size="xs" c="dimmed" mt="xs">
                                * Al crear este subsistema, se guardará en la plantilla maestra para futuros equipos de este mismo modelo.
                            </Text>
                        </Stack>
                    )}

                    <Button type="submit" loading={loading} fullWidth color="blue.7" mt="sm" leftSection={<IconPlus size={18} />}>
                        Confirmar y Habilitar
                    </Button>
                </Stack>
            </form>
        </Modal>
    );
}