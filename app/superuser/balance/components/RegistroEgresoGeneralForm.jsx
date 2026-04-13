'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import {
    Stack, Group, Button, TextInput, NumberInput,
    Select, LoadingOverlay, Text, Divider, ActionIcon, Modal, SimpleGrid, Textarea, Alert
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { 
    IconCheck, IconCalendar, IconCoin, IconReceipt2, 
    IconBriefcase, IconTags, IconBuildingStore, IconPlus, IconInfoCircle 
} from '@tabler/icons-react';
import dayjs from 'dayjs';

const CATEGORIAS_ENUM = [
    'Nomina', 'Compra Repuestos', 'Servicio Externo', 
    'Combustible', 'Viaticos', 'Impuestos', 
    'Gastos Adm', 'Otros', 'Peajes'
];

export default function RegistroEgresoGeneralForm({ onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [obligaciones, setObligaciones] = useState([]);
    
    // Estados para Proveedores
    const [proveedores, setProveedores] = useState([]);
    const [modalProvOpened, setModalProvOpened] = useState(false);
    const [nuevoProv, setNuevoProv] = useState({
        nombre: '', rif: '', contacto: '', telefono: '', email: '', direccion: '', notas: ''
    });

    // 🔥 Estados para la Tasa BCV 🔥
    const [fetchingTasa, setFetchingTasa] = useState(false);
    const [tasaManual, setTasaManual] = useState(false);
    const lastDateRef = useRef('');

    const form = useForm({
        initialValues: {
            fecha: new Date(),
            tipoOrigen: 'Otros',
            obligacionPlantilla: '',
            proveedorId: '', 
            descripcion: '',
            moneda: 'USD', // Nueva variable de control
            montoInput: '', // Monto base introducido por el usuario
            tasaBcv: '',
            referencia: ''
        },
        validate: {
            fecha: (value) => (!value ? 'Requerido' : null),
            tipoOrigen: (value) => (!value ? 'Debe seleccionar una categoría' : null),
            descripcion: (value) => (!value ? 'Requerido' : null),
            montoInput: (value) => (!value || value <= 0 ? 'Monto inválido' : null),
            tasaBcv: (value) => (!value || value <= 0 ? 'La tasa es obligatoria' : null),
        }
    });

    // ==========================================
    // CARGA DE DATOS INICIALES (Plantillas y Prov)
    // ==========================================
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [resConfig, resProv] = await Promise.all([
                    fetch('/api/configuracion/general').catch(() => null),
                    fetch('/api/compras/proveedores').catch(() => null)
                ]);

                if (resConfig && resConfig.ok) {
                    const data = await resConfig.json();
                    const lista = [];
                    if (data.gastosOficinaMensual) lista.push({ label: 'Gastos de Oficina', monto: Number(data.gastosOficinaMensual) });
                    if (data.pagosGestoriaPermisos) lista.push({ label: 'Gestoría y Permisos', monto: Number(data.pagosGestoriaPermisos) });
                    if (data.gastosFijos && Array.isArray(data.gastosFijos)) {
                        data.gastosFijos.forEach(g => {
                            lista.push({ label: g.descripcion, monto: Number(g.montoAnual) || 0 });
                        });
                    }
                    setObligaciones(lista);
                }

                if (resProv && resProv.ok) {
                    const dataProv = await resProv.json();
                    if (dataProv.success && Array.isArray(dataProv.data)) {
                        setProveedores(dataProv.data.map(p => ({ 
                            value: p.id.toString(), 
                            label: p.nombre 
                        })));
                    }
                }
            } catch (error) {
                console.error("Error cargando datos:", error);
            }
        };
        fetchData();
    }, []);

    // ==========================================
    // LÓGICA DE TASA BCV
    // ==========================================
    const fetchTasa = async (fechaSeleccionada) => {
        if (!fechaSeleccionada) return;

        const formattedDate = dayjs(fechaSeleccionada).format('YYYY-MM-DD');

        if (lastDateRef.current === formattedDate) return;

        lastDateRef.current = formattedDate;
        setFetchingTasa(true);

        try {
            const response = await fetch(`/api/bcv/obtener-por-fecha?fecha=${formattedDate}`);
            const resData = await response.json();

            if (resData.success && resData.data && resData.data.length > 0) {
                const ultimaTasa = resData.data[resData.data.length - 1];
                form.setFieldValue('tasaBcv', parseFloat(ultimaTasa.monto));
                setTasaManual(false);
            } else {
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

    const fechaString = dayjs(form.values.fecha).format('YYYY-MM-DD');
    useEffect(() => {
        fetchTasa(form.values.fecha);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fechaString]);

    // Cálculo dinámico del equivalente
    const montosCalculados = useMemo(() => {
        const m = parseFloat(form.values.montoInput);
        const t = parseFloat(form.values.tasaBcv);
        
        if (isNaN(m) || isNaN(t) || t <= 0) return { usd: 0, bs: 0 };
        
        if (form.values.moneda === 'USD') {
            return { usd: m.toFixed(2), bs: (m * t).toFixed(2) };
        } else {
            return { usd: (m / t).toFixed(2), bs: m.toFixed(2) };
        }
    }, [form.values.montoInput, form.values.tasaBcv, form.values.moneda]);

    // ==========================================
    // MANEJADORES DE ACCIONES
    // ==========================================
    const handlePlantillaChange = (val) => {
        form.setFieldValue('obligacionPlantilla', val);
        if (!val) return;
        
        const obligacion = obligaciones.find(o => o.label === val);
        if (obligacion) {
            const year = dayjs(form.values.fecha).format('YYYY');
            form.setFieldValue('descripcion', `Pago de: ${obligacion.label} - Año ${year}`);
            form.setFieldValue('moneda', 'USD'); // Las plantillas están en USD por defecto
            form.setFieldValue('montoInput', obligacion.monto);
            
            if (val.toLowerCase().includes('oficina') || val.toLowerCase().includes('gestoría')) {
                form.setFieldValue('tipoOrigen', 'Gastos Adm');
            } else {
                form.setFieldValue('tipoOrigen', 'Impuestos');
            }
        }
    };

    useEffect(() => {
        if (form.values.obligacionPlantilla && form.values.descripcion.includes('Pago de:')) {
            const year = dayjs(form.values.fecha).format('YYYY');
            form.setFieldValue('descripcion', `Pago de: ${form.values.obligacionPlantilla} - Año ${year}`);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.values.fecha]);

    const handleCrearProveedor = async () => {
        if (!nuevoProv.nombre.trim()) {
            notifications.show({ title: 'Error', message: 'El nombre comercial es obligatorio', color: 'red' });
            return;
        }
        
        setLoading(true);
        try {
            const res = await fetch('/api/compras/proveedores', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(nuevoProv)
            });
            const data = await res.json();

            if (data.success) {
                const nuevoItem = { value: data.data.id.toString(), label: data.data.nombre };
                setProveedores(prev => [...prev, nuevoItem].sort((a, b) => a.label.localeCompare(b.label)));
                form.setFieldValue('proveedorId', nuevoItem.value);
                setNuevoProv({ nombre: '', rif: '', contacto: '', telefono: '', email: '', direccion: '', notas: '' });
                setModalProvOpened(false);
                notifications.show({ title: 'Éxito', message: 'Proveedor creado y seleccionado.', color: 'green' });
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            notifications.show({ title: 'Error', message: error.message, color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (values) => {
        setLoading(true);
        try {
            const m = parseFloat(values.montoInput);
            const t = parseFloat(values.tasaBcv);
            const isUsd = values.moneda === 'USD';

            const payload = {
                fechaGasto: dayjs(values.fecha).format('YYYY-MM-DD'),
                tipoOrigen: values.tipoOrigen,
                descripcion: values.descripcion,
                
                // 🔥 Inyección Multidivisa 🔥
                montoUsd: isUsd ? m : parseFloat((m / t).toFixed(2)),
                montoBs: isUsd ? parseFloat((m * t).toFixed(2)) : m,
                tasaBcv: t,

                referenciaExterna: values.referencia,
                estado: 'Pagado',
                proveedorId: values.proveedorId ? parseInt(values.proveedorId, 10) : null 
            };

            const response = await fetch('/api/gastos-variables', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Error al registrar egreso');

            notifications.show({
                title: 'Egreso Registrado',
                message: `El pago de $${payload.montoUsd} ha sido registrado.`,
                color: 'green'
            });

            form.reset();
            lastDateRef.current = ''; 
            if (onSuccess) onSuccess(data);

        } catch (error) {
            notifications.show({ title: 'Error', message: error.message, color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ position: 'relative' }}>
            <LoadingOverlay visible={loading || fetchingTasa} />
            
            <form onSubmit={form.onSubmit(handleSubmit)}>
                <Stack gap="md">
                    <Text size="sm" c="dimmed">Registra la salida de dinero especificando su categoría contable y proveedor directo.</Text>

                    <Group grow align="flex-start">
                        <DatePickerInput
                            label="Fecha del Pago"
                            required
                            leftSection={<IconCalendar size={16} />}
                            {...form.getInputProps('fecha')}
                        />
                        <Select
                            label="Categoría del Gasto"
                            data={CATEGORIAS_ENUM}
                            required
                            searchable
                            leftSection={<IconTags size={16} />}
                            {...form.getInputProps('tipoOrigen')}
                        />
                    </Group>

                    <Group grow align="flex-start">
                        <Select
                            label="Autocompletar Obligación Anual"
                            placeholder="Opcional..."
                            searchable
                            clearable
                            data={obligaciones.map(o => ({ value: o.label, label: o.label }))}
                            value={form.values.obligacionPlantilla}
                            onChange={handlePlantillaChange}
                            leftSection={<IconBriefcase size={16} />}
                        />
                        
                        <Group align="flex-end" gap="xs">
                            <Select
                                label="Proveedor / Beneficiario"
                                placeholder="Opcional (Compra directa)"
                                searchable
                                clearable
                                data={proveedores}
                                style={{ flex: 1 }}
                                leftSection={<IconBuildingStore size={16} />}
                                {...form.getInputProps('proveedorId')}
                            />
                            <ActionIcon 
                                variant="light" 
                                color="red" 
                                size="lg" 
                                mb={2} 
                                onClick={() => setModalProvOpened(true)}
                                title="Añadir nuevo proveedor"
                            >
                                <IconPlus size={20} />
                            </ActionIcon>
                        </Group>
                    </Group>

                    <TextInput
                        label="Concepto / Descripción detallada"
                        placeholder="Ej: Compra de kit de embrague - Chuto Mack A123BC"
                        required
                        {...form.getInputProps('descripcion')}
                    />

                    <Divider label="Datos del Pago y Conversión BCV" labelPosition="center" />

                    {tasaManual && (
                        <Alert icon={<IconInfoCircle size={16} />} title="Tasa no encontrada" color="orange" variant="light">
                            No se encontró una tasa registrada para el {dayjs(form.values.fecha).format('DD/MM/YYYY')}. Por favor, ingrésela manualmente.
                        </Alert>
                    )}

                    <Group grow align="flex-start">
                        <Select
                            label="Moneda Pagada"
                            data={[{ value: 'USD', label: 'Dólares (USD)' }, { value: 'BS', label: 'Bolívares (BS)' }]}
                            required
                            {...form.getInputProps('moneda')}
                        />
                        <NumberInput
                            label="Monto Pagado"
                            required
                            decimalScale={2}
                            prefix={form.values.moneda === 'USD' ? "$" : "Bs "}
                            leftSection={<IconCoin size={16} />}
                            {...form.getInputProps('montoInput')}
                            styles={{ input: { fontWeight: 700, color: 'var(--mantine-color-red-7)' } }}
                        />
                        <NumberInput
                            label="Tasa BCV"
                            placeholder="Ej: 36.45"
                            decimalScale={4}
                            required
                            disabled={!tasaManual && fetchingTasa}
                            {...form.getInputProps('tasaBcv')}
                        />
                    </Group>

                    {/* Mostramos el equivalente visualmente para que el usuario esté seguro de la conversión */}
                    <Text size="sm" ta="right" c="dimmed" fw={600}>
                        Equivalente en sistema: <Text component="span" c="blue.7" fw={800}>
                            {form.values.moneda === 'USD' ? `Bs. ${montosCalculados.bs}` : `$${montosCalculados.usd}`}
                        </Text>
                    </Text>

                    <TextInput
                        label="Nro. de Referencia / Factura"
                        placeholder="Opcional"
                        leftSection={<IconReceipt2 size={16} />}
                        {...form.getInputProps('referencia')}
                    />

                    <Divider mt="xs" />
                    
                    <Group justify="flex-end">
                        <Button type="submit" color="red" leftSection={<IconCheck size={18} />}>
                            Registrar Salida de Dinero
                        </Button>
                    </Group>
                </Stack>
            </form>

            <Modal opened={modalProvOpened} onClose={() => setModalProvOpened(false)} title={<Text fw={700} size="lg">Nuevo Proveedor</Text>} centered size="lg" zIndex={2000}>
                <Stack>
                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                        <TextInput label="Nombre Comercial" value={nuevoProv.nombre} onChange={(e) => setNuevoProv({ ...nuevoProv, nombre: e.currentTarget.value })} required withAsterisk />
                        <TextInput label="RIF" value={nuevoProv.rif} onChange={(e) => setNuevoProv({ ...nuevoProv, rif: e.currentTarget.value })} />
                        <TextInput label="Persona de Contacto" value={nuevoProv.contacto} onChange={(e) => setNuevoProv({ ...nuevoProv, contacto: e.currentTarget.value })} />
                        <TextInput label="Teléfono" value={nuevoProv.telefono} onChange={(e) => setNuevoProv({ ...nuevoProv, telefono: e.currentTarget.value })} />
                    </SimpleGrid>
                    <TextInput label="Email" value={nuevoProv.email} onChange={(e) => setNuevoProv({ ...nuevoProv, email: e.currentTarget.value })} />
                    <TextInput label="Dirección Física" value={nuevoProv.direccion} onChange={(e) => setNuevoProv({ ...nuevoProv, direccion: e.currentTarget.value })} />
                    <Textarea label="Notas Internas" value={nuevoProv.notas} onChange={(e) => setNuevoProv({ ...nuevoProv, notas: e.currentTarget.value })} minRows={2} />
                    <Button onClick={handleCrearProveedor} color="red" fullWidth mt="md" leftSection={<IconCheck size={16} />}>Guardar y Seleccionar</Button>
                </Stack>
            </Modal>
        </div>
    );
}