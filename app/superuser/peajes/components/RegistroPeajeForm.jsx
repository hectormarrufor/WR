'use client';

import { useState, useMemo, useEffect, useRef } from 'react'; // Agregamos useRef
import {
    Paper, Stack, Group, Button, TextInput, NumberInput,
    Select, Title, Modal, LoadingOverlay, Divider, ActionIcon, Text, Alert
} from '@mantine/core';
import { DatePickerInput, TimeInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
    IconCheck, IconAlertCircle, IconMapPin, IconPlus,
    IconReceipt2, IconCalendar, IconTractor, IconCoin, IconInfoCircle,
    IconClock
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import ODTSelectableGrid from '../../odt/ODTSelectableGrid';


export default function RegistroPeajeForm({
    empleados = [],
    peajesIniciales = [],
    fletesDisponibles = [],
    onSuccess
}) {
    const [loading, setLoading] = useState(false);
    const [fetchingTasa, setFetchingTasa] = useState(false);
    const [listaPeajes, setListaPeajes] = useState(peajesIniciales);
    const [modalPeajeOpened, setModalPeajeOpened] = useState(false);
    const [tasaManual, setTasaManual] = useState(false);
    
    // Ref para evitar bucles infinitos o peticiones duplicadas por la misma fecha
    const lastDateRef = useRef('');

    const [nuevoPeajeNombre, setNuevoPeajeNombre] = useState('');
    const [nuevoPeajeLat, setNuevoPeajeLat] = useState('');
    const [nuevoPeajeLng, setNuevoPeajeLng] = useState('');
    const [nuevoPeajeEstado, setNuevoPeajeEstado] = useState('');

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
            hora: dayjs().format('HH:mm'),
            monto: '',
            tasaBcv: '', // Iniciamos vacío para que el placeholder funcione
            referencia: '',
            fleteId: '',
            ejes: '5'
        },
        validate: {
            fecha: (value) => (!value ? 'Debe indicar la fecha' : null),
            peajeId: (value) => (!value ? 'Seleccione el peaje' : null),
            hora: (value) => (!value ? 'Requerido' : null),
            choferId: (value) => (!value ? 'Seleccione el chofer' : null),
            monto: (value) => (!value || value <= 0 ? 'Ingrese un monto válido' : null),
            tasaBcv: (value) => (!value || value <= 0 ? 'La tasa es obligatoria' : null),
            ejes: (value) => (!value ? 'Seleccione la cantidad de ejes' : null)
        }
    });

    const fetchTasa = async (fechaSeleccionada) => {
        if (!fechaSeleccionada) return;
        
        const formattedDate = dayjs(fechaSeleccionada).format('YYYY-MM-DD');
        
        // Si ya consultamos esta fecha, no hagamos nada
        if (lastDateRef.current === formattedDate) return;
        
        lastDateRef.current = formattedDate;
        setFetchingTasa(true);

        try {
            // Cambiamos el fetch para apuntar a la nueva API con la fecha específica
            const response = await fetch(`/api/bcv/obtener-por-fecha?fecha=${formattedDate}`);
            const resData = await response.json();

            // Verificamos si la respuesta fue exitosa y trajo data
            if (resData.success && resData.data && resData.data.length > 0) {
                // Tomamos la última tasa del arreglo (en caso de que hayan varias el mismo día)
                const ultimaTasa = resData.data[resData.data.length - 1];
                form.setFieldValue('tasaBcv', parseFloat(ultimaTasa.monto));
                setTasaManual(false);
            } else {
                // SOLO limpiamos si el campo está vacío o tiene el valor de una fecha anterior
                // Si el usuario ya está escribiendo, respetamos su entrada
                setTasaManual(true);
                if (!form.values.tasaBcv || form.values.tasaBcv === 0) {
                    form.setFieldValue('tasaBcv', '');
                }
            }
        } catch (error) {
            console.error("Error obteniendo tasa:", error);
            setTasaManual(true);
        } finally {
            setFetchingTasa(false);
        }
    };

    // Usamos el valor formateado como dependencia para evitar disparos por milisegundos del objeto Date
    const fechaString = dayjs(form.values.fecha).format('YYYY-MM-DD');

    useEffect(() => {
        fetchTasa(form.values.fecha);
    }, [fechaString]); 

    const montoUSD = useMemo(() => {
        const m = parseFloat(form.values.monto);
        const t = parseFloat(form.values.tasaBcv);
        if (isNaN(m) || isNaN(t) || t <= 0) return 0;
        return (m / t).toFixed(2);
    }, [form.values.monto, form.values.tasaBcv]);

    const handleCrearPeaje = async () => {
        if (!nuevoPeajeNombre.trim()) return;
        setLoading(true);
        try {
            const payload = {
                nombre: nuevoPeajeNombre,
                latitud: nuevoPeajeLat !== '' ? parseFloat(nuevoPeajeLat) : null,
                longitud: nuevoPeajeLng !== '' ? parseFloat(nuevoPeajeLng) : null,
                estado: nuevoPeajeEstado.trim() || null
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
                setNuevoPeajeEstado('');
                notifications.show({ title: 'Peaje Registrado', message: 'Añadido con éxito.', color: 'green' });
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
            const m = parseFloat(values.monto);
            const t = parseFloat(values.tasaBcv);
            const calculadoUsd = m / t;

            const payload = {
                ...values,
                fecha: dayjs(values.fecha).format('YYYY-MM-DD'),
                fleteId: values.fleteId || null,
                ejes: parseInt(values.ejes, 10),
                monto: m,
                tasaBcv: t,
                montoUsd: parseFloat(calculadoUsd.toFixed(2))
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
                message: `Ticket guardado. Equivalente a $${montoUSD}`,
                color: 'green',
                icon: <IconCheck size={18} />
            });

            form.reset();
            lastDateRef.current = ''; // Resetear la ref para permitir feticheo en el siguiente registro
            if (onSuccess) onSuccess(data);

        } catch (error) {
            notifications.show({ title: 'Error', message: error.message, color: 'red', icon: <IconAlertCircle size={18} /> });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Paper shadow="sm" p="xl" withBorder radius="md" pos="relative">
            <LoadingOverlay visible={loading || fetchingTasa} zIndex={1000} overlayProps={{ blur: 1 }} />

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
                        <TimeInput
                            label="Hora del Ticket"
                            required
                            leftSection={<IconClock size={16} />}
                            {...form.getInputProps('hora')}
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

                    <Divider label="Datos del Pago y Conversión" labelPosition="center" />

                    {tasaManual && (
                        <Alert icon={<IconInfoCircle size={16} />} title="Tasa no encontrada" color="orange" variant="light">
                            No se encontró una tasa registrada para el {dayjs(form.values.fecha).format('DD/MM/YYYY')}. Por favor, ingrésela manualmente para continuar.
                        </Alert>
                    )}

                    <Group grow align="flex-start">
                        <NumberInput
                            label="Tasa BCV"
                            placeholder="Ej: 36.45"
                            decimalScale={4}
                            required
                            disabled={!tasaManual && fetchingTasa} 
                            leftSection={<IconCoin size={16} />}
                            {...form.getInputProps('tasaBcv')}
                        />
                        <NumberInput
                            label="Monto Pagado (BS)"
                            placeholder="0.00"
                            decimalScale={2}
                            required
                            {...form.getInputProps('monto')}
                        />
                        <NumberInput
                            label="Equivalente (USD)"
                            value={montoUSD}
                            readOnly
                            variant="filled"
                            decimalScale={2}
                            prefix="$"
                            styles={{ input: { fontWeight: 700, color: 'var(--mantine-color-blue-6)' } }}
                        />
                    </Group>

                    <Group grow align="flex-start">
                        <Select
                            label="Número de Ejes"
                            placeholder="Seleccione"
                            data={['2', '3', '4', '5', '6'].map(v => ({ value: v, label: `${v} Ejes` }))}
                            required
                            leftSection={<IconTractor size={16} />}
                            {...form.getInputProps('ejes')}
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
                        placeholder="Buscar flete activo..."
                        searchable
                        clearable
                        data={fletesDisponibles.map(f => ({ value: f.id.toString(), label: `Flete #${f.nroFlete || f.codigo}` }))}
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
                    <TextInput
                        label="Estado"
                        placeholder="Ej: Zulia"
                        value={nuevoPeajeEstado}
                        onChange={(e) => setNuevoPeajeEstado(e.currentTarget.value)}
                    />
                    <Group grow>
                        <NumberInput
                            label="Latitud"
                            placeholder="10.257"
                            decimalScale={8}
                            hideControls
                            value={nuevoPeajeLat}
                            onChange={setNuevoPeajeLat}
                        />
                        <NumberInput
                            label="Longitud"
                            placeholder="-71.343"
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