'use client';

import { useState, useMemo, useEffect } from 'react';
import { 
    Paper, Stack, Group, Button, TextInput, NumberInput, 
    Select, Title, Modal, LoadingOverlay, Divider, ActionIcon, Text
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconAlertCircle, IconMapPin, IconPlus, IconReceipt2, IconCalendar, IconTractor } from '@tabler/icons-react';
import dayjs from 'dayjs';
import ODTSelectableGrid from '../../odt/ODTSelectableGrid';


export default function RegistroPeajeForm({ 
    empleados = [], 
    peajesIniciales = [], 
    fletesDisponibles = [], 
    onSuccess 
}) {

    console.log("Fletes dosponibles en RegistroPeajeForm:", fletesDisponibles); // Debug: Ver qué fletes llegan al formulario
    const [loading, setLoading] = useState(false);
    
    const [listaPeajes, setListaPeajes] = useState(peajesIniciales);
    const [modalPeajeOpened, setModalPeajeOpened] = useState(false);
    
    // Estados para el nuevo peaje
    const [nuevoPeajeNombre, setNuevoPeajeNombre] = useState('');
    const [nuevoPeajeLat, setNuevoPeajeLat] = useState('');
    const [nuevoPeajeLng, setNuevoPeajeLng] = useState('');

    const choferesParaGrid = useMemo(() => {
        return empleados.map(e => ({
            id: e.id.toString(),
            nombre: `${e.nombre} ${e.apellido}`,
            imagen: e.fotoPerfil || e.imagen,
            raw: e
        }));
    }, [empleados]);

    const form = useForm({
        initialValues: {
            fecha: new Date(),
            peajeId: '',
            choferId: '',
            monto: '',
            referencia: '',
            fleteId: '',
            ejes: '5' // <-- NUEVO: Valor por defecto
        },
        validate: {
            fecha: (value) => (!value ? 'Debe indicar la fecha' : null),
            peajeId: (value) => (!value ? 'Seleccione el peaje' : null),
            choferId: (value) => (!value ? 'Seleccione el chofer' : null),
            monto: (value) => (!value || value <= 0 ? 'Ingrese un monto válido' : null),
            ejes: (value) => (!value ? 'Seleccione la cantidad de ejes' : null) // <-- NUEVO: Validación
        }
    });

    const handleCrearPeaje = async () => {
        if (!nuevoPeajeNombre.trim()) return;
        setLoading(true);
        try {
            const payload = {
                nombre: nuevoPeajeNombre,
                latitud: nuevoPeajeLat !== '' ? parseFloat(nuevoPeajeLat) : null,
                longitud: nuevoPeajeLng !== '' ? parseFloat(nuevoPeajeLng) : null
            };

            const response = await fetch('/api/peajes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const res = await response.json();
            
            if (res.success) {
                const nuevo = res.data;
                setListaPeajes(prev => [...prev, nuevo]);
                form.setFieldValue('peajeId', nuevo.id.toString());
                
                setModalPeajeOpened(false);
                setNuevoPeajeNombre('');
                setNuevoPeajeLat('');
                setNuevoPeajeLng('');
                
                notifications.show({ title: 'Peaje Registrado', message: 'Añadido a la base de datos con éxito.', color: 'green' });
            } else throw new Error(res.error);
        } catch (error) {
            notifications.show({ title: 'Error', message: error.message, color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (values) => {
        setLoading(true);
        try {
            const payload = {
                ...values,
                fecha: dayjs(values.fecha).format('YYYY-MM-DD'),
                fleteId: values.fleteId || null,
                ejes: parseInt(values.ejes, 10) // <-- NUEVO: Aseguramos que se envíe como número entero
            };

            const response = await fetch('/api/peajes/tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Error al registrar ticket');

            notifications.show({ 
                title: 'Registro Exitoso', 
                message: 'Ticket guardado y enlazado a gastos de tesorería.', 
                color: 'green', 
                icon: <IconCheck size={18} /> 
            });
            
            form.reset();
            if (onSuccess) onSuccess(data);

        } catch (error) {
            notifications.show({ 
                title: 'Error', 
                message: error.message, 
                color: 'red', 
                icon: <IconAlertCircle size={18} /> 
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Paper shadow="sm" p="xl" withBorder radius="md" pos="relative">
            <LoadingOverlay visible={loading} zIndex={1000} />
            
            <form onSubmit={form.onSubmit(handleSubmit)}>
                <Stack gap="lg">
                    <Title order={3} c="blue.8">Registrar Ticket de Peaje</Title>

                    <Group grow align="flex-start">
                        <DatePickerInput
                            label="Fecha del Ticket"
                            placeholder="Seleccione la fecha"
                            required
                            leftSection={<IconCalendar size={16} />}
                            {...form.getInputProps('fecha')}
                        />
                        
                        <Group align="flex-end" gap="xs">
                            <Select
                                label="Estación de Peaje"
                                placeholder="Buscar peaje..."
                                searchable
                                required
                                style={{ flex: 1 }}
                                leftSection={<IconMapPin size={16} />}
                                data={listaPeajes.map(p => ({ value: p.id.toString(), label: p.nombre }))}
                                {...form.getInputProps('peajeId')}
                            />
                            <ActionIcon 
                                variant="light" 
                                color="blue" 
                                size="lg" 
                                mb={2}
                                onClick={() => setModalPeajeOpened(true)}
                                title="Añadir nuevo peaje"
                            >
                                <IconPlus size={20} />
                            </ActionIcon>
                        </Group>
                    </Group>

                    <Paper p="md" bg="gray.0" radius="md" withBorder>
                        <ODTSelectableGrid
                            label="Chofer que realizó el pago"
                            data={choferesParaGrid}
                            value={form.values.choferId}
                            onChange={(val) => form.setFieldValue('choferId', val || '')}
                            showMetrics={false}
                        />
                        {form.errors.choferId && <Text c="red" size="xs" mt={4}>{form.errors.choferId}</Text>}
                    </Paper>

                    <Divider label="Datos del Pago" labelPosition="center" />

                    <Group grow align="flex-start">
                        {/* <-- NUEVO CAMPO: Selector de Ejes --> */}
                        <Select
                            label="Número de Ejes"
                            placeholder="Seleccione"
                            data={[
                                { value: '2', label: '2 Ejes' },
                                { value: '3', label: '3 Ejes' },
                                { value: '4', label: '4 Ejes' },
                                { value: '5', label: '5 Ejes' },
                                { value: '6', label: '6 Ejes' },
                            ]}
                            required
                            leftSection={<IconTractor size={16} />}
                            {...form.getInputProps('ejes')}
                        />
                        <NumberInput
                            label="Monto Pagado"
                            placeholder="0.00"
                            decimalScale={2}
                            prefix="$"
                            required
                            {...form.getInputProps('monto')}
                        />
                        <TextInput
                            label="Nro. Referencia / Ticket"
                            placeholder="Ej: 00012345"
                            leftSection={<IconReceipt2 size={16} />}
                            {...form.getInputProps('referencia')}
                        />
                    </Group>

                    <Select
                        label="Enlazar a Flete (Opcional)"
                        description="Si aún no se ha creado el flete, puede dejarlo en blanco y enlazarlo posteriormente."
                        placeholder="Buscar flete activo..."
                        searchable
                        clearable
                        data={fletesDisponibles.map(f => ({ value: f.id.toString(), label: `Flete #${f.codigo} - ${f.rutaNombre || 'Sin ruta'}` }))}
                        {...form.getInputProps('fleteId')}
                    />

                    <Group justify="right" mt="md">
                        <Button type="submit" color="blue" leftSection={<IconCheck size={18} />}>
                            Guardar Registro
                        </Button>
                    </Group>
                </Stack>
            </form>

            <Modal opened={modalPeajeOpened} onClose={() => setModalPeajeOpened(false)} title={<Text fw={700} size="lg">Nuevo Peaje</Text>} centered>
                <Stack>
                    <TextInput
                        label="Nombre del Peaje"
                        placeholder="Ej: Peaje La Chinita"
                        value={nuevoPeajeNombre}
                        onChange={(e) => setNuevoPeajeNombre(e.currentTarget.value)}
                        required
                    />
                    <Group grow>
                        <NumberInput
                            label="Latitud (lat)"
                            placeholder="10.257083"
                            decimalScale={8}
                            hideControls
                            value={nuevoPeajeLat}
                            onChange={setNuevoPeajeLat}
                        />
                        <NumberInput
                            label="Longitud (lng)"
                            placeholder="-71.343111"
                            decimalScale={8}
                            hideControls
                            value={nuevoPeajeLng}
                            onChange={setNuevoPeajeLng}
                        />
                    </Group>
                    <Button onClick={handleCrearPeaje} color="blue" fullWidth mt="md">Guardar y Seleccionar</Button>
                </Stack>
            </Modal>
        </Paper>
    );
}