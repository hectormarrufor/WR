'use client';

import { useState } from 'react';
import {
    Stack, Group, Button, TextInput, NumberInput,
    Select, LoadingOverlay, Text, Divider
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconCalendar, IconCoin, IconReceipt2, IconTags, IconTruck } from '@tabler/icons-react';
import dayjs from 'dayjs';

const ORIGENES_INGRESO = ['Flete', 'Servicio ODT', 'Venta Activo', 'Otros'];

export default function RegistroIngresoForm({ onSuccess }) {
    const [loading, setLoading] = useState(false);

    const form = useForm({
        initialValues: {
            fecha: new Date(),
            tipoOrigen: 'Otros',
            fleteId: '', // Requerido por tu API si el tipo es Flete
            descripcion: '',
            montoUsd: '',
            referencia: ''
        },
        validate: {
            fecha: (value) => (!value ? 'Requerido' : null),
            tipoOrigen: (value) => (!value ? 'Requerido' : null),
            descripcion: (value) => (!value ? 'Requerido' : null),
            montoUsd: (value) => (!value || value <= 0 ? 'Monto inválido' : null),
            fleteId: (value, values) => (
                values.tipoOrigen === 'Flete' && !value 
                    ? 'Debe vincular un Flete para este ingreso' 
                    : null
            )
        }
    });

    const handleSubmit = async (values) => {
        setLoading(true);
        try {
            const payload = {
                fechaIngreso: dayjs(values.fecha).format('YYYY-MM-DD'),
                tipoOrigen: values.tipoOrigen,
                descripcion: values.descripcion,
                montoUsd: parseFloat(values.montoUsd),
                referenciaExterna: values.referencia,
                estado: 'Cobrado', // Al ser un ingreso manual, asumimos que el dinero ya entró
            };

            // Solo enviamos fleteId si aplica, para no enviar strings vacíos que rompan la BD
            if (values.tipoOrigen === 'Flete' && values.fleteId) {
                payload.fleteId = parseInt(values.fleteId, 10);
            }

            const response = await fetch('/api/ingresos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Error al registrar el ingreso');

            notifications.show({
                title: 'Ingreso Registrado',
                message: 'El capital ha sido sumado a los libros exitosamente.',
                color: 'teal'
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
                    <Text size="sm" c="dimmed">Registra inyecciones de capital manuales o pagos de servicios extraordinarios.</Text>

                    <Group grow align="flex-start">
                        <DatePickerInput
                            label="Fecha del Ingreso"
                            required
                            leftSection={<IconCalendar size={16} />}
                            {...form.getInputProps('fecha')}
                        />
                        <Select
                            label="Origen del Capital"
                            data={ORIGENES_INGRESO}
                            required
                            leftSection={<IconTags size={16} />}
                            {...form.getInputProps('tipoOrigen')}
                        />
                    </Group>

                    {form.values.tipoOrigen === 'Flete' && (
                        <NumberInput
                            label="ID del Flete Asociado"
                            description="Requerido por el sistema para la trazabilidad del viaje"
                            required
                            hideControls
                            leftSection={<IconTruck size={16} />}
                            {...form.getInputProps('fleteId')}
                        />
                    )}

                    <TextInput
                        label="Concepto / Descripción"
                        placeholder="Ej: Venta de chuto Mack desincorporado"
                        required
                        {...form.getInputProps('descripcion')}
                    />

                    <Group grow align="flex-start">
                        <NumberInput
                            label="Monto Cobrado (USD)"
                            required
                            decimalScale={2}
                            prefix="$"
                            leftSection={<IconCoin size={16} />}
                            {...form.getInputProps('montoUsd')}
                            styles={{ input: { fontWeight: 700, color: 'var(--mantine-color-teal-7)' } }}
                        />
                        <TextInput
                            label="Nro. Referencia / Factura"
                            placeholder="Opcional"
                            leftSection={<IconReceipt2 size={16} />}
                            {...form.getInputProps('referencia')}
                        />
                    </Group>

                    <Divider mt="sm" />
                    
                    <Group justify="flex-end">
                        <Button type="submit" color="teal" leftSection={<IconCheck size={18} />}>
                            Registrar Entrada de Dinero
                        </Button>
                    </Group>
                </Stack>
            </form>
        </div>
    );
}