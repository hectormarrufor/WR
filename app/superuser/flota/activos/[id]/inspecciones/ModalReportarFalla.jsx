'use client';
import { useState, useMemo } from 'react';
import {
    Modal, Button, TextInput, NumberInput, Select, Textarea,
    Stack, Group, Text, ActionIcon, Paper, Badge, Divider,
    SegmentedControl, Box
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconPlus, IconTrash, IconAlertTriangle, IconCheck, IconSettings } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import ModalCrearSubsistema from '../../../components/ModalCrearSubsistema';

export default function ModalReportarFalla({ opened, onClose, activo, onSuccess, userId }) {
    const [loading, setLoading] = useState(false);
    const [modalCrearSubOpened, setModalCrearSubOpened] = useState(false); // NUEVO

    // Formulario principal de la inspección
    const form = useForm({
        initialValues: {
            kilometraje: activo.kilometrajeActual || 0,
            horometro: 0,
            origen: 'Rutina',
            observacionGeneral: '',
            hallazgos: []
        },
        validate: {
            kilometraje: (val) => (val < (activo.kilometrajeActual || 0) ? 'El kilometraje no puede ser menor al actual' : null),
            hallazgos: (val) => (val.length === 0 ? 'Debe reportar al menos una observación o falla' : null)
        }
    });

    // Estado local para el "Nuevo Hallazgo"
    const [nuevoHallazgo, setNuevoHallazgo] = useState({
        descripcion: '',
        impacto: 'Operativo',
        subsistemaInstanciaId: null,
        consumibleInstaladoId: null
    });

    // 🔥 1. Opciones de Subsistemas
    const subsistemasOptions = activo.subsistemasInstancia?.map(sub => ({
        value: sub.id.toString(),
        // Buscamos el nombre en la instancia, y si no está, lo buscamos en la plantilla
        label: sub.nombre || sub.subsistemaPlantilla?.nombre || `Subsistema #${sub.id}`
    })) || [];

    // 🔥 2. Lógica de filtrado de Piezas Instaladas (Select Dependiente)
    const consumiblesOptions = useMemo(() => {
        // Extraer TODAS las instalaciones del activo agrupadas por subsistema
        const todasLasInstalaciones = activo.subsistemasInstancia?.flatMap(sub =>
            (sub.instalaciones || []).map(inst => ({
                ...inst,
                subsistemaId: sub.id,
                subsistemaNombre: sub.nombre
            }))
        ) || [];

        // Si hay un subsistema seleccionado, filtramos. Si no, mostramos todas.
        const filtradas = nuevoHallazgo.subsistemaInstanciaId
            ? todasLasInstalaciones.filter(inst => inst.subsistemaId.toString() === nuevoHallazgo.subsistemaInstanciaId)
            : todasLasInstalaciones;

        return filtradas.map(inst => {
            const nombreFicha = inst.fichaTecnica?.nombre || 'Pieza genérica';
            const serial = inst.serialFisico?.serial ? ` (SN: ${inst.serialFisico.serial})` : '';
            return {
                value: inst.id.toString(),
                label: `${nombreFicha}${serial}`,
                // Guardamos info extra para mostrar en la UI de la lista
                nombreVisual: nombreFicha
            };
        });
    }, [activo.subsistemasInstancia, nuevoHallazgo.subsistemaInstanciaId]);

    // 🔥 Opciones de Plantilla (Para el modal de Crear Al Vuelo)
    const instance = activo.vehiculoInstancia || activo.remolqueInstancia || activo.maquinaInstancia || {};
    const opcionesPlantillaSub = instance?.plantilla?.subsistemas?.map(sub => ({
        value: sub.id.toString(),
        label: sub.nombre
    })) || [];

    // Manejador al cambiar subsistema (Limpia la pieza si cambias de subsistema)
    const handleSubsistemaChange = (val) => {
        setNuevoHallazgo({
            ...nuevoHallazgo,
            subsistemaInstanciaId: val,
            consumibleInstaladoId: null // Resetear la pieza al cambiar el padre
        });
    };

    const agregarHallazgo = () => {
        if (!nuevoHallazgo.descripcion.trim()) return;

        // Buscar el nombre visual de la pieza seleccionada (para la tarjeta de abajo)
        const piezaSeleccionada = consumiblesOptions.find(o => o.value === nuevoHallazgo.consumibleInstaladoId);

        form.insertListItem('hallazgos', {
            ...nuevoHallazgo,
            nombrePiezaAux: piezaSeleccionada ? piezaSeleccionada.nombreVisual : null
        });

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
            // Limpiamos la propiedad auxiliar 'nombrePiezaAux' antes de enviar a BD
            const payloadHallazgos = values.hallazgos.map(({ nombrePiezaAux, ...resto }) => resto);

            const res = await fetch('/api/gestionMantenimiento/inspecciones', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    activoId: activo.id,
                    usuarioId: userId,
                    ...values,
                    hallazgos: payloadHallazgos
                })
            });

            const data = await res.json();
            if (data.success) {
                notifications.show({ title: 'Reporte Enviado', message: 'La inspección ha sido registrada.', color: 'green' });
                onSuccess();
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
        <Modal opened={opened} onClose={onClose} title={<Text fw={900} size="lg" tt="uppercase">Reportar Falla / Novedad</Text>} size="lg" centered>
            <form onSubmit={form.onSubmit(handleSubmit)}>
                <Stack>
                    <Paper withBorder p="md" bg="gray.0" radius="sm">
                        <Text size="xs" fw={900} c="dark.5" mb="sm" tt="uppercase">1. Telemetría de la Novedad</Text>
                        <Group grow align="flex-start">
                            <NumberInput
                                label="Kilometraje Actual"
                                placeholder="KM"
                                min={0} radius="sm"
                                {...form.getInputProps('kilometraje')}
                            />
                            <NumberInput
                                label="Horómetro Actual"
                                placeholder="Horas"
                                min={0} radius="sm"
                                {...form.getInputProps('horometro')}
                            />
                            <Select
                                label="Contexto del Reporte"
                                data={['Rutina', 'Pre-Uso', 'Post-Uso', 'Incidente']}
                                radius="sm"
                                {...form.getInputProps('origen')}
                            />
                        </Group>
                    </Paper>

                    <Divider label={<Text fw={700} c="dimmed">DETALLE DE FALLAS</Text>} labelPosition="center" />

                    <Box style={{ border: '1px solid #ced4da', borderRadius: 4, padding: 16, backgroundColor: '#f8f9fa' }}>
                        <TextInput
                            placeholder="Ej: Bote de aceite visible, ruido metálico al frenar..."
                            label={<Text fw={700} size="sm">Descripción del Problema</Text>}
                            withAsterisk
                            value={nuevoHallazgo.descripcion}
                            onChange={(e) => setNuevoHallazgo({ ...nuevoHallazgo, descripcion: e.target.value })}
                            radius="sm" mb="sm"
                        />

                        <Group grow mb="sm" align="flex-start">
                            {/* Contenedor Flex para alinear el Select y el Botón */}
                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                                <Select
                                    label={<Text fw={700} size="xs" c="dark.6">Área / Subsistema</Text>}
                                    placeholder="General / No sé"
                                    data={subsistemasOptions}
                                    value={nuevoHallazgo.subsistemaInstanciaId}
                                    onChange={handleSubsistemaChange}
                                    clearable radius="sm"
                                    style={{ flex: 1 }} // Que el select tome todo el espacio posible
                                />
                                <ActionIcon
                                    size="input-sm"
                                    color="blue.7"
                                    variant="light"
                                    onClick={() => setModalCrearSubOpened(true)}
                                    title="Crear Subsistema Nuevo"
                                >
                                    <IconPlus size={18} />
                                </ActionIcon>
                            </div>

                            <Select
                                label={<Text fw={700} size="xs" c="dark.6">Pieza Sospechosa (Opcional)</Text>}
                                placeholder={consumiblesOptions.length > 0 ? "Seleccione si la conoce" : "No hay piezas registradas"}
                                data={consumiblesOptions}
                                value={nuevoHallazgo.consumibleInstaladoId}
                                onChange={(val) => setNuevoHallazgo({ ...nuevoHallazgo, consumibleInstaladoId: val })}
                                clearable radius="sm" disabled={consumiblesOptions.length === 0} searchable
                            />
                        </Group>

                        <Stack gap={4} mb="sm">
                            <Text size="xs" fw={700} c="dark.6">Nivel de Impacto (Severidad)</Text>
                            <SegmentedControl
                                size="sm" radius="sm"
                                color={nuevoHallazgo.impacto === 'No Operativo' ? 'red' : nuevoHallazgo.impacto === 'Advertencia' ? 'yellow.6' : 'teal'}
                                data={[
                                    { label: 'Leve (Puede rodar)', value: 'Operativo' },
                                    { label: 'Advertencia', value: 'Advertencia' },
                                    { label: 'Crítico (Parar Equipo)', value: 'No Operativo' }
                                ]}
                                value={nuevoHallazgo.impacto}
                                onChange={(val) => setNuevoHallazgo({ ...nuevoHallazgo, impacto: val })}
                            />
                        </Stack>

                        <Button
                            fullWidth mt="md" variant="light" color="blue.7" radius="sm"
                            leftSection={<IconPlus size={18} />}
                            onClick={agregarHallazgo}
                            disabled={!nuevoHallazgo.descripcion}
                        >
                            ANEXAR FALLA A LA LISTA
                        </Button>
                    </Box>

                    {/* LISTA DE HALLAZGOS AGREGADOS */}
                    {form.values.hallazgos.length > 0 && (
                        <Stack gap="xs" mt="sm">
                            <Text size="xs" fw={900} tt="uppercase" c="dark.5">Borrador de Fallas ({form.values.hallazgos.length})</Text>
                            {form.values.hallazgos.map((item, index) => (
                                <Paper key={index} withBorder p="sm" shadow="xs" style={{ borderLeft: `4px solid ${item.impacto === 'No Operativo' ? '#e03131' : '#fab005'}` }}>
                                    <Group justify="space-between" align="flex-start">
                                        <Group gap="sm" style={{ flex: 1 }}>
                                            {item.impacto === 'No Operativo' ? <IconAlertTriangle color="#e03131" size={24} /> : <IconCheck color="#fab005" size={24} />}
                                            <Stack gap={0}>
                                                <Text size="sm" fw={800}>{item.descripcion}</Text>
                                                <Group gap="xs" mt={4}>
                                                    {item.subsistemaInstanciaId && (
                                                        <Badge size="xs" variant="outline" color="dark.4">
                                                            {subsistemasOptions.find(o => o.value === item.subsistemaInstanciaId)?.label}
                                                        </Badge>
                                                    )}
                                                    {item.nombrePiezaAux && (
                                                        <Badge size="xs" color="blue.7" variant="light" leftSection={<IconSettings size={10} />}>
                                                            Sospecha: {item.nombrePiezaAux}
                                                        </Badge>
                                                    )}
                                                </Group>
                                            </Stack>
                                        </Group>
                                        <ActionIcon color="red" variant="subtle" onClick={() => form.removeListItem('hallazgos', index)}>
                                            <IconTrash size={18} />
                                        </ActionIcon>
                                    </Group>
                                </Paper>
                            ))}
                        </Stack>
                    )}

                    {form.errors.hallazgos && <Text c="red" size="sm" fw={600} ta="center">{form.errors.hallazgos}</Text>}

                    <Textarea
                        label={<Text fw={700} size="sm">Observación General de la Inspección</Text>}
                        placeholder="Cualquier comentario adicional sobre el equipo..."
                        minRows={2} radius="sm"
                        {...form.getInputProps('observacionGeneral')}
                    />

                    <Group justify="flex-end" mt="md">
                        <Button variant="subtle" color="dark.4" onClick={onClose} fw={700}>Cancelar</Button>
                        <Button type="submit" loading={loading} color="red.7" size="md" radius="sm">
                            ENVIAR REPORTE AL TALLER
                        </Button>
                    </Group>
                </Stack>
            </form>
            <ModalCrearSubsistema
                opened={modalCrearSubOpened}
                onClose={() => setModalCrearSubOpened(false)}
                activoId={activo.id}
                opcionesPlantilla={opcionesPlantillaSub}
                onSuccess={(nuevoSub) => {
                    onSuccess(); // Actualiza los datos del padre (Activo)
                    // Magia: Lo auto-seleccionamos para que el usuario no tenga que buscarlo
                    setNuevoHallazgo({ ...nuevoHallazgo, subsistemaInstanciaId: nuevoSub.id.toString() });
                }}
            />
        
        </Modal >
    );
}