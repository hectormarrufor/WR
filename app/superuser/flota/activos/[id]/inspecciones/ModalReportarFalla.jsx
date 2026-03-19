'use client';
import { useState, useMemo } from 'react';
import {
    Modal, Button, TextInput, NumberInput, Textarea,
    Stack, Group, Text, ActionIcon, Paper, Badge, Divider,
    SegmentedControl, Box, Autocomplete, Collapse,
    Select,
    Checkbox
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconPlus, IconTrash, IconAlertTriangle, IconCheck, IconSettings } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

export default function ModalReportarFalla({ opened, onClose, activo, onSuccess, userId }) {
    const [loading, setLoading] = useState(false);

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
            hallazgos: (val) => (val.length === 0 ? 'Debe reportar al menos una falla' : null)
        }
    });

    // 🔥 Estado 100% Orgánico
    const [nuevoHallazgo, setNuevoHallazgo] = useState({
        descripcion: '', impacto: 'Operativo', subsistemaTexto: '', piezaTexto: '',
        cantidadSlots: 1, clasificacionPiezaNueva: 'Fungible', categoriaPiezaNueva: 'Repuesto General',
        serialesNuevos: [''], // Array dinámico de seriales
        serialesFallaIndices: [0], // 🔥 Ahora es un array para soportar múltiples checkboxes
        cantidadFallaFungible: 1,   //
        serialFallaIndex: 0,   // Índice de cuál de los seriales es el que tiene la falla
        categoriaSubsistemaNuevo: 'otros', // Valor por defecto seguro
        // 🔥 CAMPOS TÉCNICOS DINÁMICOS (Unificados para no tener 20 variables)
        marcaPieza: '',
        codigoPieza: '',
        modeloPieza: '',
        medidaPieza: '',
        amperajePieza: ''
    });

    // 1. Extraer nombres de subsistemas existentes para autocompletar
    const subsistemasExistentes = activo.subsistemasInstancia || [];
    const subsistemasNombres = subsistemasExistentes
        .map(sub => sub.nombre || sub.subsistemaPlantilla?.nombre)
        .filter(Boolean); // Filtrar nulos

    // 2. Extraer piezas del subsistema que el usuario esté tecleando (si coincide con uno existente)
    const piezasNombres = useMemo(() => {
        const subMatch = subsistemasExistentes.find(s => (s.nombre || s.subsistemaPlantilla?.nombre) === nuevoHallazgo.subsistemaTexto);
        if (!subMatch) return [];

        return (subMatch.instalaciones || [])
            .map(inst => inst.fichaTecnica?.nombre)
            .filter(Boolean);
    }, [nuevoHallazgo.subsistemaTexto, subsistemasExistentes]);

    // 3. Detectar si la pieza que está escribiendo es totalmente nueva para desplegar el "Cantidad"
    const isPiezaNueva = nuevoHallazgo.piezaTexto.trim().length > 0 && !piezasNombres.includes(nuevoHallazgo.piezaTexto);
    const isSubsistemaNuevo = nuevoHallazgo.subsistemaTexto.trim().length > 0 &&
        !subsistemasNombres.includes(nuevoHallazgo.subsistemaTexto);

    const agregarHallazgo = () => {
        if (!nuevoHallazgo.descripcion.trim()) return;

        // Búsqueda inversa: Vemos si lo que escribió es un ID o texto nuevo
        const subMatch = subsistemasExistentes.find(s => (s.nombre || s.subsistemaPlantilla?.nombre) === nuevoHallazgo.subsistemaTexto);

        let piezaMatch = null;
        if (subMatch) {
            piezaMatch = (subMatch.instalaciones || []).find(inst => inst.fichaTecnica?.nombre === nuevoHallazgo.piezaTexto);
        }

        form.insertListItem('hallazgos', {
            descripcion: nuevoHallazgo.descripcion,
            impacto: nuevoHallazgo.impacto,
            subsistemaInstanciaId: subMatch ? subMatch.id : null,
            nombreSubsistemaNuevo: subMatch ? null : (nuevoHallazgo.subsistemaTexto.trim() || null),
            categoriaSubsistemaNuevo: subMatch ? null : nuevoHallazgo.categoriaSubsistemaNuevo, // 🔥 ENVIAMOS ESTO
            consumibleInstaladoId: piezaMatch ? piezaMatch.id : null,
            nombrePiezaNueva: piezaMatch ? null : (nuevoHallazgo.piezaTexto.trim() || null),

            // 🔥 Mandamos el perfil básico a la lista
            cantidadSlots: nuevoHallazgo.cantidadSlots,
            clasificacionPiezaNueva: nuevoHallazgo.clasificacionPiezaNueva,
            categoriaPiezaNueva: nuevoHallazgo.categoriaPiezaNueva,
            serialesNuevos: nuevoHallazgo.serialesNuevos,
            serialesFallaIndices: nuevoHallazgo.serialesFallaIndices, // Array de averiados
            cantidadFallaFungible: nuevoHallazgo.cantidadFallaFungible, // Cantidad averiada
            nombreVisualSub: nuevoHallazgo.subsistemaTexto,
            nombreVisualPieza: nuevoHallazgo.piezaTextom,
            marcaPieza: nuevoHallazgo.marcaPieza.trim() || null,
            codigoPieza: nuevoHallazgo.codigoPieza.trim() || null,
            modeloPieza: nuevoHallazgo.modeloPieza.trim() || null,
            medidaPieza: nuevoHallazgo.medidaPieza.trim() || null,
            amperajePieza: nuevoHallazgo.amperajePieza || null,
        });

        setNuevoHallazgo({
            descripcion: '', impacto: 'Operativo', subsistemaTexto: '', piezaTexto: '',
            cantidadSlots: 1, clasificacionPiezaNueva: 'Fungible', categoriaPiezaNueva: 'Repuesto General',
            serialesNuevos: [''], serialesFallaIndices: [0], cantidadFallaFungible: 1,
            marcaPieza: '', codigoPieza: '', modeloPieza: '', medidaPieza: '', amperajePieza: ''
        });
    };

    // 2. Ajustamos el manejador de cantidad para no romper los índices
    const handleCantidadChange = (val) => {
        const count = Math.max(1, val || 1);
        setNuevoHallazgo(prev => {
            const nuevosSeriales = [...prev.serialesNuevos];
            while (nuevosSeriales.length < count) nuevosSeriales.push('');
            while (nuevosSeriales.length > count) nuevosSeriales.pop();

            return {
                ...prev,
                cantidadSlots: count,
                serialesNuevos: nuevosSeriales,
                // Filtramos los índices que hayan quedado fuera de rango al restar cantidad
                serialesFallaIndices: prev.serialesFallaIndices.filter(idx => idx < count),
                // Si es fungible, asegurarnos de que no reporte más fallas que el total
                cantidadFallaFungible: Math.min(prev.cantidadFallaFungible, count)
            };
        });
    };

    const handleSubmit = async (values) => {
        setLoading(true);
        try {
            // Limpiamos los auxiliares visuales antes de enviar
            const payloadHallazgos = values.hallazgos.map(({ nombreVisualSub, nombreVisualPieza, ...resto }) => resto);

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
                notifications.show({ title: 'Reporte Enviado', message: 'Fallas e inventario actualizados.', color: 'green' });
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
                            <NumberInput label="Kilometraje Actual" min={0} radius="sm" {...form.getInputProps('kilometraje')} />
                            <NumberInput label="Horómetro Actual" min={0} radius="sm" {...form.getInputProps('horometro')} />
                            <Select label="Contexto" data={['Rutina', 'Pre-Uso', 'Post-Uso', 'Incidente']} radius="sm" {...form.getInputProps('origen')} />
                        </Group>
                    </Paper>

                    <Divider label={<Text fw={700} c="dimmed">CAPTURA DE FALLA</Text>} labelPosition="center" />

                    <Box style={{ border: '1px solid #ced4da', borderRadius: 4, padding: 16, backgroundColor: '#f8f9fa' }}>
                        <TextInput
                            placeholder="Ej: Bote de aceite visible, ruido al frenar..."
                            label={<Text fw={700} size="sm">Descripción del Problema</Text>}
                            withAsterisk value={nuevoHallazgo.descripcion}
                            onChange={(e) => setNuevoHallazgo({ ...nuevoHallazgo, descripcion: e.target.value })}
                            radius="sm" mb="sm"
                        />

                        {/* 🔥 EL CORAZÓN DEL FLUJO ORGÁNICO 🔥 */}
                        <Group grow mb="sm" align="flex-start">
                            <Autocomplete
                                label={<Text fw={700} size="xs" c="dark.6">Área / Subsistema</Text>}
                                placeholder="Ej: Motor, Transmisión..."
                                data={subsistemasNombres}
                                value={nuevoHallazgo.subsistemaTexto}
                                onChange={(val) => setNuevoHallazgo({ ...nuevoHallazgo, subsistemaTexto: val, piezaTexto: '' })}
                                radius="sm"
                            />

                            <Autocomplete
                                label={<Text fw={700} size="xs" c="dark.6">Pieza Específica (Opcional)</Text>}
                                placeholder="Ej: Inyector, Compresor..."
                                data={piezasNombres}
                                value={nuevoHallazgo.piezaTexto}
                                onChange={(val) => setNuevoHallazgo({ ...nuevoHallazgo, piezaTexto: val })}
                                radius="sm"
                                disabled={!nuevoHallazgo.subsistemaTexto}
                            />
                        </Group>

                        <Collapse in={isSubsistemaNuevo}>
                            <Paper p="sm" withBorder bg="orange.0" mb="sm" style={{ borderLeft: '4px solid #f59f00' }}>
                                <Group justify="space-between" align="center">
                                    <Text size="xs" fw={700} c="orange.9">NUEVO ÁREA DETECTADA. ¿A qué categoría pertenece?</Text>
                                    <Select
                                        size="xs" w={220}
                                        data={[
                                            { value: 'motor', label: 'Motor' },
                                            { value: 'transmision', label: 'Transmisión' },
                                            { value: 'frenos', label: 'Frenos' },
                                            { value: 'tren de rodaje', label: 'Tren de Rodaje' },
                                            { value: 'suspension', label: 'Suspensión' },
                                            { value: 'electrico', label: 'Eléctrico' },
                                            { value: 'iluminacion', label: 'Iluminación' },
                                            { value: 'sistema de escape', label: 'Sistema de Escape' },
                                            { value: 'sistema hidraulico', label: 'Sistema Hidráulico' },
                                            { value: 'sistema de direccion', label: 'Sistema de Dirección' },
                                            { value: 'sistema de combustible', label: 'Sistema de Combustible' },
                                            { value: 'otros', label: 'Otros' }
                                        ]}
                                        value={nuevoHallazgo.categoriaSubsistemaNuevo}
                                        onChange={(val) => setNuevoHallazgo({ ...nuevoHallazgo, categoriaSubsistemaNuevo: val })}
                                    />
                                </Group>
                            </Paper>
                        </Collapse>
                        {/* Se despliega automáticamente si la pieza no existe en la base de datos */}
                        <Collapse in={isPiezaNueva}>
                            <Paper p="sm" withBorder bg="blue.0" mb="sm" style={{ borderLeft: '4px solid #339af0' }}>
                                <Stack gap="xs">
                                    <Text size="xs" fw={700} c="blue.9">NUEVO COMPONENTE DETECTADO. Perfil para el inventario:</Text>
                                    <Group grow align="flex-end">
                                        <NumberInput
                                            label="Cant. en el equipo"
                                            min={1} size="xs"
                                            value={nuevoHallazgo.cantidadSlots}
                                            onChange={handleCantidadChange} // 🔥 Usamos la nueva función
                                        />
                                        <Select
                                            label="Clasificación" size="xs"
                                            data={['Fungible', 'Serializado']}
                                            value={nuevoHallazgo.clasificacionPiezaNueva}
                                            onChange={(val) => setNuevoHallazgo({ ...nuevoHallazgo, clasificacionPiezaNueva: val })}
                                        />
                                        <Select
                                            label="Categoría" size="xs"
                                            data={['Repuesto General', 'Filtro', 'Correa', 'Neumatico', 'Bateria', 'Sensor']}
                                            value={nuevoHallazgo.categoriaPiezaNueva}
                                            onChange={(val) => setNuevoHallazgo({ ...nuevoHallazgo, categoriaPiezaNueva: val })}
                                        />
                                        {/* 🔥 RENDERIZADO CONDICIONAL DE CAMPOS TÉCNICOS (Opcionales) */}
                                        <Group grow align="flex-start" mt="xs">

                                            {/* CASO: Repuestos Generales, Filtros, Correas, Sensores */}
                                            {['Repuesto General', 'Filtro', 'Correa', 'Sensor'].includes(nuevoHallazgo.categoriaPiezaNueva) && (
                                                <>
                                                    <TextInput label="Marca" size="xs" placeholder="Ej: WIX, Caterpillar" value={nuevoHallazgo.marcaPieza} onChange={(e) => setNuevoHallazgo({ ...nuevoHallazgo, marcaPieza: e.target.value })} />
                                                    <TextInput label="Nro Parte / Código" size="xs" placeholder="Ej: 1R-0716" value={nuevoHallazgo.codigoPieza} onChange={(e) => setNuevoHallazgo({ ...nuevoHallazgo, codigoPieza: e.target.value })} />
                                                </>
                                            )}

                                            {/* CASO: Neumáticos */}
                                            {nuevoHallazgo.categoriaPiezaNueva === 'Neumatico' && (
                                                <>
                                                    <TextInput label="Marca" size="xs" placeholder="Ej: Firestone" value={nuevoHallazgo.marcaPieza} onChange={(e) => setNuevoHallazgo({ ...nuevoHallazgo, marcaPieza: e.target.value })} />
                                                    <TextInput label="Modelo" size="xs" placeholder="Ej: FS400" value={nuevoHallazgo.modeloPieza} onChange={(e) => setNuevoHallazgo({ ...nuevoHallazgo, modeloPieza: e.target.value })} />
                                                    <TextInput label="Medida" size="xs" placeholder="Ej: 295/80R22.5" value={nuevoHallazgo.medidaPieza} onChange={(e) => setNuevoHallazgo({ ...nuevoHallazgo, medidaPieza: e.target.value })} />
                                                </>
                                            )}

                                            {/* CASO: Baterías */}
                                            {nuevoHallazgo.categoriaPiezaNueva === 'Bateria' && (
                                                <>
                                                    <TextInput label="Marca" size="xs" placeholder="Ej: Duncan" value={nuevoHallazgo.marcaPieza} onChange={(e) => setNuevoHallazgo({ ...nuevoHallazgo, marcaPieza: e.target.value })} />
                                                    <TextInput label="Grupo" size="xs" placeholder="Ej: 24F, 4D" value={nuevoHallazgo.codigoPieza} onChange={(e) => setNuevoHallazgo({ ...nuevoHallazgo, codigoPieza: e.target.value })} />
                                                    <NumberInput label="Amperaje (CCA)" size="xs" placeholder="Ej: 800" value={nuevoHallazgo.amperajePieza} onChange={(val) => setNuevoHallazgo({ ...nuevoHallazgo, amperajePieza: val })} />
                                                </>
                                            )}

                                            {/* CASO: Aceite / Fluidos */}
                                            {nuevoHallazgo.categoriaPiezaNueva === 'Aceite' && (
                                                <>
                                                    <TextInput label="Marca" size="xs" placeholder="Ej: Motul, PDV" value={nuevoHallazgo.marcaPieza} onChange={(e) => setNuevoHallazgo({ ...nuevoHallazgo, marcaPieza: e.target.value })} />
                                                    <TextInput label="Viscosidad" size="xs" placeholder="Ej: 15W-40" value={nuevoHallazgo.medidaPieza} onChange={(e) => setNuevoHallazgo({ ...nuevoHallazgo, medidaPieza: e.target.value })} />
                                                </>
                                            )}

                                        </Group>
                                    </Group>

                                    {/* CASO A: SERIALIZADO (Checkboxes múltiples) */}
                                    {nuevoHallazgo.clasificacionPiezaNueva === 'Serializado' && (
                                        <Box mt="xs" p="xs" style={{ border: '1px dashed #74c0fc', borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.5)' }}>
                                            <Text size="xs" fw={700} mb={4} c="dark.6">
                                                Ingrese los seriales y marque (<span style={{ color: 'red' }}>☑️</span>) los que presentan falla:
                                            </Text>
                                            <Stack gap={4}>
                                                {nuevoHallazgo.serialesNuevos.map((serial, idx) => (
                                                    <Group key={idx} wrap="nowrap" align="center">
                                                        <Checkbox
                                                            color="red" size="sm"
                                                            checked={nuevoHallazgo.serialesFallaIndices.includes(idx)}
                                                            onChange={(e) => {
                                                                const isChecked = e.currentTarget.checked;
                                                                setNuevoHallazgo(prev => ({
                                                                    ...prev,
                                                                    serialesFallaIndices: isChecked
                                                                        ? [...prev.serialesFallaIndices, idx]
                                                                        : prev.serialesFallaIndices.filter(i => i !== idx)
                                                                }));
                                                            }}
                                                        />
                                                        <TextInput
                                                            placeholder={`Serial Unidad #${idx + 1}`} size="xs" style={{ flex: 1 }}
                                                            value={serial}
                                                            onChange={(e) => {
                                                                const nuevos = [...nuevoHallazgo.serialesNuevos];
                                                                nuevos[idx] = e.target.value.toUpperCase();
                                                                setNuevoHallazgo({ ...nuevoHallazgo, serialesNuevos: nuevos });
                                                            }}
                                                        />
                                                    </Group>
                                                ))}
                                            </Stack>
                                        </Box>
                                    )}

                                    {/* CASO B: FUNGIBLE (NumberInput de fallas) */}
                                    {nuevoHallazgo.clasificacionPiezaNueva === 'Fungible' && nuevoHallazgo.cantidadSlots > 1 && (
                                        <Box mt="xs" p="xs" style={{ border: '1px dashed #74c0fc', borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.5)' }}>
                                            <Group justify="space-between" align="center">
                                                <Text size="xs" fw={700} c="dark.6">¿Cuántas de estas {nuevoHallazgo.cantidadSlots} unidades están fallando?</Text>
                                                <NumberInput
                                                    size="xs" w={100} min={1} max={nuevoHallazgo.cantidadSlots}
                                                    value={nuevoHallazgo.cantidadFallaFungible}
                                                    onChange={(val) => setNuevoHallazgo({ ...nuevoHallazgo, cantidadFallaFungible: val })}
                                                />
                                            </Group>
                                        </Box>
                                    )}
                                </Stack>
                            </Paper>
                        </Collapse>

                        <Stack gap={4} mb="sm">
                            <Text size="xs" fw={700} c="dark.6">Nivel de Impacto (Severidad)</Text>
                            <SegmentedControl
                                size="sm" radius="sm"
                                color={nuevoHallazgo.impacto === 'No Operativo' ? 'red' : nuevoHallazgo.impacto === 'Advertencia' ? 'yellow.6' : 'teal'}
                                data={[{ label: 'Leve (Puede rodar)', value: 'Operativo' }, { label: 'Advertencia', value: 'Advertencia' }, { label: 'Crítico (Parar Equipo)', value: 'No Operativo' }]}
                                value={nuevoHallazgo.impacto}
                                onChange={(val) => setNuevoHallazgo({ ...nuevoHallazgo, impacto: val })}
                            />
                        </Stack>

                        <Button
                            fullWidth mt="md" variant="light" color="blue.7" radius="sm" leftSection={<IconPlus size={18} />}
                            onClick={agregarHallazgo} disabled={!nuevoHallazgo.descripcion}
                        >
                            ANEXAR FALLA
                        </Button>
                    </Box>

                    {/* BORRADOR (Lista abajo) */}
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
                                                    {item.nombreVisualSub && <Badge size="xs" variant="outline" color="dark.4">{item.nombreVisualSub}</Badge>}
                                                    {item.nombreVisualPieza && <Badge size="xs" color="blue.7" variant="light" leftSection={<IconSettings size={10} />}>{item.nombreVisualPieza}</Badge>}
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
                    <Textarea label={<Text fw={700} size="sm">Observación General</Text>} minRows={2} radius="sm" {...form.getInputProps('observacionGeneral')} />

                    <Group justify="flex-end" mt="md">
                        <Button variant="subtle" color="dark.4" onClick={onClose} fw={700}>Cancelar</Button>
                        <Button type="submit" loading={loading} color="red.7" size="md" radius="sm">ENVIAR REPORTE</Button>
                    </Group>
                </Stack>
            </form>
        </Modal>
    );
}