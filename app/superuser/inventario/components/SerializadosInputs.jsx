'use client';

import { useEffect } from 'react';
import { SimpleGrid, TextInput, DateInput, Paper, Text, Stack, Group, ActionIcon } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import { DatePickerInput } from '@mantine/dates'; // Asegúrate de tener @mantine/dates instalado

export default function SerializadosInputs({ 
    cantidad = 1, 
    values = [], 
    onChange 
}) {
    // Inicializar el array de objetos si cambia la cantidad
    useEffect(() => {
        if (values.length !== cantidad) {
            // Preservamos los que ya están escritos, agregamos o quitamos según la diferencia
            const newValues = Array(cantidad).fill(null).map((_, index) => {
                return values[index] || {
                    serial: '',
                    fechaCompra: new Date(), // Opcional default hoy
                    fechaVencimientoGarantia: null,
                    estado: 'asignado' // Ya que se va a instalar de una vez
                };
            });
            onChange(newValues);
        }
    }, [cantidad]);

    const updateItem = (index, field, val) => {
        const newValues = [...values];
        newValues[index] = { ...newValues[index], [field]: val };
        onChange(newValues);
    };

    return (
        <Stack gap="xs">
            {values.map((item, index) => (
                <Paper key={index} withBorder p="sm" bg="gray.0">
                    <Group justify="space-between" mb="xs">
                        <Text fw={700} size="sm" c="blue">Unidad #{index + 1}</Text>
                    </Group>
                    
                    <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
                        <TextInput 
                            label="Serial / Código Único" 
                            placeholder="Ej. SN-8844"
                            required
                            value={item.serial}
                            onChange={(e) => updateItem(index, 'serial', e.currentTarget.value)}
                        />
                        
                        <DatePickerInput
                            label="Fecha de Compra"
                            placeholder="Seleccionar"
                            value={item.fechaCompra}
                            onChange={(date) => updateItem(index, 'fechaCompra', date)}
                            clearable
                        />

                        <DatePickerInput
                            label="Vencimiento Garantía"
                            placeholder="Opcional"
                            value={item.fechaVencimientoGarantia}
                            onChange={(date) => updateItem(index, 'fechaVencimientoGarantia', date)}
                            minDate={new Date()}
                            clearable
                        />
                    </SimpleGrid>
                </Paper>
            ))}
        </Stack>
    );
}