'use client';

import { useState } from 'react';
import { Modal, NumberInput, TextInput, Button, Group, Stack, LoadingOverlay, Text, Alert } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconAlertCircle, IconTruckDelivery, IconInfoCircle } from '@tabler/icons-react';

export default function ModalComprarGasoil({ opened, onClose, onSuccess, tanqueId, stockActual, capacidadMaxima }) {
    const [loading, setLoading] = useState(false);

    const max = Number(capacidadMaxima) || 8000;
    const actual = Number(stockActual) || 0;
    const espacioDisponible = max - actual;

    const form = useForm({
        initialValues: {
            cantidad: '',
            costoTotal: '',
            observacion: 'Recepción de gandola de gasoil'
        },
        validate: {
            cantidad: (value) => {
                const valNum = Number(value);
                if (!valNum || valNum <= 0) return 'Ingrese una cantidad válida';
                if (valNum > espacioDisponible) return 'Límite excedido'; // El mensaje visual lo da la Alerta
                return null;
            },
            costoTotal: (value) => (!value || value <= 0 ? 'Ingrese el costo total de la factura' : null)
        }
    });

    const costoUnitarioCalculado = (form.values.cantidad && form.values.costoTotal) 
        ? (parseFloat(form.values.costoTotal) / parseFloat(form.values.cantidad)).toFixed(3) 
        : '0.000';

    const handleSubmit = async (values) => {
        setLoading(true);
        try {
            const payload = { consumibleId: tanqueId, ...values };

            const response = await fetch('/api/inventario/consumibles/comprar-gasoil', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Error al registrar la compra');

            notifications.show({ title: 'Inventario Actualizado', message: `Se han sumado ${values.cantidad}L al tanque.`, color: 'green', icon: <IconCheck size={18} /> });
            form.reset();
            onSuccess();
            onClose();

        } catch (error) {
            notifications.show({ title: 'Error de Registro', message: error.message, color: 'red', icon: <IconAlertCircle size={18} /> });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal opened={opened} onClose={onClose} title={<Text fw={700} size="lg" c="blue.8">Registrar Ingreso de Gasoil</Text>} centered>
            <LoadingOverlay visible={loading} />
            <form onSubmit={form.onSubmit(handleSubmit)}>
                <Stack gap="md">

                    <Alert variant="light" color="blue" icon={<IconInfoCircle size={16} />}>
                        Espacio disponible en tanque: <Text component="span" fw={800}>{espacioDisponible.toLocaleString()} L</Text>
                    </Alert>

                    {/* 🔥 ALERTA ROJA VISUAL SI SE PASA DEL LÍMITE 🔥 */}
                    {Number(form.values.cantidad) > espacioDisponible && (
                        <Alert variant="filled" color="red" icon={<IconAlertCircle size={16} />}>
                            No puedes meter {form.values.cantidad} litros. El tanque de la base solo tiene espacio para {espacioDisponible.toLocaleString()} L.
                        </Alert>
                    )}

                    <Group grow>
                        <NumberInput
                            label="Litros Recibidos"
                            placeholder="Ej: 10000"
                            suffix=" L"
                            min={1}
                            decimalScale={2}
                            withAsterisk
                            {...form.getInputProps('cantidad')}
                        />
                        <NumberInput
                            label="Costo Total ($)"
                            placeholder="Costo de la factura"
                            prefix="$"
                            min={0.01}
                            decimalScale={2}
                            withAsterisk
                            {...form.getInputProps('costoTotal')}
                        />
                    </Group>

                    <Text size="sm" c="dimmed" ta="right">Costo por litro estimado: <Text component="span" fw={700} c="blue">${costoUnitarioCalculado}</Text></Text>

                    <TextInput label="Observación / Referencia" placeholder="Nro de factura o nombre del proveedor" {...form.getInputProps('observacion')} />

                    <Group justify="flex-end" mt="md">
                        <Button variant="default" onClick={onClose}>Cancelar</Button>
                        <Button type="submit" color="teal" leftSection={<IconTruckDelivery size={18} />} disabled={Number(form.values.cantidad) > espacioDisponible}>
                            Sumar al Inventario
                        </Button>
                    </Group>
                </Stack>
            </form>
        </Modal>
    );
}