'use client';

import { useState, useEffect } from 'react';
import {
    Stack, Group, Button, TextInput, NumberInput,
    Select, LoadingOverlay, Text, Divider
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconCalendar, IconCoin, IconReceipt2, IconBriefcase, IconTags } from '@tabler/icons-react';
import dayjs from 'dayjs';

const CATEGORIAS_ENUM = [
    'Nomina', 'Compra Repuestos', 'Servicio Externo', 
    'Combustible', 'Viaticos', 'Impuestos', 
    'Gastos Adm', 'Otros', 'Peajes'
];

export default function RegistroEgresoGeneralForm({ onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [obligaciones, setObligaciones] = useState([]);

    const form = useForm({
        initialValues: {
            fecha: new Date(),
            tipoOrigen: 'Otros', // Valor por defecto del ENUM
            obligacionPlantilla: '', // Opcional, solo para autocompletar
            descripcion: '',
            montoUsd: '',
            referencia: ''
        },
        validate: {
            fecha: (value) => (!value ? 'Requerido' : null),
            tipoOrigen: (value) => (!value ? 'Debe seleccionar una categoría' : null),
            descripcion: (value) => (!value ? 'Requerido' : null),
            montoUsd: (value) => (!value || value <= 0 ? 'Monto inválido' : null)
        }
    });

    // Cargar los gastos fijos de la configuración maestra para usarlos de autocompletado
    useEffect(() => {
        const fetchObligaciones = async () => {
            try {
                const res = await fetch('/api/configuracion/general');
                if (res.ok) {
                    const data = await res.json();
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
            } catch (error) {
                console.error("Error cargando obligaciones:", error);
            }
        };
        fetchObligaciones();
    }, []);

    // Cuando el usuario elige la plantilla, autocompletamos los campos
    const handlePlantillaChange = (val) => {
        form.setFieldValue('obligacionPlantilla', val);
        if (!val) return;
        
        const obligacion = obligaciones.find(o => o.label === val);
        if (obligacion) {
            const year = dayjs(form.values.fecha).format('YYYY');
            form.setFieldValue('descripcion', `Pago de: ${obligacion.label} - Año ${year}`);
            form.setFieldValue('montoUsd', obligacion.monto);
            
            // Autoselección inteligente básica (opcional, el usuario la puede cambiar)
            if (val.toLowerCase().includes('oficina') || val.toLowerCase().includes('gestoría')) {
                form.setFieldValue('tipoOrigen', 'Gastos Adm');
            } else {
                form.setFieldValue('tipoOrigen', 'Impuestos'); // RACDA, Permisos, etc
            }
        }
    };

    // Actualizar el año en la descripción si el usuario cambia la fecha DESPUÉS de haber elegido la plantilla
    useEffect(() => {
        if (form.values.obligacionPlantilla && form.values.descripcion.includes('Pago de:')) {
            const year = dayjs(form.values.fecha).format('YYYY');
            form.setFieldValue('descripcion', `Pago de: ${form.values.obligacionPlantilla} - Año ${year}`);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.values.fecha]);

    const handleSubmit = async (values) => {
        setLoading(true);
        try {
            const payload = {
                fechaGasto: dayjs(values.fecha).format('YYYY-MM-DD'),
                tipoOrigen: values.tipoOrigen, // Enviamos el ENUM estricto
                descripcion: values.descripcion,
                montoUsd: parseFloat(values.montoUsd),
                referenciaExterna: values.referencia,
                estado: 'Pagado'
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
                message: 'El pago ha sido añadido al libro diario exitosamente.',
                color: 'green'
            });

            form.reset();
            if (onSuccess) onSuccess(data);

        } catch (error) {
            notifications.show({ title: 'Error', message: error.message, color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ position: 'relative' }}>
            <LoadingOverlay visible={loading} />
            
            <form onSubmit={form.onSubmit(handleSubmit)}>
                <Stack gap="md">
                    <Text size="sm" c="dimmed">Registra la salida de dinero especificando su categoría contable.</Text>

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

                    <Select
                        label="Autocompletar desde Configuración (Opcional)"
                        placeholder="Ej: RACDA, Póliza, Oficina..."
                        searchable
                        clearable
                        data={obligaciones.map(o => ({ value: o.label, label: o.label }))}
                        value={form.values.obligacionPlantilla}
                        onChange={handlePlantillaChange}
                        leftSection={<IconBriefcase size={16} />}
                    />

                    <TextInput
                        label="Concepto / Descripción detallada"
                        placeholder="Ej: Compra de papelería para la oficina"
                        required
                        {...form.getInputProps('descripcion')}
                    />

                    <Group grow align="flex-start">
                        <NumberInput
                            label="Monto Pagado (USD)"
                            description="Verifique o edite el monto final pagado"
                            required
                            decimalScale={2}
                            prefix="$"
                            leftSection={<IconCoin size={16} />}
                            {...form.getInputProps('montoUsd')}
                            styles={{ input: { fontWeight: 700, color: 'var(--mantine-color-red-7)' } }}
                        />
                        <TextInput
                            label="Nro. de Referencia / Recibo"
                            placeholder="Opcional"
                            leftSection={<IconReceipt2 size={16} />}
                            {...form.getInputProps('referencia')}
                        />
                    </Group>

                    <Divider mt="sm" />
                    
                    <Group justify="flex-end">
                        <Button type="submit" color="red" leftSection={<IconCheck size={18} />}>
                            Registrar Salida de Dinero
                        </Button>
                    </Group>
                </Stack>
            </form>
        </div>
    );
}