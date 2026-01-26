'use client';
import { useState } from 'react';
import { 
    Modal, Button, TextInput, NumberInput, Select, Textarea, 
    Stack, Group, Text, ActionIcon, Paper, Badge, Divider,
    SegmentedControl, Box
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconPlus, IconTrash, IconAlertTriangle, IconCheck } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

export default function ModalReportarFalla({ opened, onClose, activo, onSuccess, userId }) {
    const [loading, setLoading] = useState(false);
    
    // Formulario principal de la inspección
    const form = useForm({
        initialValues: {
            kilometraje: activo.kilometrajeActual || 0,
            horometro: 0, // Si el activo no usa horómetro, esto se ignora
            origen: 'Rutina',
            observacionGeneral: '',
            hallazgos: [] // Array de fallas
        },
        validate: {
            kilometraje: (val) => (val < activo.kilometrajeActual ? 'El kilometraje no puede ser menor al actual' : null),
            hallazgos: (val) => (val.length === 0 ? 'Debe reportar al menos una observación o falla' : null)
        }
    });

    // Estado local para el "Nuevo Hallazgo" que se está escribiendo
    const [nuevoHallazgo, setNuevoHallazgo] = useState({
        descripcion: '',
        impacto: 'Operativo', // Operativo, Advertencia, No Operativo
        subsistemaInstanciaId: null,
        consumibleInstaladoId: null // Opcional, si sabe exactamente qué pieza es
    });

    // Helpers para listas desplegables
    const subsistemasOptions = activo.subsistemasInstancia?.map(sub => ({
        value: sub.id.toString(),
        label: sub.nombre
    })) || [];

    // Lógica para agregar un hallazgo a la lista visual
    const agregarHallazgo = () => {
        if (!nuevoHallazgo.descripcion.trim()) return;

        form.insertListItem('hallazgos', { ...nuevoHallazgo });
        
        // Resetear inputs del hallazgo
        setNuevoHallazgo({
            descripcion: '',
            impacto: 'Operativo',
            subsistemaInstanciaId: null,
            consumibleInstaladoId: null
        });
    };

    const handleSubmit = async (values) => {
        setLoading(true);
        try {
            const res = await fetch('/api/gestionMantenimiento/inspecciones', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    activoId: activo.id,
                    usuarioId: userId, // Pasado por prop desde el auth hook
                    ...values
                })
            });

            const data = await res.json();
            if (data.success) {
                notifications.show({ title: 'Reporte Enviado', message: 'La inspección ha sido registrada.', color: 'green' });
                onSuccess(); // Recargar datos padre
                onClose();
                form.reset();
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            notifications.show({ title: 'Error', message: error.message, color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal opened={opened} onClose={onClose} title="Reportar Falla / Inspección" size="lg" centered>
            <form onSubmit={form.onSubmit(handleSubmit)}>
                <Stack>
                    {/* PASO 1: DATOS VITALES */}
                    <Paper withBorder p="xs" bg="gray.0">
                        <Text size="xs" fw={700} c="dimmed" mb="xs">ACTUALIZACIÓN DE USO</Text>
                        <Group grow>
                            <NumberInput 
                                label="Kilometraje Actual" 
                                placeholder="KM" 
                                min={0}
                                {...form.getInputProps('kilometraje')}
                            />
                            {/* Mostrar solo si aplica, aqui lo dejo genérico */}
                            <NumberInput 
                                label="Horómetro Actual" 
                                placeholder="Horas" 
                                min={0}
                                {...form.getInputProps('horometro')}
                            />
                        </Group>
                        <Select 
                            label="Origen del Reporte"
                            data={['Rutina', 'Pre-Uso', 'Post-Uso', 'Incidente']}
                            mt="sm"
                            {...form.getInputProps('origen')}
                        />
                    </Paper>

                    <Divider label="Detalle de Fallas / Observaciones" labelPosition="center" />

                    {/* PASO 2: AGREGAR HALLAZGOS (MINI FORMULARIO INTERNO) */}
                    <Box style={{ border: '1px dashed #ced4da', borderRadius: 8, padding: 12 }}>
                        <TextInput 
                            placeholder="Describe la falla (Ej: Ruido en la rueda derecha, Luz quemada...)"
                            label="Descripción del Problema"
                            value={nuevoHallazgo.descripcion}
                            onChange={(e) => setNuevoHallazgo({ ...nuevoHallazgo, descripcion: e.target.value })}
                        />
                        
                        <Group grow mt="sm">
                            <Select 
                                label="Subsistema (Opcional)"
                                placeholder="General / No sé"
                                data={subsistemasOptions}
                                value={nuevoHallazgo.subsistemaInstanciaId}
                                onChange={(val) => setNuevoHallazgo({ ...nuevoHallazgo, subsistemaInstanciaId: val })}
                                clearable
                            />
                            <Stack gap={0}>
                                <Text size="sm" fw={500}>Impacto Operativo</Text>
                                <SegmentedControl 
                                    size="xs"
                                    color={nuevoHallazgo.impacto === 'No Operativo' ? 'red' : nuevoHallazgo.impacto === 'Advertencia' ? 'yellow' : 'green'}
                                    data={[
                                        { label: 'Leve', value: 'Operativo' },
                                        { label: 'Advertencia', value: 'Advertencia' },
                                        { label: 'Crítico (Parar)', value: 'No Operativo' }
                                    ]}
                                    value={nuevoHallazgo.impacto}
                                    onChange={(val) => setNuevoHallazgo({ ...nuevoHallazgo, impacto: val })}
                                />
                            </Stack>
                        </Group>

                        <Button 
                            fullWidth 
                            mt="md" 
                            variant="light" 
                            leftSection={<IconPlus size={16}/>}
                            onClick={agregarHallazgo}
                            disabled={!nuevoHallazgo.descripcion}
                        >
                            Agregar a la Lista
                        </Button>
                    </Box>

                    {/* LISTA DE HALLAZGOS AGREGADOS */}
                    {form.values.hallazgos.length > 0 && (
                        <Stack gap="xs">
                            <Text size="sm" fw={700} mt="sm">Fallas a reportar ({form.values.hallazgos.length}):</Text>
                            {form.values.hallazgos.map((item, index) => (
                                <Paper key={index} withBorder p="xs" shadow="xs">
                                    <Group justify="space-between">
                                        <Group gap="xs">
                                            {item.impacto === 'No Operativo' ? <IconAlertTriangle color="red" size={20}/> : <IconCheck color="green" size={20}/>}
                                            <Stack gap={0}>
                                                <Text size="sm" fw={600}>{item.descripcion}</Text>
                                                <Text size="xs" c="dimmed">
                                                    {subsistemasOptions.find(o => o.value === item.subsistemaInstanciaId)?.label || 'General'}
                                                </Text>
                                            </Stack>
                                        </Group>
                                        <ActionIcon color="red" variant="subtle" onClick={() => form.removeListItem('hallazgos', index)}>
                                            <IconTrash size={16} />
                                        </ActionIcon>
                                    </Group>
                                </Paper>
                            ))}
                        </Stack>
                    )}
                    
                    {/* ERROR VALIDACION LISTA VACIA */}
                    {form.errors.hallazgos && (
                        <Text c="red" size="sm" ta="center">{form.errors.hallazgos}</Text>
                    )}

                    <Textarea 
                        label="Observación General de la Inspección"
                        placeholder="Comentarios adicionales..."
                        {...form.getInputProps('observacionGeneral')}
                    />

                    <Button type="submit" loading={loading} color="blue" size="md" mt="md">
                        Registrar Inspección
                    </Button>
                </Stack>
            </form>
        </Modal>
    );
}