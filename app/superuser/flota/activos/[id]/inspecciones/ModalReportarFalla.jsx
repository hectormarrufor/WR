'use client';
import { useState, useEffect } from 'react';
import {
    Modal, Button, TextInput, NumberInput, Textarea,
    Stack, Group, Text, ActionIcon, Paper, Badge, Divider,
    SegmentedControl, Box, Autocomplete, Collapse,
    Select, Checkbox, Switch
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconPlus, IconTrash, IconAlertTriangle, IconCheck, IconSettings } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

export default function ModalReportarFalla({ opened, onClose, activo, onSuccess, userId }) {
    const [loading, setLoading] = useState(false);
    const [catalogoGlobal, setCatalogoGlobal] = useState([]);

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

    const [nuevoHallazgo, setNuevoHallazgo] = useState({
        descripcion: '', impacto: 'Operativo', subsistemaTexto: '', piezaTexto: '',
        cantidadSlots: 1, clasificacionPiezaNueva: 'Fungible', categoriaPiezaNueva: 'Repuesto General',
        serialesNuevos: [''], 
        serialesFallaIndices: [0], 
        cantidadFallaFungible: 1,   
        categoriaSubsistemaNuevo: 'otros', 
        esFaltante: false, 
        marcaPieza: '', codigoPieza: '', modeloPieza: '', medidaPieza: '', amperajePieza: '',
        diametroPieza: '', longitudPieza: '', conectoresPieza: ''
    });

    useEffect(() => {
        if (opened) {
            fetch('/api/inventario/consumibles') 
                .then(res => res.json())
                .then(data => {
                    if (data.success && data.data) {
                        setCatalogoGlobal(data.data);
                    } else if (Array.isArray(data)) {
                        setCatalogoGlobal(data);
                    }
                })
                .catch(err => console.error("Error cargando catálogo:", err));
        }
    }, [opened]);

    const subsistemasExistentes = activo.subsistemasInstancia || [];
    const subsistemasNombres = subsistemasExistentes
        .map(sub => sub.nombre || sub.subsistemaPlantilla?.nombre)
        .filter(Boolean); 

    const piezaSeleccionada = catalogoGlobal.find(c => c.nombre.toLowerCase() === nuevoHallazgo.piezaTexto.toLowerCase());
    const isPiezaNueva = nuevoHallazgo.piezaTexto.trim().length > 0 && !piezaSeleccionada;
    const isSubsistemaNuevo = nuevoHallazgo.subsistemaTexto.trim().length > 0 && !subsistemasNombres.includes(nuevoHallazgo.subsistemaTexto);

    const clasificacionEfectiva = piezaSeleccionada 
        ? (piezaSeleccionada.tipo === 'serializado' ? 'Serializado' : 'Fungible') 
        : nuevoHallazgo.clasificacionPiezaNueva;

    const agregarHallazgo = () => {
        if (!nuevoHallazgo.descripcion.trim()) return;

        if (clasificacionEfectiva === 'Serializado' && !nuevoHallazgo.esFaltante && nuevoHallazgo.serialesFallaIndices.length === 0) {
            return notifications.show({ title: 'Atención', message: 'Debe marcar al menos un serial que presente falla', color: 'orange' });
        }

        const subMatch = subsistemasExistentes.find(s => (s.nombre || s.subsistemaPlantilla?.nombre) === nuevoHallazgo.subsistemaTexto);
        const consumibleIdGlobal = piezaSeleccionada ? piezaSeleccionada.id : null;

        form.insertListItem('hallazgos', {
            descripcion: nuevoHallazgo.descripcion,
            impacto: nuevoHallazgo.impacto,
            subsistemaInstanciaId: subMatch ? subMatch.id : null,
            nombreSubsistemaNuevo: subMatch ? null : (nuevoHallazgo.subsistemaTexto.trim() || null),
            categoriaSubsistemaNuevo: subMatch ? null : nuevoHallazgo.categoriaSubsistemaNuevo, 
            consumibleIdGlobal: consumibleIdGlobal, 
            nombrePiezaNueva: consumibleIdGlobal ? null : (nuevoHallazgo.piezaTexto.trim() || null),
            cantidadSlots: nuevoHallazgo.cantidadSlots,
            clasificacionPiezaNueva: clasificacionEfectiva, 
            categoriaPiezaNueva: nuevoHallazgo.categoriaPiezaNueva,
            serialesNuevos: nuevoHallazgo.serialesNuevos,
            serialesFallaIndices: nuevoHallazgo.serialesFallaIndices, 
            cantidadFallaFungible: nuevoHallazgo.cantidadFallaFungible, 
            esFaltante: nuevoHallazgo.esFaltante, 
            nombreVisualSub: nuevoHallazgo.subsistemaTexto,
            nombreVisualPieza: nuevoHallazgo.piezaTexto,
            marcaPieza: nuevoHallazgo.marcaPieza.trim() || null,
            codigoPieza: nuevoHallazgo.codigoPieza.trim() || null,
            modeloPieza: nuevoHallazgo.modeloPieza.trim() || null,
            medidaPieza: nuevoHallazgo.medidaPieza.trim() || null,
            amperajePieza: nuevoHallazgo.amperajePieza || null,
            diametroPieza: nuevoHallazgo.diametroPieza.trim() || null,
            longitudPieza: nuevoHallazgo.longitudPieza || null, 
            conectoresPieza: nuevoHallazgo.conectoresPieza.trim() || null,
        });

        setNuevoHallazgo({
            descripcion: '', impacto: 'Operativo', subsistemaTexto: '', piezaTexto: '',
            cantidadSlots: 1, clasificacionPiezaNueva: 'Fungible', categoriaPiezaNueva: 'Repuesto General',
            serialesNuevos: [''], serialesFallaIndices: [0], cantidadFallaFungible: 1,
            esFaltante: false, 
            marcaPieza: '', codigoPieza: '', modeloPieza: '', medidaPieza: '', amperajePieza: '',
            diametroPieza: '', longitudPieza: '', conectoresPieza: '', categoriaSubsistemaNuevo: 'otros'
        });
    };

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
                serialesFallaIndices: prev.serialesFallaIndices.filter(idx => idx < count),
                cantidadFallaFungible: Math.min(prev.cantidadFallaFungible, count)
            };
        });
    };

    const handleSubmit = async (values) => {
        setLoading(true);
        try {
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
                                label={<Text fw={700} size="xs" c="dark.6">Pieza Específica (Catálogo Global)</Text>}
                                placeholder="Ej: Manguera de refrigerante 1 pulg..."
                                data={catalogoGlobal.map(c => c.nombre)}
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

                        {/* 🔥 SWITCH MOVIDO ARRIBA */}
                        {nuevoHallazgo.piezaTexto && (
                            <Box mt="xs" mb="xs">
                                <Switch 
                                    label={<Text fw={700} c="red.8">La pieza está FALTANTE (Extraviada o no instalada)</Text>}
                                    color="red"
                                    checked={nuevoHallazgo.esFaltante}
                                    onChange={(e) => setNuevoHallazgo({ ...nuevoHallazgo, esFaltante: e.currentTarget.checked })}
                                />
                            </Box>
                        )}
                        
                        <Collapse in={!!piezaSeleccionada}>
                            <Paper p="sm" withBorder bg="teal.0" mb="sm" style={{ borderLeft: '4px solid #2b8a3e' }}>
                                <Group grow align="flex-end">
                                    <NumberInput
                                        label={`Cantidad de la instalación (${piezaSeleccionada?.unidadMedida || 'und'})`}
                                        min={1} size="xs"
                                        value={nuevoHallazgo.cantidadSlots}
                                        onChange={handleCantidadChange} 
                                    />
                                    <TextInput label="Clasificación" size="xs" disabled value={clasificacionEfectiva} />
                                </Group>
                            </Paper>
                        </Collapse>

                        <Collapse in={isPiezaNueva}>
                            <Paper p="sm" withBorder bg="blue.0" mb="sm" style={{ borderLeft: '4px solid #339af0' }}>
                                <Stack gap="xs">
                                    <Text size="xs" fw={700} c="blue.9">
                                        {nuevoHallazgo.esFaltante ? "REQUERIMIENTO TÉCNICO DE LA PIEZA FALTANTE" : "NUEVO COMPONENTE DETECTADO. Perfil para el inventario:"}
                                    </Text>
                                    <Group grow align="flex-end">
                                        <NumberInput
                                            label={nuevoHallazgo.esFaltante ? "Cant. Requerida" : "Cant. en el equipo"}
                                            min={1} size="xs"
                                            value={nuevoHallazgo.cantidadSlots}
                                            onChange={handleCantidadChange} 
                                        />
                                        <Select
                                            label="Clasificación" size="xs"
                                            data={['Fungible', 'Serializado']}
                                            value={nuevoHallazgo.clasificacionPiezaNueva}
                                            onChange={(val) => setNuevoHallazgo({ ...nuevoHallazgo, clasificacionPiezaNueva: val })}
                                        />
                                        <Select
                                            label="Categoría" size="xs"
                                            data={['Repuesto General', 'Filtro', 'Correa', 'Neumatico', 'Bateria', 'Sensor', 'Manguera', 'Aceite']}
                                            value={nuevoHallazgo.categoriaPiezaNueva}
                                            onChange={(val) => setNuevoHallazgo({ ...nuevoHallazgo, categoriaPiezaNueva: val })}
                                        />
                                    </Group>

                                    <Group grow align="flex-start" mt="xs">
                                        {['Repuesto General', 'Filtro', 'Correa', 'Sensor'].includes(nuevoHallazgo.categoriaPiezaNueva) && !nuevoHallazgo.esFaltante && (
                                            <>
                                                <TextInput label="Marca" size="xs" placeholder="Ej: WIX, Caterpillar" value={nuevoHallazgo.marcaPieza} onChange={(e) => setNuevoHallazgo({ ...nuevoHallazgo, marcaPieza: e.target.value })} />
                                                <TextInput label="Nro Parte / Código" size="xs" placeholder="Ej: 1R-0716" value={nuevoHallazgo.codigoPieza} onChange={(e) => setNuevoHallazgo({ ...nuevoHallazgo, codigoPieza: e.target.value })} />
                                            </>
                                        )}

                                        {nuevoHallazgo.categoriaPiezaNueva === 'Manguera' && (
                                            <>
                                                <TextInput 
                                                    label="Diámetro" size="xs" placeholder="Ej: 1/2" rightSection={<Text size="xs" c="dimmed" mr="xs">pulg.</Text>}
                                                    value={nuevoHallazgo.diametroPieza} onChange={(e) => setNuevoHallazgo({ ...nuevoHallazgo, diametroPieza: e.target.value })} 
                                                />
                                                <NumberInput 
                                                    label="Longitud (Catálogo)" size="xs" placeholder="Ej: 150" suffix=" cm" min={1}
                                                    value={nuevoHallazgo.longitudPieza} onChange={(val) => setNuevoHallazgo({ ...nuevoHallazgo, longitudPieza: val })} 
                                                />
                                                <TextInput 
                                                    label="Conectores" size="xs" placeholder="Ej: Recto a 90°" 
                                                    value={nuevoHallazgo.conectoresPieza} onChange={(e) => setNuevoHallazgo({ ...nuevoHallazgo, conectoresPieza: e.target.value })} 
                                                />
                                            </>
                                        )}

                                        {nuevoHallazgo.categoriaPiezaNueva === 'Neumatico' && (
                                            <>
                                                {!nuevoHallazgo.esFaltante && <TextInput label="Marca" size="xs" placeholder="Ej: Firestone" value={nuevoHallazgo.marcaPieza} onChange={(e) => setNuevoHallazgo({ ...nuevoHallazgo, marcaPieza: e.target.value })} />}
                                                {!nuevoHallazgo.esFaltante && <TextInput label="Modelo" size="xs" placeholder="Ej: FS400" value={nuevoHallazgo.modeloPieza} onChange={(e) => setNuevoHallazgo({ ...nuevoHallazgo, modeloPieza: e.target.value })} />}
                                                <TextInput label="Medida (Requerida)" size="xs" placeholder="Ej: 295/80R22.5" value={nuevoHallazgo.medidaPieza} onChange={(e) => setNuevoHallazgo({ ...nuevoHallazgo, medidaPieza: e.target.value })} />
                                            </>
                                        )}

                                        {nuevoHallazgo.categoriaPiezaNueva === 'Bateria' && (
                                            <>
                                                {!nuevoHallazgo.esFaltante && <TextInput label="Marca" size="xs" placeholder="Ej: Duncan" value={nuevoHallazgo.marcaPieza} onChange={(e) => setNuevoHallazgo({ ...nuevoHallazgo, marcaPieza: e.target.value })} />}
                                                <TextInput label="Grupo / Tamaño" size="xs" placeholder="Ej: 24F, 4D, 8D" value={nuevoHallazgo.codigoPieza} onChange={(e) => setNuevoHallazgo({ ...nuevoHallazgo, codigoPieza: e.target.value })} />
                                                <NumberInput label="Amperaje (CCA)" size="xs" placeholder="Ej: 800" value={nuevoHallazgo.amperajePieza} onChange={(val) => setNuevoHallazgo({ ...nuevoHallazgo, amperajePieza: val })} />
                                            </>
                                        )}

                                        {nuevoHallazgo.categoriaPiezaNueva === 'Aceite' && (
                                            <>
                                                {!nuevoHallazgo.esFaltante && <TextInput label="Marca" size="xs" placeholder="Ej: Motul, PDV" value={nuevoHallazgo.marcaPieza} onChange={(e) => setNuevoHallazgo({ ...nuevoHallazgo, marcaPieza: e.target.value })} />}
                                                <TextInput label="Viscosidad" size="xs" placeholder="Ej: 15W-40" value={nuevoHallazgo.medidaPieza} onChange={(e) => setNuevoHallazgo({ ...nuevoHallazgo, medidaPieza: e.target.value })} />
                                            </>
                                        )}
                                    </Group>
                                </Stack>
                            </Paper>
                        </Collapse>

                        {nuevoHallazgo.piezaTexto && !nuevoHallazgo.esFaltante && clasificacionEfectiva === 'Serializado' && (
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

                        {nuevoHallazgo.piezaTexto && !nuevoHallazgo.esFaltante && clasificacionEfectiva === 'Fungible' && nuevoHallazgo.cantidadSlots > 1 && (
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

                        <Stack gap={4} mb="sm" mt="md">
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
                                                    {item.esFaltante && <Badge size="xs" color="red" variant="filled">FALTANTE</Badge>}
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