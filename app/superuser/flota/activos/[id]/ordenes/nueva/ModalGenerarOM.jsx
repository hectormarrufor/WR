'use client';

import { useState, useEffect } from 'react';
import { 
    Modal, Button, Stack, TextInput, Select, Group, Text, Textarea, 
    ActionIcon, Badge, Divider, Box, Checkbox, Paper, NumberInput
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconTool, IconPlus, IconTrash, IconDeviceFloppy } from '@tabler/icons-react';

export default function ModalGenerarOM({ opened, onClose, activo, hallazgosPendientes, selectedHallazgo, userId, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [consumiblesDisponibles, setConsumiblesDisponibles] = useState([]);
  
    useEffect(() => {
        if (opened) {
            if (selectedHallazgo) {
                form.setFieldValue('hallazgosIds', [selectedHallazgo.id.toString()]);
            } else {
                form.setFieldValue('hallazgosIds', []);
            }
             const fetchConsumibles = async () => {
                try {
                    // Ajusta esta ruta a donde tengas tu endpoint de listar consumibles
                    const res = await fetch('/api/inventario/consumibles');
                    const data = await res.json();
                    if (data.success) {
                        // Formateamos para el Select de Mantine
                        const opciones = data.data.map(c => ({
                            value: c.id.toString(),
                            label: `${c.nombre} (Disp: ${c.stockAlmacen} ${c.unidadMedida})`,
                            stock: parseFloat(c.stockAlmacen)
                        }));
                        setConsumiblesDisponibles(opciones);
                    }
                } catch (error) {
                    console.error("Error cargando consumibles", error);
                }
            };
            fetchConsumibles();
        }
    }, [opened, selectedHallazgo]);

    // 2. Configurar el Formulario
    const form = useForm({
        initialValues: {
            tipo: 'Correctivo',
            prioridad: 'Media',
            diagnosticoTecnico: '',
            hallazgosIds: [],
            repuestosPedidos: [] // Array de { consumibleId: '', cantidad: 1 }
        },
        validate: {
            tipo: (value) => (!value ? 'Debe seleccionar el tipo' : null),
            prioridad: (value) => (!value ? 'Debe seleccionar la prioridad' : null),
            hallazgosIds: (value) => (value.length === 0 ? 'Debe seleccionar al menos una falla a reparar' : null),
            repuestosPedidos: {
                consumibleId: (value) => (!value ? 'Seleccione un repuesto' : null),
                cantidad: (value) => (value <= 0 ? 'Cantidad inválida' : null)
            }
        }
    });

    // 3. Manejadores para agregar/quitar repuestos dinámicos
    const addRepuesto = () => {
        form.insertListItem('repuestosPedidos', { consumibleId: '', cantidad: 1 });
    };

    const removeRepuesto = (index) => {
        form.removeListItem('repuestosPedidos', index);
    };

    // 4. Enviar al Backend
    const handleSubmit = async (values) => {
        setLoading(true);
        try {
            const payload = {
                activoId: activo.id,
                creadoPorId: userId,
                // asignadoAId: null, // Puedes agregarlo luego si quieres asignar mecánico de una vez
                tipo: values.tipo,
                prioridad: values.prioridad,
                diagnosticoTecnico: values.diagnosticoTecnico,
                hallazgosIds: values.hallazgosIds.map(Number),
                repuestosPedidos: values.repuestosPedidos.map(r => ({
                    consumibleId: Number(r.consumibleId),
                    cantidad: Number(r.cantidad)
                }))
            };

            // Ajusta la ruta a tu endpoint
            const res = await fetch('/api/gestionMantenimiento/om', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Error al generar la OM');

            notifications.show({
                title: data.mensaje.includes('Requisición') ? 'OM Creada (Falta Stock)' : 'OM Creada (Stock Reservado)',
                message: data.mensaje,
                color: data.mensaje.includes('Requisición') ? 'orange.6' : 'green.6',
                icon: <IconTool />
            });

            form.reset();
            onSuccess();
            onClose();

        } catch (error) {
            notifications.show({ title: 'Error', message: error.message, color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal 
            opened={opened} 
            onClose={() => { form.reset(); onClose(); }} 
            title={
                <Group gap="sm">
                    <IconTool color="#fab005" />
                    <Text fw={900} size="lg" tt="uppercase" c="white">Generar Orden de Mantenimiento (OM)</Text>
                </Group>
            } 
            size="lg" 
            centered 
            overlayProps={{ blur: 4, opacity: 0.8, color: '#212529' }} 
            styles={{ header: { backgroundColor: '#212529', borderBottom: '4px solid #fab005' }, close: { color: 'white' } }}
        >
            <form onSubmit={form.onSubmit(handleSubmit)}>
                <Stack gap="md" p="xs">
                    
                    {/* SECCIÓN 1: HALLAZGOS A ATENDER */}
                    <Box>
                        <Text fw={900} size="sm" tt="uppercase" c="dark.7" mb="xs" style={{ borderBottom: '2px solid #dee2e6' }}>
                            1. Fallas Reportadas a Solucionar
                        </Text>
                        {hallazgosPendientes && hallazgosPendientes.length > 0 ? (
                            <Paper withBorder p="sm" bg="gray.0" radius="sm">
                                <Checkbox.Group {...form.getInputProps('hallazgosIds')}>
                                    <Stack gap="xs">
                                        {hallazgosPendientes.map((h) => (
                                            <Checkbox 
                                                key={h.id} 
                                                value={h.id.toString()} 
                                                label={
                                                    <Group gap="xs">
                                                        <Text size="sm" fw={600}>{h.descripcion}</Text>
                                                        <Badge size="xs" color={h.severidad === 'Crítica' ? 'red' : 'yellow'}>{h.severidad}</Badge>
                                                    </Group>
                                                }
                                                color="dark.9"
                                            />
                                        ))}
                                    </Stack>
                                </Checkbox.Group>
                            </Paper>
                        ) : (
                            <Text size="sm" c="dimmed" fs="italic">No hay fallas pendientes. Puede crear una OM Preventiva.</Text>
                        )}
                        {form.errors.hallazgosIds && <Text c="red" size="xs" mt={4}>{form.errors.hallazgosIds}</Text>}
                    </Box>

                    {/* SECCIÓN 2: DATOS DE LA ORDEN */}
                    <Box>
                        <Text fw={900} size="sm" tt="uppercase" c="dark.7" mb="xs" style={{ borderBottom: '2px solid #dee2e6' }}>
                            2. Clasificación de la Orden
                        </Text>
                        <Group grow align="flex-start">
                            <Select 
                                label={<Text fw={700} size="xs" tt="uppercase">Tipo de Mantenimiento</Text>}
                                data={['Correctivo', 'Preventivo', 'Predictivo']}
                                radius="sm"
                                {...form.getInputProps('tipo')}
                            />
                            <Select 
                                label={<Text fw={700} size="xs" tt="uppercase">Prioridad</Text>}
                                data={[
                                    { value: 'Baja', label: 'Baja' },
                                    { value: 'Media', label: 'Media' },
                                    { value: 'Alta', label: 'Alta' },
                                    { value: 'Emergencia', label: '🚨 Emergencia (Pausa Activo)' }
                                ]}
                                radius="sm"
                                {...form.getInputProps('prioridad')}
                            />
                        </Group>
                        <Textarea 
                            mt="sm"
                            label={<Text fw={700} size="xs" tt="uppercase">Diagnóstico / Instrucciones Iniciales</Text>}
                            placeholder="Ej: Se requiere bajar el cárter y reemplazar el empacadura..."
                            minRows={3}
                            radius="sm"
                            {...form.getInputProps('diagnosticoTecnico')}
                        />
                    </Box>

                    {/* SECCIÓN 3: REPUESTOS NECESARIOS (DINÁMICO) */}
                    <Box>
                        <Group justify="space-between" align="center" mb="xs" style={{ borderBottom: '2px solid #dee2e6', paddingBottom: '4px' }}>
                            <Text fw={900} size="sm" tt="uppercase" c="dark.7">3. Lista de Repuestos Requeridos</Text>
                            <Button size="xs" variant="light" color="blue.7" leftSection={<IconPlus size={14}/>} onClick={addRepuesto} radius="sm">
                                Agregar Ítem
                            </Button>
                        </Group>

                        {form.values.repuestosPedidos.length === 0 ? (
                            <Text size="sm" c="dimmed" ta="center" py="md" fs="italic">Solo mano de obra (sin repuestos).</Text>
                        ) : (
                            <Stack gap="xs">
                                {form.values.repuestosPedidos.map((item, index) => (
                                    <Group key={index} align="flex-end" wrap="nowrap">
                                        <Select
                                            style={{ flex: 1 }}
                                            placeholder="Buscar repuesto..."
                                            data={consumiblesDisponibles}
                                            searchable
                                            radius="sm"
                                            {...form.getInputProps(`repuestosPedidos.${index}.consumibleId`)}
                                        />
                                        <NumberInput
                                            placeholder="Cant."
                                            w={80}
                                            min={0.1}
                                            step={1}
                                            radius="sm"
                                            {...form.getInputProps(`repuestosPedidos.${index}.cantidad`)}
                                        />
                                        <ActionIcon color="red" variant="subtle" size="lg" onClick={() => removeRepuesto(index)}>
                                            <IconTrash size={20} />
                                        </ActionIcon>
                                    </Group>
                                ))}
                            </Stack>
                        )}
                    </Box>

                    <Divider my="sm" />

                    <Group justify="flex-end">
                        <Button variant="subtle" color="dark.4" onClick={onClose} radius="sm" fw={700}>CANCELAR</Button>
                        <Button type="submit" color="dark.9" radius="sm" fw={800} loading={loading} leftSection={<IconDeviceFloppy size={18} color="#fab005" />}>
                            EMITIR ORDEN
                        </Button>
                    </Group>
                </Stack>
            </form>
        </Modal>
    );
}