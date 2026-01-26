'use client';
import { useState, useEffect } from 'react';
import { 
    Modal, Button, NumberInput, Stack, Text, Group, Alert, LoadingOverlay 
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconGauge, IconInfoCircle } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

export default function ModalActualizarLectura({ opened, onClose, activo, onSuccess, userId }) {
    const [loading, setLoading] = useState(false);

    // Detectamos qué tipo de medición usa el equipo para mostrar/ocultar campos

    const form = useForm({
        initialValues: {
            kilometraje: activo.kilometrajeActual || '', // Vacío para obligar a escribir si quiere actualizar
            horometro: activo.horometroActual || ''
        },
        validate: {
            kilometraje: (value) => {
                if (value === '' || value === null) return null; // Permitir vacío si no se va a tocar
                if (value < activo.kilometrajeActual) return `El valor debe ser mayor al actual (${activo.kilometrajeActual})`;
                return null;
            },
            horometro: (value) => {
                if (value === '' || value === null) return null;
                if (value < activo.horometroActual) return `El valor debe ser mayor al actual (${activo.horometroActual})`;
                return null;
            }
        }
    });

    // Resetear form cuando se abre/cierra
    useEffect(() => {
        if (opened) {
            form.setValues({
                kilometraje: activo.kilometrajeActual,
                horometro: activo.horometroActual
            });
        }
    }, [opened, activo]);

    const handleSubmit = async (values) => {
        // Validar que al menos uno se haya movido
        const kmCambio =  values.kilometraje > activo.kilometrajeActual;
        const hrCambio =  values.horometro > activo.horometroActual;

        if (!kmCambio && !hrCambio) {
            notifications.show({ message: 'No has ingresado una nueva lectura superior a la actual.', color: 'orange' });
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/gestionMantenimiento/inspecciones', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    activoId: activo.id,
                    usuarioId: userId,
                    origen: 'Rutina', // Importante: Marca esto como rutina
                    observacionGeneral: 'Actualización rutinaria de lectura',
                    // Enviamos solo si cambió, sino null para que la API lo ignore
                    kilometraje: kmCambio ? values.kilometraje : null,
                    horometro: hrCambio ? values.horometro : null,
                    hallazgos: [] // Sin hallazgos
                })
            });

            const data = await res.json();
            if (data.success) {
                notifications.show({ title: 'Lectura Actualizada', message: 'Los contadores han sido actualizados.', color: 'blue' });
                onSuccess();
                onClose();
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
        <Modal opened={opened} onClose={onClose} title="Actualizar Lecturas de Uso" centered>
            <LoadingOverlay visible={loading} />
            <form onSubmit={form.onSubmit(handleSubmit)}>
                <Stack>
                    <Alert icon={<IconInfoCircle size={16}/>} color="blue" variant="light">
                        Actualiza solo el valor necesario. No es obligatorio llenar ambos.
                    </Alert>

                        <NumberInput
                            label="Kilometraje Actual (KM)"
                            description={`Último registro: ${Number(activo.kilometrajeActual).toLocaleString()} km`}
                            placeholder="Nuevo kilometraje"
                            thousandSeparator="."
                            decimalSeparator=","
                            hideControls
                            leftSection={<IconGauge size={16}/>}
                            {...form.getInputProps('kilometraje')}
                        />
                    


                    <NumberInput
                        label="Horómetro Actual (Horas)"
                        description={`Último registro: ${Number(activo.horometroActual).toLocaleString()} hrs`}
                            placeholder="Nuevas horas"
                            thousandSeparator="."
                            decimalSeparator=","
                            hideControls
                            leftSection={<IconGauge size={16}/>}
                            {...form.getInputProps('horometro')}
                        />
                    

                    <Group justify="flex-end" mt="md">
                        <Button variant="default" onClick={onClose}>Cancelar</Button>
                        <Button type="submit">Actualizar</Button>
                    </Group>
                </Stack>
            </form>
        </Modal>
    );
}